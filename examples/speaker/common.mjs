// Shared shell for the seven frames: fonts, ground, header, figure, card, script loading.
export const W = 1080;
export const H = 1920;
export const FIG = { top: 330, height: 960 };
export const ASPECT = FIG.height / W;

export const CAM = {
  full: { cx: 500, cy: 433, w: 990 },
  exploded: { cx: 500, cy: 322, w: 1720 },
  macro: { cx: 762, cy: 478, w: 250 },
  gap: { cx: 552, cy: 632, w: 240 },
  medium: { cx: 540, cy: 560, w: 560 },
  low: { cx: 500, cy: 360, w: 1040 },
  column: { cx: 500, cy: 222, w: 1262 },
};

const FONTS = [
  ["EB Garamond", 400, "EBGaramond-400"],
  ["Inter", 400, "Inter-400"],
  ["Inter", 700, "Inter-700"],
  ["JetBrains Mono", 400, "JetBrainsMono-400"],
  ["JetBrains Mono", 700, "JetBrainsMono-700"],
  ["Noto Serif SC", 600, "NotoSerifSC-600"],
  ["Noto Sans SC", 400, "NotoSansSC-400"],
  ["Noto Sans SC", 500, "NotoSansSC-500"],
];
export const fontFaces = () =>
  FONTS.map(([family, weight, file]) => `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight}; font-display: block; src: url("assets/fonts/${file}.woff2") format("woff2"); }`).join("\n");

export const SERIF = `"EB Garamond", "Noto Serif SC", serif`;
export const TITLE = `"Noto Serif SC", "EB Garamond", serif`;
export const SANS = `"Inter", "Noto Sans SC", sans-serif`;
export const MONO = `"JetBrains Mono", "Noto Sans SC", monospace`;

export const C = { cream: "#FAF9F5", ink: "#141413", ink2: "#3d3b36", muted: "#6b6862", faint: "#a9a59c", tile: "#EFE9DE", coral: "#CC785C", hair: "rgba(20,20,19,0.14)" };

export function chars(text, cls) {
  return [...text].map((ch) => (ch === " " ? " " : `<span class="${cls}">${ch}</span>`)).join("");
}

export function frame({ id, prefix, duration, kicker, title, titleHtml, extraCss = "", body = "", card = "", tail = "", script }) {
  const p = prefix;
  return `<template>
<style>
${fontFaces()}
#root { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; color: ${C.ink}; font-family: ${SANS}; }
#${p}-ground { position: absolute; inset: 0; background-color: ${C.cream};
  background-image: linear-gradient(rgba(20,20,19,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,19,0.035) 1px, transparent 1px);
  background-size: 60px 60px; background-position: 0 30px; }
#${p}-head { position: absolute; left: 72px; right: 72px; top: 132px; }
.${p}-kicker { font-family: ${MONO}; font-size: 26px; letter-spacing: 0.16em; color: ${C.muted}; display: flex; align-items: center; gap: 16px; text-transform: uppercase; }
.${p}-kicker::before { content: ""; width: 14px; height: 14px; background: ${C.coral}; display: block; }
.${p}-title { margin: 22px 0 0; font-family: ${TITLE}; font-weight: 600; font-size: 88px; line-height: 1.08; letter-spacing: 0.02em; color: ${C.ink}; min-height: 96px; }
.${p}-ch { display: inline-block; }
#${p}-fig { position: absolute; left: 0; top: ${FIG.top}px; width: ${W}px; height: ${FIG.height}px; }
#${p}-card { position: absolute; left: 72px; right: 72px; top: 1300px; height: 270px; box-sizing: border-box; padding: 30px 36px;
  background: #FCFBF8; border: 1px solid ${C.hair}; border-radius: 12px; box-shadow: 0 22px 44px -30px rgba(70,50,30,0.35); }
.${p}-label { font-family: ${MONO}; font-size: 22px; letter-spacing: 0.14em; color: ${C.muted}; text-transform: uppercase; }
.${p}-num { font-family: ${MONO}; font-variant-numeric: tabular-nums; }
${extraCss}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
  <div id="${p}-ground" class="clip" data-start="0" data-duration="${duration}" data-track-index="0"></div>
  <div id="${p}-head">
    <div class="${p}-kicker" id="${p}-kicker">${kicker}</div>
    <h1 class="${p}-title" id="${p}-title">${titleHtml ?? chars(title, `${p}-ch`)}</h1>
  </div>
  <div id="${p}-fig" class="spk"><svg id="${p}-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 889" preserveAspectRatio="xMidYMid meet"></svg></div>
  ${body}
  <div id="${p}-card">${card}</div>
  ${tail}
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="assets/speaker/speaker.bundle.js"></script>
<script>
(function () {
  var ID = ${JSON.stringify(p)};
  var COMP = ${JSON.stringify(id)};
  var DUR = ${duration};
  var $ = function (s) { return document.getElementById(ID + "-" + s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll("." + ID + "-" + s)); };
  var CAM = ${JSON.stringify(CAM)};
  var ASPECT = ${ASPECT};
  var rig = Speaker.create();
  var draw = Speaker.mount($("svg"), rig, ASPECT);
  var out = Speaker.seg(gsap.parseEase("power3.out"));
  var inOut = Speaker.seg(gsap.parseEase("power2.inOut"));
  var push = Speaker.seg(gsap.parseEase("power3.inOut"));
  var lin = Speaker.seg(function (v) { return v; });
  var tl = gsap.timeline({ paused: true });
  function enter(target, at, from, extra) {
    var to = Object.assign({ opacity: 1, x: 0, y: 0, duration: 0.6, ease: "power3.out" }, extra || {});
    tl.fromTo(target, Object.assign({ opacity: 0 }, from || { y: 24 }), to, at);
  }
  function fade(target, at, from, to, dur) {
    tl.fromTo(target, { opacity: from }, { opacity: to, duration: dur || 0.4, ease: "power2.out", immediateRender: false }, at);
  }
  enter($("kicker"), 0.15, { x: -16 });
${script}
  window.__timelines = window.__timelines || {};
  window.__timelines[COMP] = tl;
})();
</script>
</template>
`;
}
