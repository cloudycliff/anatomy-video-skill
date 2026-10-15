// Mandarin narration without a transcriber: replaces faceless-explainer's audio.mjs voice pass.
// Each sentence (ended by 。) is synthesised whole with Kokoro so its intonation
// stays natural; the phrase boundaries inside it (，；：、) are then placed on the
// real pauses found in the audio, so caption timings come from the voice itself.
// Run from the project root.
//
//   node <skill>/scripts/zh-voice.mjs [--script SCRIPT.md] [--out audio_meta.json] [--voice zf_xiaobei]
//        [--speed 1.35] [--say "弹波=谈波,行=航"] [--chars 14] [--only 2,5] [--reuse]
//
// --say     spoken substitutions for polyphones; captions keep the written form
// --only    resynthesise these frames, keep the rest from the existing --out file
// --reuse   reuse cached per-sentence wavs in .hyperframes/voice-parts/ (retiming only)
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const ROOT = resolve(".");
const SCRIPT = resolve(arg("script", "SCRIPT.md"));
const OUT = resolve(arg("out", "audio_meta.json"));
const VOICE = arg("voice", "zf_xiaobei");
const SPEED = arg("speed", "1.35");
const ONLY = arg("only", null);
const REUSE = process.argv.includes("--reuse");
const CAPTION_CHARS = Number(arg("chars", "14"));
const SAY = (arg("say", "") || "").split(",").filter(Boolean).map((pair) => pair.split("="));
const LEAD = 0.2;
const BETWEEN = 0.26;
const TAIL = 0.42;
const PHRASE_MARKS = /[，；：、]/;

function parseScript(text) {
  const lines = [];
  const re = /^## Line (\d+)[^\n]*\(Frame (\d+)\)\s*$/gm;
  const heads = [...text.matchAll(re)];
  heads.forEach((head, index) => {
    const body = text.slice(head.index + head[0].length, index + 1 < heads.length ? heads[index + 1].index : text.length);
    const spoken = body.split(/\r?\n/).filter((line) => /^ {4}\S/.test(line)).map((line) => line.trim()).join("");
    lines.push({ line: Number(head[1]), frame: Number(head[2]), spoken });
  });
  return lines;
}

function readWav(path) {
  const buf = readFileSync(path);
  let at = 12, rate = 24000, format = 1, bits = 16, channels = 1, data = null;
  while (at < buf.length) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === "fmt ") {
      format = buf.readUInt16LE(at + 8);
      channels = buf.readUInt16LE(at + 10);
      rate = buf.readUInt32LE(at + 12);
      bits = buf.readUInt16LE(at + 22);
    } else if (id === "data") data = buf.subarray(at + 8, at + 8 + size);
    at += 8 + size + (size % 2);
  }
  const step = (bits / 8) * channels;
  const out = new Float32Array(Math.floor(data.length / step));
  for (let i = 0; i < out.length; i++) {
    const o = i * step;
    out[i] = format === 3 ? data.readFloatLE(o) : bits === 16 ? data.readInt16LE(o) / 32768 : data.readInt32LE(o) / 2147483648;
  }
  return { rate, samples: out };
}

function writeWav(path, samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([head, data]));
}

// Envelope in 10 ms hops; silence is below 4% of the sentence's peak envelope.
function silences(samples, rate) {
  const hop = Math.round(rate * 0.01);
  const env = [];
  for (let i = 0; i + hop <= samples.length; i += hop) {
    let sum = 0;
    for (let j = i; j < i + hop; j++) sum += samples[j] * samples[j];
    env.push(Math.sqrt(sum / hop));
  }
  const peak = Math.max(...env);
  const quiet = env.map((value) => value < peak * 0.04);
  const first = quiet.indexOf(false);
  const last = quiet.lastIndexOf(false);
  const gaps = [];
  for (let i = first; i <= last; i++) {
    if (!quiet[i]) continue;
    let j = i;
    while (j <= last && quiet[j]) j++;
    if (j - i >= 6) gaps.push({ from: i * 0.01, to: j * 0.01 });
    i = j;
  }
  return { start: first * 0.01, end: (last + 1) * 0.01, gaps };
}

// Boundaries take pause gaps in order. A gap costs its distance from the
// char-proportional estimate, minus a bonus for being a long (comma-length) pause;
// leaving a boundary on the estimate costs a flat penalty.
function alignBounds(weights, total, length, gaps) {
  const K = weights.length - 1;
  if (K <= 0) return [];
  const expected = [];
  let acc = 0;
  for (let i = 0; i < K; i++) { acc += weights[i]; expected.push((acc / total) * length); }
  const cost = (i, g) => {
    const off = Math.abs((g.from + g.to) / 2 - expected[i]);
    return off > 0.65 ? Infinity : off - Math.min(g.to - g.from, 0.25);
  };
  const MISS = 0.35;
  const best = Array.from({ length: K + 1 }, () => new Array(gaps.length + 1).fill(Infinity));
  const from = Array.from({ length: K + 1 }, () => new Array(gaps.length + 1).fill(null));
  best[0][0] = 0;
  for (let i = 0; i < K; i++) {
    for (let j = 0; j <= gaps.length; j++) {
      if (best[i][j] === Infinity) continue;
      if (best[i][j] + MISS < best[i + 1][j]) { best[i + 1][j] = best[i][j] + MISS; from[i + 1][j] = [j, null]; }
      for (let g = j; g < gaps.length; g++) {
        const c = best[i][j] + cost(i, gaps[g]);
        if (c < best[i + 1][g + 1]) { best[i + 1][g + 1] = c; from[i + 1][g + 1] = [j, g]; }
      }
    }
  }
  let j = 0;
  for (let q = 1; q <= gaps.length; q++) if (best[K][q] < best[K][j]) j = q;
  const picks = new Array(K);
  for (let i = K; i > 0; i--) { const [pj, g] = from[i][j]; picks[i - 1] = g; j = pj; }
  return picks.map((g, i) => {
    if (g != null) return [gaps[g].from, gaps[g].to];
    const lo = i > 0 && picks[i - 1] != null ? gaps[picks[i - 1]].to : 0;
    const e = Math.max(lo + 0.3, expected[i]);
    return [e - 0.04, e + 0.04];
  });
}

