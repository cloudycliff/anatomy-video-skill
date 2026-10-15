// Writes compositions/frames/*.html from the specs below.
//   node tools/frames/build.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { C, MONO, SANS, SERIF, TITLE, chars, frame } from "./common.mjs";

const root = new URL("../../", import.meta.url);
const story = readFileSync(new URL("STORYBOARD.md", root), "utf8");
const durations = [...story.matchAll(/^- duration:\s*([\d.]+)s/gm)].map((m) => +m[1]);

const cardGrid = (p) => `
.${p}-grid { display: flex; justify-content: space-between; align-items: stretch; height: 100%; }
.${p}-name { font-family: ${TITLE}; font-weight: 600; font-size: 46px; margin-top: 18px; color: ${C.ink}; }
.${p}-sub { font-family: ${SANS}; font-size: 26px; color: ${C.muted}; margin-top: 14px; }
.${p}-read { text-align: right; display: flex; flex-direction: column; justify-content: space-between; }
.${p}-big { font-size: 92px; line-height: 1; color: ${C.ink}; letter-spacing: -0.02em; }
.${p}-unit { font-family: ${MONO}; font-size: 30px; color: ${C.muted}; margin-left: 10px; }
`;

const frames = [];

/* ── 1 · hook ─────────────────────────────────────────────────────────── */
frames.push({
  id: "01-hook", prefix: "f01",
  kicker: "Fig. 0 · 动圈扬声器", title: "扬声器怎么发声",
  extraCss: cardGrid("f01"),
  card: `<div class="f01-grid">
    <div><div class="f01-label">Fig. 0 · 剖面</div><div class="f01-name">动圈式扬声器</div><div class="f01-sub">四分之一剖切 · 示意</div></div>
    <div class="f01-read"><div class="f01-label">纸盆位移</div><div><span id="f01-x" class="f01-num f01-big">+0.0</span><span class="f01-unit">mm</span></div></div>
  </div>`,
  script: `
  var F = 2.2;
  var END = { cx: 500, cy: 340, w: 1010 };
  function amp(t) { return 0.55 + 1.9 * out(t, 4.06, 4.9); }
  function xAt(t) { return t <= 0 ? 0 : amp(t) * Math.sin(2 * Math.PI * F * t); }
  var readout = $("x");
  Speaker.drive(tl, DUR, function (t) {
    var x = xAt(t);
    draw({
      x: x,
      lit: t >= 2.37 ? ["cone", "dustcap"] : [],
      air: { on: 0.5 + 0.5 * out(t, 4.06, 4.6), t: t, c: 60, top: 175, xOf: xAt },
    }, Speaker.mixCam(CAM.macro, END, out(t, 2.37, 4.1)));
    readout.textContent = (x >= 0 ? "+" : "\\u2212") + Math.abs(x).toFixed(1);
  });
  enter($("card"), 2.6, { y: 40 }, { duration: 0.8 });
  tl.fromTo($$("ch"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.07 }, 4.06);
`,
});

