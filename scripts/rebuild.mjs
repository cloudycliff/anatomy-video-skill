// Regenerates everything downstream of the rig and the frame specs, in pipeline order.
// Run from the project root after any rig, frame-spec, caption or timing change.
//   node <skill>/scripts/rebuild.mjs [--rig assets/rig:rig] [--frames tools/frames/build.mjs] [--fonts] [--no-cjk] [--no-health]
//
// rig-health.mjs runs right after the frame build and stops the chain when a frame breaks the budget.
//
// transitions.mjs inject rewrites the frame files, so it must rerun after every frame build;
// the captions tag on index.html is lost on every assemble, so it is re-applied here.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const has = (flag) => process.argv.includes(`--${flag}`);
const HERE = dirname(fileURLToPath(import.meta.url));
const FE = resolve(HERE, "../../faceless-explainer/scripts");
if (!existsSync(join(FE, "assemble-index.mjs"))) throw new Error(`faceless-explainer scripts not found at ${FE}`);
const run = (cmd) => { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: "inherit" }); };
const q = (p) => JSON.stringify(p);

const [rigDir, rigName] = arg("rig", "assets/rig:rig").split(":");
const cjk = !has("no-cjk");

run(`node ${q(join(HERE, "bundle-rig.mjs"))} --dir ${q(rigDir)} --name ${rigName}`);
run(`node ${q(arg("frames", "tools/frames/build.mjs"))}`);
if (!has("no-health")) run(`node ${q(join(HERE, "rig-health.mjs"))}`);
if (has("fonts")) run(`node ${q(join(HERE, "cjk-fonts.mjs"))}`);
if (existsSync("audio_meta.json")) {
  run(`node ${q(join(FE, "captions.mjs"))} build --storyboard ./STORYBOARD.md --audio-meta ./audio_meta.json --hyperframes . --out ./caption_groups.json`);
  if (cjk) run(`node ${q(join(HERE, "patch-captions.mjs"))}`);
}
run(`node ${q(join(FE, "assemble-index.mjs"))} --storyboard ./STORYBOARD.md --hyperframes .`);
run(`node ${q(join(FE, "transitions.mjs"))} inject --storyboard ./STORYBOARD.md --hyperframes .`);
run(`node ${q(join(FE, "transitions.mjs"))} verify --storyboard ./STORYBOARD.md --index ./index.html`);

const html = readFileSync("index.html", "utf8");
if (html.includes('id="el-captions"') && !/id="el-captions"[^>]*data-track-kind/.test(html)) {
  writeFileSync("index.html", html.replace('id="el-captions"', 'id="el-captions" data-track-kind="captions"'));
  console.log("index.html: tagged captions track");
}
console.log("\nrebuild done; next: npx hyperframes lint, then snapshot");
