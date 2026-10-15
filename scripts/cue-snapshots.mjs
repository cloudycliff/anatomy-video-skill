// Snapshots the assembled video at the narration's phrase cues, so every storyboard beat gets a still.
// Reads frame starts from index.html and frame-relative phrase starts from audio_meta.json.
// Run from the project root after rebuild.mjs.
//   node <skill>/scripts/cue-snapshots.mjs [--frames 3,5] [--offset 0.7] [--mode cues|mid|both] [--out .hyperframes/snap-cues] [--dry]
//
// --offset  seconds after each phrase start (lets its reveal land; default 0.7)
// --mode    cues = one still per phrase, mid = one per frame midpoint, both (default)
// Writes <out>/cues.json mapping each still to frame id + phrase; prints the contact sheet paths.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const OFFSET = Number(arg("offset", "0.7"));
const MODE = arg("mode", "both");
const OUT = arg("out", ".hyperframes/snap-cues");
const ONLY = arg("frames", null)?.split(",").map(Number);

const index = readFileSync("index.html", "utf8");
const frames = [...index.matchAll(/<div\b[^>]*>/g)]
  .map((m) => m[0])
  .filter((tag) => /data-composition-src="compositions\/frames\//.test(tag))
  .map((tag, i) => ({
    n: i + 1,
    id: tag.match(/data-composition-id="([^"]+)"/)[1],
    start: Number(tag.match(/data-start="([\d.]+)"/)[1]),
    duration: Number(tag.match(/data-duration="([\d.]+)"/)?.[1] ?? NaN),
  }));
if (!frames.length) throw new Error("no frame scenes found in index.html; run rebuild.mjs first");
frames.forEach((f, i) => { f.end = frames[i + 1] ? frames[i + 1].start : f.start + f.duration; });

const meta = existsSync("audio_meta.json") ? JSON.parse(readFileSync("audio_meta.json", "utf8")) : { voices: [] };
const cues = [];
for (const f of frames) {
  if (ONLY && !ONLY.includes(f.n)) continue;
  const voice = meta.voices.find((v) => v.frame === f.n);
  if (MODE !== "mid" && voice) {
    for (const w of voice.words) {
      const at = Math.min(f.start + w.start + OFFSET, f.end - 0.05);
      cues.push({ at: +at.toFixed(2), frame: f.id, phrase: w.text });
    }
  }
  if (MODE !== "cues" || !voice) cues.push({ at: +((f.start + f.end) / 2).toFixed(2), frame: f.id, phrase: "(midpoint)" });
}
cues.sort((a, b) => a.at - b.at);
const unique = cues.filter((c, i) => i === 0 || c.at - cues[i - 1].at >= 0.15);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "cues.json"), JSON.stringify(unique, null, 2));
console.log(unique.map((c, i) => `${String(i + 1).padStart(3)}  ${c.at.toFixed(2).padStart(6)}s  ${c.frame.padEnd(16)} ${c.phrase}`).join("\n"));
if (process.argv.includes("--dry")) process.exit(0);

const at = unique.map((c) => c.at).join(",");
execSync(`npx hyperframes snapshot --at ${at} --no-end --timeout 60000 -o ${JSON.stringify(OUT)}`, { stdio: "inherit" });
console.log(`\ncue map: ${join(OUT, "cues.json")} (contact-sheet cells are in the order listed above)`);