/* ── 2 · anatomy ──────────────────────────────────────────────────────── */
const parts = [
  ["01", "磁铁", "magnet"],
  ["02", "音圈", "voice coil"],
  ["03", "纸盆", "cone"],
  ["04", "弹波 · 折环", "suspension"],
  ["05", "盆架", "basket"],
];
frames.push({
  id: "02-anatomy", prefix: "f02",
  kicker: "Fig. 1 · 剖面分解", title: "五个零件",
  extraCss: `
#f02-card { padding: 22px 36px; }
.f02-row { display: grid; grid-template-columns: 70px 1fr auto; align-items: baseline; height: 45px; }
.f02-idx { font-family: ${MONO}; font-size: 24px; color: ${C.coral}; }
.f02-nm { font-family: "Noto Sans SC", ${SANS}; font-weight: 500; font-size: 34px; color: ${C.ink}; }
.f02-en { font-family: ${MONO}; font-size: 22px; letter-spacing: 0.12em; text-transform: uppercase; color: ${C.muted}; }
`,
  card: parts.map(([i, n, e], k) => `<div class="f02-row" id="f02-r${k + 1}"><span class="f02-idx">${i}</span><span class="f02-nm">${n}</span><span class="f02-en">${e}</span></div>`).join(""),
  script: `
  var START = { cx: 500, cy: 340, w: 1010 };
  var groups = [
    [2.47, ["yoke", "magnet", "plate"]],
    [3.89, ["coil", "former"]],
    [6.19, ["cone", "dustcap"]],
    [7.84, ["spider", "surround"]],
    [9.02, ["basket", "flange", "gasket"]],
  ];
  Speaker.drive(tl, DUR, function (t) {
    var e = inOut(t, 0.2, 2.4);
    var lit = [];
    groups.forEach(function (g) { if (t >= g[0]) lit = g[1]; });
    draw({ explode: e, lit: lit }, Speaker.mixCam(START, CAM.exploded, e));
  });
  tl.fromTo($$("ch"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.08 }, 0.3);
  enter($("card"), 2.3, { y: 40 }, { duration: 0.7 });
  var cues = [2.47, 5.57, 6.19, 7.84, 9.02];
  cues.forEach(function (at, k) {
    enter($("r" + (k + 1)), at, { x: -24 }, { duration: 0.5 });
    if (k > 0) fade($("r" + k), at, 1, 0.42);
  });
`,
});

/* ── 3 · gap ──────────────────────────────────────────────────────────── */
const rows3 = [
  ["磁隙宽度", "≈ 1.2 mm"],
  ["磁感应强度", "B ≈ 1 T"],
  ["音圈", "悬在缝中"],
];
frames.push({
  id: "03-gap", prefix: "f03",
  kicker: "Fig. 2 · 磁路", title: "一毫米的缝",
  extraCss: `
#f03-card { padding: 24px 36px; }
.f03-row { display: flex; justify-content: space-between; align-items: baseline; height: 72px; border-bottom: 1px solid ${C.hair}; }
.f03-row:last-child { border-bottom: none; }
.f03-k { font-family: "Noto Sans SC", ${SANS}; font-size: 30px; color: ${C.muted}; }
.f03-v { font-family: ${MONO}; font-size: 40px; color: ${C.ink}; }
.f03-v.f03-accent { color: ${C.coral}; }
`,
  card: rows3.map(([k, v], i) => `<div class="f03-row" id="f03-r${i + 1}"><span class="f03-k">${k}</span><span class="f03-v${i === 0 ? " f03-accent" : ""}">${v}</span></div>`).join(""),
  script: `
  Speaker.drive(tl, DUR, function (t) {
    var e = 1 - inOut(t, 0, 1.6);
    var cam = Speaker.mixCam(Speaker.mixCam(CAM.exploded, CAM.full, 1 - e), CAM.gap, push(t, 1.68, 3.7));
    draw({ explode: e, lit: t >= 4.86 ? ["coil"] : ["yoke", "magnet", "plate"], field: out(t, 2.3, 3.5) }, cam);
  });
  tl.fromTo($$("ch"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.08 }, 0.3);
  enter($("card"), 3.0, { y: 40 }, { duration: 0.7 });
  enter($("r1"), 3.3, { x: -24 }, { duration: 0.5 });
  enter($("r2"), 4.1, { x: -24 }, { duration: 0.5 });
  enter($("r3"), 4.86, { x: -24 }, { duration: 0.5 });
`,
});

