// Writes compositions/frames/*.html from the frame specs below — one spec per storyboard frame.
// Copy to <project>/tools/frames/build.mjs next to common.mjs (from frame-shell.mjs).
//   node tools/frames/build.mjs
// Full seven-frame example: examples/speaker/build.mjs.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { C, MONO, RIG, frame, storyboardDurations } from "./common.mjs";

const root = new URL("../../", import.meta.url);
const durations = storyboardDurations(readFileSync(new URL("STORYBOARD.md", root), "utf8"));
const R = RIG.global;
const frames = [];

/* ── 1 · hook ─────────────────────────────────────────────────────────── */
frames.push({
  id: "01-hook", prefix: "f01",
  kicker: "Fig. 0 · 总览", title: "它怎么工作",
  card: `<div class="f01-label">读数</div><div><span id="f01-v" class="f01-num" style="font-size:92px;color:${C.ink}">0.0</span></div>`,
  // `script` runs inside the frame IIFE: tl, DUR, CAM, draw, $, $$, enter, fade, out/inOut/push/lin.
  // Every rig and readout value is computed from t inside the driver — never from tween callbacks.
  script: `
  ${R}.drive(tl, DUR, function (t) {
    var e = inOut(t, 0.4, 2.4);
    draw({ explode: e, lit: t >= 2.4 ? ["body"] : [] }, CAM.full);
    $("v").textContent = (e * 10).toFixed(1);
  });
  tl.fromTo($$("ch"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.07 }, 0.3);
  enter($("card"), 1.2, { y: 40 }, { duration: 0.7 });
`,
});

mkdirSync(new URL("compositions/frames/", root), { recursive: true });
frames.forEach((spec, i) => {
  if (durations[i] == null) throw new Error(`STORYBOARD.md has no duration for frame ${i + 1} (${spec.id})`);
  writeFileSync(new URL(`compositions/frames/${spec.id}.html`, root), frame({ ...spec, duration: durations[i] }));
  console.log(`${spec.id}  ${durations[i]}s`);
});
