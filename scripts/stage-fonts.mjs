// Copies a frame preset's Latin font files into assets/fonts/ (build-frame.mjs does not stage them).
// Run from the project root.
//   node <skill>/scripts/stage-fonts.mjs --preset code-editorial
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const i = process.argv.indexOf("--preset");
const preset = i > 0 ? process.argv[i + 1] : "code-editorial";
const skills = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const from = join(skills, "hyperframes-creative", "frame-presets", preset, "fonts");
if (!existsSync(from)) throw new Error(`no fonts folder for preset "${preset}" at ${from}`);
const to = resolve("assets/fonts");
mkdirSync(to, { recursive: true });
const files = readdirSync(from).filter((f) => /\.(woff2?|ttf|otf)$/i.test(f));
for (const f of files) copyFileSync(join(from, f), join(to, f));
console.log(`staged ${files.length} font files from ${preset} → assets/fonts/: ${files.join(", ")}`);