/* ── 4 · force ────────────────────────────────────────────────────────── */
frames.push({
  id: "04-force", prefix: "f04",
  kicker: "Fig. 3 · 安培力", title: "通电就受力",
  extraCss: `
#f04-card { padding: 26px 40px; }
.f04-formula { position: relative; display: flex; align-items: baseline; margin-top: 18px; height: 150px; }
.f04-sym { font-family: ${SERIF}; font-style: italic; font-size: 124px; line-height: 1; color: ${C.ink}; }
.f04-op { font-family: ${SERIF}; font-size: 92px; line-height: 1; color: ${C.muted}; margin: 0 22px; }
.f04-term { position: relative; display: inline-block; }
.f04-val { position: absolute; left: 50%; top: 128px; width: 160px; margin-left: -80px; text-align: center; font-family: ${MONO}; font-size: 30px; color: ${C.ink2}; }
.f04-res { margin-left: auto; font-family: ${SERIF}; font-size: 96px; line-height: 1; color: ${C.ink}; padding-bottom: 6px; border-bottom: 5px solid ${C.coral}; }
.f04-res b { font-weight: 400; font-family: ${SERIF}; }
.f04-res small { font-family: ${MONO}; font-size: 40px; color: ${C.muted}; margin-left: 10px; }
`,
  card: `<div class="f04-label" id="f04-cap">安培力 · 磁场 × 电流 × 导线长度</div>
  <div class="f04-formula">
    <span class="f04-term" id="f04-tF"><span class="f04-sym">F</span></span><span class="f04-op" id="f04-eq">=</span>
    <span class="f04-term" id="f04-tB"><span class="f04-sym">B</span><span class="f04-val" id="f04-vB">1 T</span></span><span class="f04-op" id="f04-d1">·</span>
    <span class="f04-term" id="f04-tI"><span class="f04-sym">I</span><span class="f04-val" id="f04-vI">1 A</span></span><span class="f04-op" id="f04-d2">·</span>
    <span class="f04-term" id="f04-tL"><span class="f04-sym">L</span><span class="f04-val" id="f04-vL">6 m</span></span>
    <span class="f04-res" id="f04-res">= <b id="f04-n">0</b><small>N</small></span>
  </div>`,
  script: `
  var result = $("n");
  Speaker.drive(tl, DUR, function (t) {
    var lit = t >= 1.54 ? ["coil", "former", "cone", "dustcap"] : ["coil"];
    draw({ x: 3.5 * out(t, 1.54, 2.5), lit: lit, current: out(t, 0.2, 0.8), field: 1 }, Speaker.mixCam(CAM.gap, CAM.medium, push(t, 0, 1.5)));
    result.textContent = String(Math.round(6 * out(t, 9.24, 10.0)));
  });
  tl.fromTo($$("ch"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.08 }, 0.3);
  enter($("card"), 3.5, { y: 40 }, { duration: 0.6 });
  enter($("cap"), 3.6, { y: 12 });
  enter([$("tF"), $("eq"), $("tB")], 3.71, { y: 30 }, { stagger: 0.12 });
  enter([$("d1"), $("tI")], 4.6, { y: 30 }, { stagger: 0.12 });
  enter([$("d2"), $("tL")], 5.23, { y: 30 }, { stagger: 0.12 });
  enter($("vB"), 6.48, { y: 14 });
  enter($("vL"), 7.35, { y: 14 });
  enter($("vI"), 8.2, { y: 14 });
  enter($("res"), 9.24, { x: 30 }, { duration: 0.5 });
`,
});

