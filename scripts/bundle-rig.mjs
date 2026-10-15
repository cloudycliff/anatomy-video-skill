// Folds <name>.css into <name>.js so every frame loads one script: <dir>/<name>.bundle.js
// Run from the project root; rerun after every rig or rig-CSS edit.
//   node <skill>/scripts/bundle-rig.mjs [--dir assets/rig] [--name rig]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const dir = resolve(arg("dir", "assets/rig"));
const name = arg("name", "rig");
const css = readFileSync(join(dir, `${name}.css`), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
const js = readFileSync(join(dir, `${name}.js`), "utf8");
const id = `${name}-css`;
const inject = `(function(){if(typeof document==="undefined"||document.getElementById(${JSON.stringify(id)}))return;var s=document.createElement("style");s.id=${JSON.stringify(id)};s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();\n`;
writeFileSync(join(dir, `${name}.bundle.js`), inject + js);
console.log(`wrote ${join(dir, `${name}.bundle.js`)}`, ((inject.length + js.length) / 1024).toFixed(1) + " KB");
