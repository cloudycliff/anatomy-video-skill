// Renders named speaker states into one HTML sheet for headless screenshots.
//   node tools/preview-speaker.mjs [out.html]
import { readFileSync, writeFileSync } from "node:fs";

await import("../assets/speaker/speaker.js");
const Speaker = globalThis.Speaker;
const css = readFileSync(new URL("../assets/speaker/speaker.css", import.meta.url), "utf8");
const out = process.argv[2] || "tools/preview.html";

const rig = Speaker.create();
const states = [
  ["assembled", {}],
  ["exploded", { explode: 1 }],
  ["half", { explode: 0.45 }],
  ["pushed +4", { x: 4, lit: ["coil"], current: 1 }],
  ["pulled −4", { x: -4, lit: ["coil"], current: -1 }],
  ["field", { field: 1, lit: ["coil"] }],
  ["air", { x: 2, air: { on: 1, phase: 1.2 } }],
];
const cells = states.map(([name, state]) => {
  const t = performance.now();
  const body = rig.render(state);
  const ms = (performance.now() - t).toFixed(1);
  const b = rig.bounds(state);
  const top = state.air ? b.y - 260 : b.y;
  const vb = `${(b.x - 20).toFixed(0)} ${(top - 20).toFixed(0)} ${(b.w + 40).toFixed(0)} ${(b.y + b.h - top + 40).toFixed(0)}`;
  console.log(`${name}: ${(body.length / 1024).toFixed(0)} KB, ${(body.match(/<path/g) || []).length} paths, ${ms} ms`);
  return `<figure><div class="spk"><svg viewBox="${vb}">${body}</svg></div><figcaption>${name}</figcaption></figure>`;
});
writeFileSync(out, `<!doctype html><meta charset="utf-8"><style>${css}
body{margin:0;background:#faf9f5;font:14px/1.4 ui-monospace,monospace;color:#57534e}
main{display:grid;grid-template-columns:repeat(2,900px);gap:24px;padding:24px}
figure{margin:0;background:#faf9f5;border:1px solid #1414131f;border-radius:12px;padding:12px}
.spk{height:820px}</style><main>${cells.join("")}</main>`);
console.log("wrote", out);
