/* Rig skeleton: one isometric figure of the device, drawn as an SVG string from a state object.
 * Copy to <project>/assets/rig/rig.js, rename the global, and replace the PARTS section.
 * Contract: Rig.create() → { P, render(state) → svg markup, bounds(state) → {x,y,w,h} };
 * render() must be a pure, synchronous function of state — the video seeks to arbitrary times.
 * Boxes are painted whole, in a topological order that is exact for non-overlapping boxes.
 * Turned (axisymmetric) parts need a per-facet global depth sort instead: copy emitRevolved /
 * emitRing / sectionFaces / emitBox from examples/speaker/speaker.js rather than re-deriving them. */
(function (root) {
  "use strict";
  var TAU = Math.PI * 2, RAD = Math.PI / 180, UNIT = Math.sqrt(1.6), LIGHT_UP = 1.2;
  var BANDS = [0, 0.2, 0.42, 0.62];

  /* ── projection: the anatomy kit's camera and light ─────────────────────── */
  function cam(P) {
    var a = P.azimuth * RAD, e = P.elevation * RAD;
    return { sa: Math.sin(a), ca: Math.cos(a), se: Math.sin(e), ce: Math.cos(e), k: P.scale * UNIT };
  }
  function iso(p, P) {
    var c = P._c;
    return [P.origin[0] + (p[0] * c.sa - p[1] * c.ca) * c.k, P.origin[1] + ((p[0] * c.ca + p[1] * c.sa) * c.se - p[2] * c.ce) * c.k];
  }
  function depth(p, P) {
    var c = P._c;
    return (p[0] * c.ca + p[1] * c.sa) * c.ce + p[2] * c.se;
  }
  function band(score) {
    var t = 0;
    while (t < BANDS.length && score >= BANDS[t]) t++;
    return t;
  }
  function fit(points, width, height, pad, azimuth, elevation) {
    var unit = { origin: [0, 0], scale: 1, azimuth: azimuth, elevation: elevation };
    unit._c = cam(unit);
    var xs = [], ys = [];
    points.forEach(function (p) { var s = iso(p, unit); xs.push(s[0]); ys.push(s[1]); });
    var l = Math.min.apply(null, xs), r = Math.max.apply(null, xs), u = Math.min.apply(null, ys), d = Math.max.apply(null, ys);
    var scale = Math.min((width - pad * 2) / (r - l), (height - pad * 2) / (d - u));
    var P = { origin: [width / 2 - ((l + r) / 2) * scale, height / 2 - ((u + d) / 2) * scale], scale: scale, azimuth: azimuth, elevation: elevation };
    P._c = cam(P);
    return P;
  }
  var f1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, ""); };
  function path(points, closed) {
    var s = "";
    for (var i = 0; i < points.length; i++) s += (i ? "L" : "M") + f1(points[i][0]) + " " + f1(points[i][1]);
    return closed ? s + "Z" : s;
  }

  function create(options) {
    options = options || {};
    var AZ = options.azimuth || 38, EL = options.elevation || 34;
    /* world units are millimetres; fit the device's resting envelope into a 1000-unit square */
    var ENVELOPE = [[-60, -60, 0], [60, -60, 0], [60, 60, 0], [-60, 60, 0], [-60, -60, 80], [60, -60, 80], [60, 60, 80], [-60, 60, 80]];
    var P = options.P || fit(ENVELOPE, 1000, 1000, 40, AZ, EL);
    P._c = cam(P);
    var C = P._c;
    var V = [C.ca * C.ce, C.sa * C.ce, C.se];
    var Lr = [-C.sa, C.ca, LIGHT_UP], Ll = Math.hypot(Lr[0], Lr[1], Lr[2]);
    var L = [Lr[0] / Ll, Lr[1] / Ll, Lr[2] / Ll];

    /* axis-aligned box [min, max] → its visible faces, toned by the light; edges per face */
    function boxSvg(min, max, tone, cls, lit) {
      var svg = "";
      [0, 1, 2].forEach(function (k) {
        if (Math.abs(V[k]) < 1e-6) return;
        var n = [0, 0, 0]; n[k] = V[k] > 0 ? 1 : -1;
        var at = V[k] > 0 ? max[k] : min[k], u = (k + 1) % 3, w = (k + 2) % 3, q = [];
        [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(function (c) {
          var p = [0, 0, 0]; p[k] = at; p[u] = c[0] ? max[u] : min[u]; p[w] = c[1] ? max[w] : min[w];
          q.push(iso(p, P));
        });
        var t = band(n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), d = path(q, true);
        svg += '<path class="f' + t + " " + cls + '" d="' + d + '"/><path class="' + (lit ? "e lit" : "e t-" + tone) + '" d="' + d + '"/>';
      });
      return svg;
    }
    /* painter's order for non-overlapping boxes: if A and B are separated along an axis,
       the one on the far side of that axis (against the view vector) is drawn first */
    function behind(a, b) {
      for (var k = 0; k < 3; k++) {
        if (a.max[k] <= b.min[k] + 1e-6) return V[k] > 0;
        if (b.max[k] <= a.min[k] + 1e-6) return V[k] < 0;
      }
      return depth(a.mid, P) < depth(b.mid, P);
    }
    function paintOrder(boxes) {
      var done = [], used = boxes.map(function () { return false; });
      while (done.length < boxes.length) {
        for (var i = 0; i < boxes.length; i++) {
          if (used[i]) continue;
          var free = true;
          for (var j = 0; j < boxes.length && free; j++) if (!used[j] && j !== i && behind(boxes[j], boxes[i])) free = false;
          if (free || done.length + 1 === boxes.length) { used[i] = true; done.push(boxes[i]); break; }
        }
      }
      return done;
    }

    /* ── PARTS: replace with the device. Boxes are { min, max } in mm; each part reads only `state`. ── */
    var PARTS = [
      { id: "base", tone: "lo", explode: 0, min: [-60, -60, 0], max: [60, 60, 12] },
      { id: "body", tone: "mid", explode: 40, min: [-40, -40, 12], max: [40, 40, 60] },
      { id: "cap", tone: "hi", explode: 80, min: [-25, -25, 60], max: [25, 25, 72] },
    ];
    function placed(state) {
      var e = state.explode || 0;
      return PARTS.map(function (p) {
        var dz = p.explode * e, min = [p.min[0], p.min[1], p.min[2] + dz], max = [p.max[0], p.max[1], p.max[2] + dz];
        return { p: p, min: min, max: max, mid: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] };
      });
    }

    function render(state) {
      state = state || {};
      var lit = state.lit || [];
      var solids = paintOrder(placed(state)).map(function (b) {
        var on = lit.indexOf(b.p.id) >= 0;
        return boxSvg(b.min, b.max, b.p.tone, (on ? "L " : "") + "p-" + b.p.id, on);
      });
      var top = []; /* overlays drawn after every solid: section faces, flow lines, particles */
      return halo(state) + solids.join("") + top.join("");
    }
    function halo(state) {
      var pts = [];
      for (var i = 0; i < 48; i++) { var t = (i / 48) * TAU; pts.push(iso([70 * Math.cos(t), 70 * Math.sin(t), -0.5], P)); }
      return '<path class="halo" d="' + path(pts, true) + '"/>';
    }
    function bounds(state) {
      state = state || {};
      var xs = [], ys = [];
      placed(state).forEach(function (b) {
        for (var i = 0; i < 8; i++) {
          var s = iso([i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]], P);
          xs.push(s[0]); ys.push(s[1]);
        }
      });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    function point(p) { return iso(p, P); }
    return { P: P, render: render, bounds: bounds, point: point, parts: PARTS.map(function (p) { return p.id; }) };
  }

  /* ── runtime: keep as is ────────────────────────────────────────────────── */
  /* camera = { cx, cy, w } in rig units; height follows the svg's aspect */
  function mount(svg, rig, aspect) {
    var last = "";
    return function draw(state, camera) {
      var h = camera.w * aspect;
      var vb = (camera.cx - camera.w / 2).toFixed(2) + " " + (camera.cy - h / 2).toFixed(2) + " " + camera.w.toFixed(2) + " " + h.toFixed(2);
      svg.setAttribute("viewBox", vb);
      var key = JSON.stringify(state);
      if (key === last) return;
      last = key;
      svg.innerHTML = rig.render(state);
    };
  }
  function fitCamera(b, aspect, pad) {
    pad = pad || 0;
    var w = Math.max(b.w + 2 * pad, (b.h + 2 * pad) / aspect);
    return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, w: w };
  }
  /* seek-safe driver: GSAP calls a function property as a setter on every render, even
     when the engine seeks with events suppressed, so fn(t) always sees the current time */
  function drive(tl, duration, fn) {
    var cur = 0;
    var proxy = { t: function (v) { if (!arguments.length) return cur; cur = v; fn(v); } };
    tl.fromTo(proxy, { t: 0 }, { t: duration, duration: duration, ease: "none" }, 0);
    fn(0);
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(ease) {
    return function (t, a, b) { return ease(clamp01((t - a) / (b - a))); };
  }
  function mixCam(a, b, p) {
    return { cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p, w: Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * p) };
  }

  root.Rig = { create: create, mount: mount, fitCamera: fitCamera, drive: drive, seg: seg, mixCam: mixCam, clamp01: clamp01 };
})(typeof window !== "undefined" ? window : globalThis);
