// Packages a finished render: probes the duration, builds a contact sheet, and writes the frame table.
// Run from the project root after `hyperframes render`.
//   node <skill>/scripts/deliver.mjs [--video renders/video.mp4] [--cells 14] [--cols 7]
// Writes renders/contact-sheet.jpg and renders/DELIVERY.md, and prints the same summary.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const VIDEO = resolve(arg("video", "renders/video.mp4"));
const CELLS = Number(arg("cells", "14"));
const COLS = Number(arg("cols", "7"));
if (!existsSync(VIDEO)) throw new Error(`no render at ${VIDEO}`);
const tool = (bin, args) => {
  try { return execFileSync(bin, args, { encoding: "utf8" }); }
  catch (e) { throw new Error(`${bin} failed or is not on PATH: ${e.message.split("\n")[0]}`); }
};

const probe = JSON.parse(tool("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=width,height,codec_type", "-of", "json", VIDEO]));
const duration = Number(probe.format.duration);
const video = probe.streams.find((s) => s.codec_type === "video");
const hasAudio = probe.streams.some((s) => s.codec_type === "audio");
const sheet = join(dirname(VIDEO), "contact-sheet.jpg");
const rows = Math.ceil(CELLS / COLS);
const cellW = video.width >= video.height ? 360 : 270;
tool("ffmpeg", ["-y", "-loglevel", "error", "-i", VIDEO, "-vf", `fps=${CELLS}/${duration.toFixed(3)},scale=${cellW}:-1,tile=${COLS}x${rows}`, "-frames:v", "1", sheet]);

const frames = [];
if (existsSync("index.html")) {
  const index = readFileSync("index.html", "utf8");
  for (const m of index.matchAll(/<div\b[^>]*>/g)) {
    const tag = m[0];
    if (!/data-composition-src="compositions\/frames\//.test(tag)) continue;
    frames.push({ id: tag.match(/data-composition-id="([^"]+)"/)[1], start: Number(tag.match(/data-start="([\d.]+)"/)[1]) });
  }
}
const story = existsSync("STORYBOARD.md") ? readFileSync("STORYBOARD.md", "utf8") : "";
const titles = [...story.matchAll(/^## Frame (\d+)\s*[—–-]\s*(.+)$/gm)].map((m) => m[2].trim());
frames.forEach((f, i) => { f.length = (frames[i + 1] ? frames[i + 1].start : duration) - f.start; f.title = titles[i] || ""; });

const mb = (statSync(VIDEO).size / 1048576).toFixed(1);
const lines = [
  `# Delivery`,
  ``,
  `- Video: \`${VIDEO}\``,
  `- Duration: ${duration.toFixed(2)} s · ${video.width}×${video.height} · ${mb} MB · audio ${hasAudio ? "yes" : "none"}`,
  `- Contact sheet: \`${sheet}\` (${CELLS} stills, one every ${(duration / CELLS).toFixed(1)} s)`,
  ``,
  `| # | Frame id | Title | Starts | Length |`,
  `| --- | --- | --- | --- | --- |`,
  ...frames.map((f, i) => `| ${i + 1} | \`${f.id}\` | ${f.title} | ${f.start.toFixed(2)} s | ${f.length.toFixed(2)} s |`),
];
writeFileSync(join(dirname(VIDEO), "DELIVERY.md"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
