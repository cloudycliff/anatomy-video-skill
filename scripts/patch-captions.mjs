// Gives the generated caption track the CJK faces (the preset skin only names Latin ones).
// Run from the project root; rerun after every `captions.mjs build`.
//   node <skill>/scripts/patch-captions.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("compositions/captions.html");
let html = readFileSync(file, "utf8");
if (!html.includes("NotoSerifSC-400")) {
  const faces = [
    `@font-face { font-family: 'Noto Serif SC'; src: url('assets/fonts/NotoSerifSC-400.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: block; }`,
    `@font-face { font-family: 'Noto Serif SC'; src: url('assets/fonts/NotoSerifSC-600.woff2') format('woff2'); font-weight: 600 700; font-style: normal; font-display: block; }`,
    `@font-face { font-family: 'Noto Sans SC'; src: url('assets/fonts/NotoSansSC-400.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: block; }`,
  ].join("\n");
  const last = html.lastIndexOf("@font-face");
  const end = html.indexOf("}", last) + 1;
  html = html.slice(0, end) + "\n" + faces + html.slice(end);
}
html = html
  .replaceAll(`"EB Garamond", Georgia, serif`, `"EB Garamond", "Noto Serif SC", Georgia, serif`)
  .replaceAll(`"EB Garamond", system-ui, serif`, `"EB Garamond", "Noto Serif SC", serif`)
  .replaceAll(`"Inter", system-ui, sans-serif`, `"Inter", "Noto Sans SC", sans-serif`);
writeFileSync(file, html);
console.log("captions: CJK faces added");