function phrasesOf(sentence) {
  const out = [];
  let text = "";
  for (const ch of sentence) {
    if (PHRASE_MARKS.test(ch) || ch === "。") {
      if (text) out.push({ text, mark: ch });
      text = "";
    } else text += ch;
  }
  if (text) out.push({ text, mark: "" });
  return out;
}

function synth(text, wav) {
  const txt = join(tmpdir(), `zh-voice-${process.pid}.txt`);
  writeFileSync(txt, SAY.reduce((s, [a, b]) => s.replaceAll(a, b), text), "utf8");
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["hyperframes", "tts", txt, "--voice", VOICE, "--speed", SPEED, "-o", wav, "--json"], { stdio: ["ignore", "pipe", "inherit"], shell: process.platform === "win32" });
}

const lines = parseScript(readFileSync(SCRIPT, "utf8"));
mkdirSync(join(ROOT, "assets", "voice"), { recursive: true });
mkdirSync(join(ROOT, ".hyperframes", "voice-parts"), { recursive: true });
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const voices = [];

for (const { frame, spoken } of lines) {
  if (ONLY && !ONLY.split(",").map(Number).includes(frame)) {
    const kept = previous?.voices?.find((v) => v.frame === frame);
    if (kept) voices.push(kept);
    continue;
  }
  const sentences = spoken.match(/[^。]+。?/g);
  let rate = 24000;
  const pieces = [];
  const words = [];
  let clock = LEAD;
  sentences.forEach((sentence, sIndex) => {
    const wav = join(ROOT, ".hyperframes", "voice-parts", `f${frame}-s${sIndex}.wav`);
    if (!(REUSE && existsSync(wav))) synth(sentence, wav);
    const audio = readWav(wav);
    rate = audio.rate;
    const { start, end, gaps } = silences(audio.samples, rate);
    const speech = audio.samples.subarray(Math.floor(start * rate), Math.ceil(end * rate));
    const length = end - start;
    const phrases = phrasesOf(sentence);
    const weights = phrases.map((p) => [...p.text].length);
    const total = weights.reduce((a, b) => a + b, 0);
    const inner = gaps.map((g) => ({ from: g.from - start, to: g.to - start }));
    const bounds = alignBounds(weights, total, length, inner);
    phrases.forEach((p, i) => {
      const from = i === 0 ? 0 : bounds[i - 1][1];
      const to = i === phrases.length - 1 ? length : bounds[i][0];
      words.push({ id: `f${frame}w${words.length}`, text: p.text, start: +(clock + from).toFixed(3), end: +(clock + to).toFixed(3), sentenceEnd: i === phrases.length - 1 || /[；：]/.test(p.mark) });
    });
    pieces.push(speech);
    clock += length + (sIndex < sentences.length - 1 ? BETWEEN : 0);
  });
  const totalLength = clock + TAIL;
  const out = new Float32Array(Math.ceil(totalLength * rate));
  let at = Math.round(LEAD * rate);
  pieces.forEach((piece, index) => {
    out.set(piece, at);
    at += piece.length + (index < pieces.length - 1 ? Math.round(BETWEEN * rate) : 0);
  });
  // captions.mjs splits a caption group on a > 0.18 s silence between words, so a
  // group break is written as an early word end
  let groupChars = 0;
  words.forEach((w, i) => {
    groupChars += [...w.text].length;
    const next = words[i + 1];
    const breakHere = !next || w.sentenceEnd || groupChars + [...next.text].length > CAPTION_CHARS;
    if (breakHere && next) w.end = +Math.max(w.start + 0.1, Math.min(w.end, next.start - 0.2)).toFixed(3);
    if (breakHere) groupChars = 0;
    delete w.sentenceEnd;
  });
  const path = `assets/voice/frame-${String(frame).padStart(2, "0")}.wav`;
  writeWav(join(ROOT, path), out, rate);
  voices.push({ frame, path, duration_s: +(out.length / rate).toFixed(3), words });
  console.log(`frame ${frame}: ${(out.length / rate).toFixed(2)}s · ${words.map((w) => `${w.text}@${w.start}`).join(" | ")}`);
}

voices.sort((a, b) => a.frame - b.frame);
writeFileSync(OUT, JSON.stringify({ bgm: null, bgm_pending: false, voices, sfx: [] }, null, 2));
console.log(`total voice ${voices.reduce((a, v) => a + v.duration_s, 0).toFixed(2)}s → ${OUT}`);