/* ── 5 · alternating ──────────────────────────────────────────────────── */
frames.push({
  id: "05-alternating", prefix: "f05",
  kicker: "Fig. 4 · 交流驱动", title: "正负交替",
  extraCss: cardGrid("f05") + `
#f05-strip { position: absolute; left: 72px; top: 352px; width: 936px; height: 170px; overflow: visible; }
#f05-strip .f05-zero { stroke: ${C.hair}; stroke-width: 1.5; }
#f05-strip .f05-wave { fill: none; stroke: ${C.coral}; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
#f05-strip .f05-play { stroke: ${C.ink}; stroke-width: 1.5; }
#f05-strip .f05-dot { fill: ${C.ink}; }
.f05-axis { position: absolute; left: 72px; top: 318px; font-family: ${MONO}; font-size: 22px; letter-spacing: 0.1em; color: ${C.muted}; }
.f05-dir { font-family: "Noto Sans SC", ${SANS}; font-weight: 500; font-size: 44px; color: ${C.ink}; }
`,
  body: `<div class="f05-axis" id="f05-axis">I(t) · 音乐信号</div>
  <svg id="f05-strip" viewBox="0 0 936 170">
    <line class="f05-zero" x1="0" y1="85" x2="936" y2="85"/>
    <path class="f05-wave" id="f05-wave" pathLength="1" stroke-dasharray="1 1"/>
    <g id="f05-ph"><line class="f05-play" x1="0" y1="-85" x2="0" y2="85"/><circle class="f05-dot" r="9"/></g>
  </svg>`,
  card: `<div class="f05-grid">
    <div><div class="f05-label">驱动电流</div><div style="margin-top:26px"><span id="f05-i" class="f05-num f05-big">+0.00</span><span class="f05-unit">A</span></div></div>
    <div class="f05-read"><div class="f05-label">纸盆</div><div class="f05-dir" id="f05-dir">静止</div></div>
  </div>`,
  script: `
  var T0 = 1.93, T1 = 9.6, F = 0.9;
  function env(t) { return (0.75 + 0.25 * out(t, 4.69, 5.4)) * (1 - inOut(t, 7.66, 9.3)); }
  function I(t) { return t < T0 ? 0 : env(t) * Math.sin(2 * Math.PI * F * (t - T0)); }
  var d = "";
  for (var i = 0; i <= 480; i++) {
    var tt = T0 + ((T1 - T0) * i) / 480;
    d += (i ? "L" : "M") + ((936 * i) / 480).toFixed(1) + " " + (85 - I(tt) * 72).toFixed(1);
  }
  $("wave").setAttribute("d", d);
  var head = $("ph"), iv = $("i"), dir = $("dir");
  Speaker.drive(tl, DUR, function (t) {
    var cur = I(t);
    var lit = t < T0 ? [] : t < 6.91 ? ["coil", "former", "cone", "dustcap"] : ["spider", "surround"];
    draw({ x: 3.4 * cur, lit: lit, current: cur, field: 1 - out(t, 0, 0.9) }, Speaker.mixCam(CAM.medium, CAM.low, push(t, 0, 1.6)));
    var u = Speaker.clamp01((t - T0) / (T1 - T0));
    head.setAttribute("transform", "translate(" + (936 * u).toFixed(1) + " " + (85 - cur * 72).toFixed(1) + ")");
    iv.textContent = (cur >= 0 ? "+" : "\\u2212") + Math.abs(cur).toFixed(2);
    dir.textContent = Math.abs(cur) < 0.06 ? (t > 8.5 ? "回到中间" : "静止") : cur > 0 ? "前推 \\u2191" : "后拉 \\u2193";
  });
  tl.fromTo($$("ch"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.08 }, 0.3);
  enter($("axis"), 0.2, { x: -16 });
  tl.fromTo($("wave"), { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.4, ease: "power2.inOut" }, 0.2);
  tl.fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, 1.8);
  enter($("card"), 1.93, { y: 40 }, { duration: 0.7 });
`,
});

/* ── 6 · wave ─────────────────────────────────────────────────────────── */
frames.push({
  id: "06-wave", prefix: "f06",
  kicker: "Fig. 5 · 声波", title: "一推一拉",
  titleHtml: `<span id="f06-t1">${chars("一推一拉", "f06-ch")}</span><span id="f06-t2" class="f06-swap">${chars("声波", "f06-ch2")}</span>`,
  extraCss: `
.f06-swap { position: absolute; left: 0; top: 0; }
#f06-title { position: relative; }
.f06-ch2 { display: inline-block; }
.f06-tags { display: flex; gap: 24px; margin-top: 22px; }
.f06-tag { flex: 1; height: 120px; border-radius: 10px; border: 1px solid ${C.hair}; background: ${C.tile}; display: flex; align-items: center; justify-content: center; gap: 18px; }
.f06-tag b { font-family: ${TITLE}; font-weight: 600; font-size: 64px; color: ${C.ink}; }
.f06-tag span { font-family: "Noto Sans SC", ${SANS}; font-size: 30px; color: ${C.muted}; }
.f06-note { margin-top: 20px; font-family: ${MONO}; font-size: 22px; letter-spacing: 0.08em; color: ${C.muted}; }
`,
  card: `<div class="f06-label">空气 · 纵波</div>
  <div class="f06-tags"><div class="f06-tag" id="f06-dense"><b>密</b><span>压缩</span></div><div class="f06-tag" id="f06-sparse"><b>疏</b><span>稀疏</span></div></div>
  <div class="f06-note" id="f06-note">示意：速度已放慢，振幅已放大</div>`,
  script: `
  var F = 0.8;
  function xAt(t) {
    if (t <= 0.2) return 0;
    if (t < 2.14) return 6 * inOut(t, 0.2, 1.0);
    if (t < 4.02) return 6 - 10 * inOut(t, 2.14, 3.0);
    return -4 * Math.cos(2 * Math.PI * F * (t - 4.02));
  }
  Speaker.drive(tl, DUR, function (t) {
    draw({ x: xAt(t), lit: ["cone", "dustcap"], air: { on: out(t, 0.05, 0.6), t: t, c: 30, top: 232, xOf: xAt } }, Speaker.mixCam(CAM.low, CAM.column, push(t, 0, 1.3)));
  });
  tl.fromTo($$("ch"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.08 }, 0.3);
  tl.fromTo($$("ch2"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.1 }, 5.95);
  fade($("t1"), 5.85, 1, 0, 0.25);
  enter($("card"), 1.0, { y: 40 }, { duration: 0.6 });
  enter($("dense"), 1.19, { y: 20 }, { duration: 0.5 });
  enter($("sparse"), 2.61, { y: 20 }, { duration: 0.5 });
  fade($("dense"), 2.61, 1, 0.45);
  fade($("dense"), 4.02, 0.45, 1);
  enter($("note"), 5.9, { y: 10 });
`,
});

