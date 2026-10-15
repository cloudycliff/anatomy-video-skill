// Finds the Kokoro speed that lands the narration on a target length, then leaves that take in place.
// Speed → length falls with speed but is non-linear and can jump, so the search brackets the target
// and refines with a log-log secant step, falling back to bisection.
// Run from the project root.
//   node <skill>/scripts/fit-voice.mjs [--target 60] [--tol 0.03] [--speed 1.2] [--max 6] [-- …zh-voice.mjs args]
//
// --target  seconds; defaults to STORYBOARD.md frontmatter `duration:`
// --tol     accepted relative error (0.03 = ±3 %)
// --speed   first guess (default: the speed recorded in SCRIPT.md "Voice settings", else 1.2)
// args after `--` go to zh-voice.mjs unchanged (e.g. -- --voice zf_xiaobei --say "弹波=谈波")
// Afterwards run: audio.mjs sync-durations (durations change with every take).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const split = argv.indexOf("--");
const own = split >= 0 ? argv.slice(0, split) : argv;
const pass = split >= 0 ? argv.slice(split + 1) : [];
const arg = (name, fallback) => {
  const i = own.indexOf(`--${name}`);
  return i >= 0 ? own[i + 1] : fallback;
};
const passArg = (name) => {
  const i = pass.indexOf(`--${name}`);
  return i >= 0 ? pass[i + 1] : null;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(passArg("out") || "audio_meta.json");
const storyboard = existsSync("STORYBOARD.md") ? readFileSync("STORYBOARD.md", "utf8") : "";
const frontTarget = storyboard.match(/^---[\s\S]*?^duration:\s*([\d.]+)\s*s?\s*$/m);
const TARGET = Number(arg("target", frontTarget ? frontTarget[1] : NaN));
if (!(TARGET > 0)) throw new Error("no target length: pass --target <seconds> or set `duration:` in STORYBOARD.md frontmatter");
const TOL = Number(arg("tol", "0.03"));
const MAX = Number(arg("max", "6"));
const scriptMd = existsSync("SCRIPT.md") ? readFileSync("SCRIPT.md", "utf8") : "";
const recorded = scriptMd.match(/Voice settings:\*\*\s*speed\s*([\d.]+)/);
let speed = Number(arg("speed", recorded ? recorded[1] : "1.2"));
const clampSpeed = (s) => Math.min(2.0, Math.max(0.7, s));

function take(s) {
  const rest = pass.filter((v, i) => !(v === "--speed" || pass[i - 1] === "--speed") && v !== "--reuse");
  console.log(`\n── take at speed ${s.toFixed(3)} ──`);
  execFileSync(process.execPath, [join(HERE, "zh-voice.mjs"), ...rest, "--speed", s.toFixed(3)], { stdio: "inherit" });
  const meta = JSON.parse(readFileSync(OUT, "utf8"));
  return meta.voices.reduce((a, v) => a + v.duration_s, 0);
}

// Kokoro's length can jump between nearby speeds (1.30 → 68.7 s, 1.35 → 58.8 s on one script), so the
// search keeps a bracket — slowest take still too short (hi), fastest take still too long (lo) — and
// only trusts a secant guess that lands strictly inside it; otherwise it bisects.
const takes = [];
let lo = null, hi = null;
for (let n = 0; n < MAX; n++) {
  const length = take(speed);
  takes.push({ speed, length });
  const err = (length - TARGET) / TARGET;
  console.log(`speed ${speed.toFixed(3)} -> ${length.toFixed(2)} s (target ${TARGET} s, ${(err * 100).toFixed(1)} %)`);
  if (Math.abs(err) <= TOL) break;
  if (length > TARGET && (!lo || speed > lo.speed)) lo = { speed, length };
  if (length < TARGET && (!hi || speed < hi.speed)) hi = { speed, length };
  let next;
  if (lo && hi) {
    if (hi.speed - lo.speed < 0.01) { console.log("bracket narrower than 0.01 speed; length jumps across the target here"); break; }
    const b = Math.log(hi.length / lo.length) / Math.log(hi.speed / lo.speed);
    next = lo.speed * Math.exp(Math.log(TARGET / lo.length) / (b < -0.05 ? b : -1));
    const inside = next > lo.speed + 0.25 * (hi.speed - lo.speed) && next < hi.speed - 0.25 * (hi.speed - lo.speed);
    if (!inside) next = (lo.speed + hi.speed) / 2;
  } else {
    next = clampSpeed(speed * Math.pow(length / TARGET, 0.6));
    if (Math.abs(next - speed) < 0.01) { console.log("speed limit reached"); break; }
  }
  speed = +next.toFixed(3);
}

const best = [...takes].sort((a, b) => Math.abs(a.length - TARGET) - Math.abs(b.length - TARGET))[0];
const last = takes[takes.length - 1];
if (best !== last) {
  console.log(`\nbest take was speed ${best.speed.toFixed(3)}; regenerating it`);
  take(best.speed);
}
console.log(`\nfit-voice: speed ${best.speed.toFixed(3)} -> ${best.length.toFixed(2)} s for target ${TARGET} s after ${takes.length} take(s)`);
console.log(`record it in SCRIPT.md (**Voice settings:** speed ${best.speed.toFixed(2)}), then run audio.mjs sync-durations`);
