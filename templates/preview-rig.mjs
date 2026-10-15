// Renders named rig states into one HTML sheet, with path counts and render times.
// Copy to <project>/tools/preview-rig.mjs and list the states the storyboard needs.
//   node tools/preview-rig.mjs [tools/preview.html]
// Screenshot with the anatomy skill's capture script:
//   node <anatomy>/scripts/capture.mjs tools/preview.html --out tools/shots/sheet.png --width 1872 --height 2700 --scale 1
//   …add --select "figure:nth-child(N)" --zoom x,y,w,h --zoom-scale 3 for a close-up of one cell
import { readFileSync, writeFileSync } from "node:fs";

await import("../assets/rig/rig.js");
const Rig = globalThis.Rig;
const css = readFileSync(new URL("../assets/rig/rig.css", import.meta.url), "utf8");
const out = process.argv[2] || "tools/preview.html";

const rig = Rig.create();
const states = [
  ["assembled", {}],
  ["exploded", { explode: 1 }],
  ["lit body", { lit: ["body"] }],
];
const cells = states.map(([name, state]) => {
  const t = performance.now();
  const body = rig.render(state);
  const ms = (performance.now() - t).toFixed(1);
  const b = rig.bounds(state);
  const vb = `${(b.x - 20).toFixed(0)} ${(b.y - 20).toFixed(0)} ${(b.w + 40).toFixed(0)} ${(b.h + 40).toFixed(0)}`;
  const paths = (body.match(/<path/g) || []).length;
  console.log(`${name}: ${(body.length / 1024).toFixed(0)} KB, ${paths} paths, ${ms} ms, bounds ${JSON.stringify(b, (k, v) => (typeof v === "number" ? Math.round(v) : v))}`);
  return `<figure><div class="rig"><svg viewBox="${vb}">${body}</svg></div><figcaption>${name}</figcaption></figure>`;
});
writeFileSync(out, `<!doctype html><meta charset="utf-8"><style>${css}
body{margin:0;background:#faf9f5;font:14px/1.4 ui-monospace,monospace;color:#57534e}
main{display:grid;grid-template-columns:repeat(2,900px);gap:24px;padding:24px}
figure{margin:0;background:#faf9f5;border:1px solid #1414131f;border-radius:12px;padding:12px}
.rig{height:820px}</style><main>${cells.join("")}</main>`);
console.log("wrote", out);