/* ── 7 · landing ──────────────────────────────────────────────────────── */
frames.push({
  id: "07-landing", prefix: "f07",
  kicker: "Fig. 6 · 总结", title: "波形不变",
  extraCss: `
#f07-fig { top: 300px; height: 540px; }
#f07-panel { position: absolute; left: 72px; top: 880px; width: 936px; height: 380px; overflow: visible; }
#f07-panel path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.f07-ink { stroke: ${C.ink}; stroke-width: 4; }
.f07-cor { stroke: ${C.coral}; stroke-width: 4.5; }
.f07-tag { font-family: ${MONO}; font-size: 22px; letter-spacing: 0.1em; fill: ${C.muted}; }
.f07-rule { position: absolute; left: 36px; right: 36px; display: flex; align-items: center; gap: 22px; font-family: "Noto Sans SC", ${SANS}; font-weight: 500; font-size: 44px; color: ${C.ink}; }
.f07-rule i { font-style: normal; font-family: ${MONO}; color: ${C.coral}; font-size: 40px; }
#f07-rule1 { top: 52px; } #f07-rule2 { top: 150px; }
#f07-chain { position: absolute; left: 36px; right: 36px; top: 0; bottom: 0; display: flex; align-items: center; justify-content: space-between; }
.f07-tok { font-family: ${TITLE}; font-weight: 600; font-size: 60px; color: ${C.ink}; }
.f07-arr { font-family: ${MONO}; font-size: 44px; color: ${C.coral}; }
#f07-veil { position: absolute; inset: 0; background: ${C.cream}; pointer-events: none; opacity: 0; }
`,
  body: `<svg id="f07-panel" viewBox="0 0 936 380">
    <g id="f07-g1"><path class="f07-ink" id="f07-fast" pathLength="1" stroke-dasharray="1 1"/><text class="f07-tag" x="0" y="22">快</text></g>
    <g id="f07-g2"><path class="f07-ink" id="f07-slow" pathLength="1" stroke-dasharray="1 1"/><text class="f07-tag" x="0" y="212">大</text></g>
    <g id="f07-gp"><path class="f07-ink" id="f07-p" pathLength="1" stroke-dasharray="1 1"/><text class="f07-tag" x="0" y="232">声压 p(t)</text></g>
    <g id="f07-gi"><path class="f07-cor" id="f07-i" pathLength="1" stroke-dasharray="1 1"/><text class="f07-tag" x="0" y="52">电流 I(t)</text></g>
  </svg>`,
  card: `<div class="f07-rule" id="f07-rule1"><span>频率 ↑</span><i>→</i><span>音调 ↑</span></div>
  <div class="f07-rule" id="f07-rule2"><span>振幅 ↑</span><i>→</i><span>响度 ↑</span></div>
  <div id="f07-chain"><span class="f07-tok" id="f07-k1">电流</span><span class="f07-arr" id="f07-a1">→</span><span class="f07-tok" id="f07-k2">力</span><span class="f07-arr" id="f07-a2">→</span><span class="f07-tok" id="f07-k3">振动</span><span class="f07-arr" id="f07-a3">→</span><span class="f07-tok" id="f07-k4">声波</span></div>`,
  tail: `<div id="f07-veil"></div>`,
  script: `
  draw = Speaker.mount($("svg"), rig, 540 / 1080);
  var cam = { cx: 500, cy: 300, w: 1750 };
  function m(t) { return 0.62 * Math.sin(2 * Math.PI * 1.1 * t) + 0.3 * Math.sin(2 * Math.PI * 2.3 * t + 1) + 0.18 * Math.sin(2 * Math.PI * 3.7 * t + 2); }
  function xAt(t) {
    if (t <= 0) return 0;
    var a = inOut(t, 1.6, 1.9), b = inOut(t, 3.4, 3.7);
    var xa = 1.2 * Math.sin(2 * Math.PI * 3 * t), xb = 5 * Math.sin(2 * Math.PI * 0.9 * (t - 1.77)), xc = 3.4 * m(t);
    return (xa * (1 - a) + xb * a) * (1 - b) + xc * b;
  }
  function wave(id, y0, ampl, fn, span) {
    var d = "";
    for (var i = 0; i <= 360; i++) d += (i ? "L" : "M") + ((936 * i) / 360).toFixed(1) + " " + (y0 - ampl * fn((span * i) / 360)).toFixed(1);
    $(id).setAttribute("d", d);
  }
  wave("fast", 100, 26, function (s) { return Math.sin(2 * Math.PI * 9 * s); }, 1);
  wave("slow", 290, 70, function (s) { return Math.sin(2 * Math.PI * 2.5 * s); }, 1);
  wave("i", 110, 70, function (s) { return m(s * 4); }, 1);
  wave("p", 270, 70, function (s) { return m(s * 4); }, 1);
  Speaker.drive(tl, DUR, function (t) {
    draw({ x: xAt(t), lit: ["cone", "dustcap"], air: { on: 1, t: t, c: 40, top: 190, xOf: xAt } }, cam);
  });
  function drawOn(id, at, dur) { tl.fromTo($(id), { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: dur, ease: "power2.inOut" }, at); }
  tl.fromTo($$("ch"), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.08 }, 0.3);
  enter($("card"), 0.6, { y: 40 }, { duration: 0.6 });
  enter($("g1"), 0.2, { opacity: 0 }, { duration: 0.2 }); drawOn("fast", 0.2, 0.8);
  enter($("rule1"), 1.01, { x: -24 }, { duration: 0.5 });
  enter($("g2"), 1.77, { opacity: 0 }, { duration: 0.2 }); drawOn("slow", 1.77, 0.8);
  enter($("rule2"), 2.5, { x: -24 }, { duration: 0.5 });
  tl.set([$("g1"), $("g2"), $("rule1"), $("rule2")], { opacity: 0 }, 3.53);
  enter($("gi"), 3.53, { opacity: 0 }, { duration: 0.2 }); drawOn("i", 3.53, 0.8);
  enter($("gp"), 3.6, { opacity: 0 }, { duration: 0.2 }); drawOn("p", 3.6, 0.8);
  tl.fromTo($("gi"), { y: 0 }, { y: 80, duration: 0.9, ease: "power3.inOut" }, 4.43);
  tl.fromTo($("gp"), { y: 0 }, { y: -80, duration: 0.9, ease: "power3.inOut" }, 4.43);
  fade($$("tag"), 4.43, 1, 0, 0.3);
  ["k1", "a1", "k2", "a2", "k3", "a3", "k4"].forEach(function (k, n) { enter($(k), 5.0 + n * 0.22, { y: 26 }, { duration: 0.5 }); });
  fade($("veil"), 7.13, 0, 1, 0.35);
`,
});

const dir = new URL("compositions/frames/", root);
mkdirSync(dir, { recursive: true });
frames.forEach((f, i) => {
  const html = frame({ ...f, duration: durations[i] });
  writeFileSync(new URL(`${f.id}.html`, dir), html);
  console.log(`${f.id}.html  ${durations[i]}s`);
});
