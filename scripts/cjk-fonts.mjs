// Subsets the CJK faces to the characters this video actually shows.
// Run from the project root; rerun after any copy change (script, titles, cards).
//   node <skill>/scripts/cjk-fonts.mjs
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const sources = [join(ROOT, "SCRIPT.md")].filter(existsSync);
for (const dir of ["compositions/frames", "compositions", "tools/frames"]) {
  const abs = join(ROOT, dir);
  if (existsSync(abs)) for (const f of readdirSync(abs)) if (/\.(html|mjs)$/.test(f)) sources.push(join(abs, f));
}
const set = new Set();
for (const file of sources) for (const ch of readFileSync(file, "utf8")) if (ch.codePointAt(0) > 0x7f) set.add(ch);
const text = [...set].sort().join("");
console.log(`${set.size} non-ASCII characters from ${sources.length} files`);

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const faces = [
  ["Noto Serif SC", 400, "NotoSerifSC-400"],
  ["Noto Serif SC", 600, "NotoSerifSC-600"],
  ["Noto Sans SC", 400, "NotoSansSC-400"],
  ["Noto Sans SC", 500, "NotoSansSC-500"],
];
mkdirSync(join(ROOT, "assets", "fonts"), { recursive: true });
for (const [family, weight, file] of faces) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url, { headers: { "user-agent": UA } })).text();
  const src = css.match(/url\((https:[^)]+)\)\s*format\('woff2'\)/);
  if (!src) throw new Error(`${family} ${weight}: no woff2 in response\n${css.slice(0, 300)}`);
  const buf = Buffer.from(await (await fetch(src[1], { headers: { "user-agent": UA } })).arrayBuffer());
  writeFileSync(join(ROOT, "assets", "fonts", `${file}.woff2`), buf);
  console.log(`${file}.woff2  ${(buf.length / 1024).toFixed(0)} KB`);
}
