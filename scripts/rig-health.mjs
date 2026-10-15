// Rig health over the real frame timelines: runs each compositions/frames/*.html script in a sandbox
// (GSAP and DOM stubbed), samples its driver across the whole frame, renders every distinct state
// with the real rig, and fails when a state breaks the budget.
// Run from the project root after the frame build (rebuild.mjs runs it with --health).
//   node <skill>/scripts/rig-health.mjs [--step 0.2] [--max-paths 7500] [--max-ms 60] [--strict-ms] [--frames 3,5]
//
// Fails on: path count over budget, NaN/Infinity in the markup, non-deterministic render
// (same state twice → different markup), a non-finite or non-positive camera.
// Render time only warns (it depends on the machine) unless --strict-ms.
// Calibration: the 7-frame speaker video passed `hyperframes check` at 6.9k paths / ~45 ms per
// render here, and timed out at 9.8k paths.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import vm from "node:vm";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const STEP = Number(arg("step", "0.2"));
const MAX_PATHS = Number(arg("max-paths", "7500"));
const MAX_MS = Number(arg("max-ms", "60"));
const STRICT_MS = process.argv.includes("--strict-ms");
const ONLY = arg("frames", null)?.split(",").map(Number);

/* anything-goes stand-in for DOM nodes and GSAP objects: every property is callable and chainable */
function deep(store = {}) {
  const fn = function () {};
  return new Proxy(fn, {
    get(_, key) {
      if (key === Symbol.toPrimitive) return () => 0;
      if (key === "then") return undefined;
      if (key in store) return store[key];
      return (store[key] = deep());
    },
    set(_, key, value) { store[key] = value; return true; },
    apply() { return deep(); },
  });
}
function ease(name) {
  const m = /^power(\d)\.(in|out|inOut)$/.exec(name || "");
  if (!m) return (v) => v;
  const k = Number(m[1]) + 1;
  if (m[2] === "in") return (v) => Math.pow(v, k);
  if (m[2] === "out") return (v) => 1 - Math.pow(1 - v, k);
  return (v) => (v < 0.5 ? Math.pow(2 * v, k) / 2 : 1 - Math.pow(2 - 2 * v, k) / 2);
}

function sandbox() {
  const elements = {};
  const document = deep({
    getElementById: (id) => (id.endsWith("-css") ? null : (elements[id] ||= deep({ id }))),
    querySelectorAll: () => [],
    querySelector: () => deep(),
    createElement: () => deep(),
    createElementNS: () => deep(),
    head: deep({ appendChild: () => {} }),
  });
  const timeline = () => { const tl = deep(); return new Proxy(tl, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : () => tlProxy) }); };
  const tlProxy = timeline();
  const gsap = deep({ timeline: () => tlProxy, parseEase: ease, registerPlugin: () => {}, set: () => {}, to: () => tlProxy, fromTo: () => tlProxy });
  const window = { document, gsap, __timelines: {}, performance, console, Math, JSON };
  window.window = window;
  window.globalThis = window;
  return vm.createContext(window);
}

const dir = resolve("compositions/frames");
const files = readdirSync(dir).filter((f) => f.endsWith(".html")).sort();
let failed = false;
const rows = [];

for (const [i, file] of files.entries()) {
  if (ONLY && !ONLY.includes(i + 1)) continue;
  const html = readFileSync(join(dir, file), "utf8");
  const bundle = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]).find((s) => !/^https?:/.test(s));
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  const duration = Number(html.match(/data-duration="([\d.]+)"/)?.[1] ?? NaN);
  if (!bundle || !inline) { rows.push({ file, note: "no rig script, skipped" }); continue; }

  const ctx = sandbox();
  const before = new Set(Object.keys(ctx));
  vm.runInContext(readFileSync(resolve(bundle), "utf8"), ctx, { filename: bundle });
  const rigs = Object.keys(ctx).filter((k) => !before.has(k) && ctx[k] && typeof ctx[k].drive === "function" && typeof ctx[k].mount === "function");
  if (!rigs.length) throw new Error(`${bundle} defines no global with drive() and mount()`);

  let driver = null, last = null, rigObj = null;
  for (const name of rigs) {
    const R = ctx[name];
    const create = R.create;
    R.create = (...a) => (rigObj = create(...a));
    R.mount = (svg, rig) => { rigObj = rig; return (state, cam) => { last = { state, cam }; }; };
    R.drive = (tl, dur, fn) => { driver = fn; fn(0); };
  }
  vm.runInContext(inline, ctx, { filename: file });
  if (!driver) { rows.push({ file, note: "no drive() call, skipped" }); continue; }

  const seen = new Map();
  let worst = { paths: 0, ms: 0 }, problems = [];
  for (let t = 0; t <= duration + 1e-9; t += STEP) {
    last = null;
    driver(+t.toFixed(4));
    if (!last) continue;
    const { state, cam } = last;
    if (!cam || !(cam.w > 0) || ![cam.cx, cam.cy, cam.w].every(Number.isFinite)) problems.push(`t=${t.toFixed(2)} bad camera ${JSON.stringify(cam)}`);
    const key = JSON.stringify(state);
    if (seen.has(key)) continue;
    if (!seen.size) rigObj.render(state);
    const t0 = performance.now();
    const svg = rigObj.render(state);
    const t1 = performance.now();
    const again = rigObj.render(state);
    const ms = Math.min(t1 - t0, performance.now() - t1);
    const paths = (svg.match(/<path/g) || []).length;
    seen.set(key, { t, paths, ms });
    if (/NaN|Infinity/.test(svg)) problems.push(`t=${t.toFixed(2)} NaN/Infinity in markup`);
    if (again !== svg) problems.push(`t=${t.toFixed(2)} render not deterministic`);
    if (paths > worst.paths) worst = { ...worst, paths, pathsAt: t };
    if (ms > worst.ms) worst = { ...worst, ms, msAt: t };
  }
  if (worst.paths > MAX_PATHS) problems.push(`${worst.paths} paths at t=${worst.pathsAt.toFixed(2)} (budget ${MAX_PATHS})`);
  const warnings = [];
  if (worst.ms > MAX_MS) (STRICT_MS ? problems : warnings).push(`${worst.ms.toFixed(1)} ms at t=${worst.msAt.toFixed(2)} (budget ${MAX_MS} ms)`);
  if (problems.length) failed = true;
  rows.push({ file, states: seen.size, paths: worst.paths, ms: worst.ms, problems: [...new Set(problems)].slice(0, 6), warnings });
}

for (const r of rows) {
  if (r.note) { console.log(`     ${r.file.padEnd(24)} ${r.note}`); continue; }
  const tag = r.problems.length ? "FAIL" : r.warnings.length ? "warn" : "ok  ";
  console.log(`${tag} ${r.file.padEnd(24)} ${String(r.states).padStart(4)} states · max ${String(r.paths).padStart(5)} paths · max ${r.ms.toFixed(1).padStart(5)} ms`);
  r.problems.forEach((p) => console.log(`       ${p}`));
  r.warnings.forEach((p) => console.log(`       (slow) ${p}`));
}
console.log(failed ? "\nrig-health: FAILED (see rig-contract.md § Performance budget)" : "\nrig-health: ok");
process.exit(failed ? 1 : 0);
