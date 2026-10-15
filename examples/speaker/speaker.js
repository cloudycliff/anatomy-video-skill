/* A 6.5-inch moving-coil loudspeaker drawn in the anatomy kit's isometric camera,
 * light and four-tone shading, as a quarter-section cutaway: every turned part is
 * revolved over 270° and the 90° wedge facing the viewer is removed, so both cut
 * planes face the camera and nothing can stand in front of them.
 * World units are millimetres; z is the speaker's axis, the cone faces up.
 * Speaker.create(P?) → { P, render(state) → svg markup, bounds(state), point(r, z, side) }.
 * render() is a pure function of state, so a seeked timeline redraws any frame. */
(function (root) {
  "use strict";
  var TAU = Math.PI * 2, RAD = Math.PI / 180, UNIT = Math.sqrt(1.6), LIGHT_UP = 1.2;
  var BANDS = [0, 0.2, 0.42, 0.62];

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

  /* ── truth: the parts, as half-sections [r, z, smooth] ─────────────────────── */
  var CONE = { r0: 13.6, z0: 41.6, r1: 66, z1: 78.0 };
  function coneZ(r) {
    var t = (r - CONE.r0) / (CONE.r1 - CONE.r0);
    return CONE.z0 + t * (CONE.z1 - CONE.z0) - 2.8 * Math.sin(Math.PI * t);
  }
  var GAP = { pole: 12.4, plate: 13.6, z0: 21, z1: 27 };
  var COIL = { rIn: 12.75, rOut: 13.4, z0: 18, z1: 30, layers: 2, turns: 37 };

  function shellOf(line, thick) {
    var h = thick / 2, n = line.length, a = [], b = [];
    for (var i = 0; i < n; i++) {
      var p = line[Math.max(0, i - 1)], q = line[Math.min(n - 1, i + 1)];
      var tr = q[0] - p[0], tz = q[1] - p[1], len = Math.hypot(tr, tz) || 1;
      var nr = -tz / len, nz = tr / len, sm = line[i][2] ? 1 : 0;
      a.push([line[i][0] - nr * h, line[i][1] - nz * h, sm]);
      b.push([line[i][0] + nr * h, line[i][1] + nz * h, sm]);
    }
    return a.concat(b.reverse());
  }
  function ccw(poly) {
    var s = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return s >= 0 ? poly : poly.slice().reverse();
  }
  function range(a, b, step) {
    var out = [], n = Math.max(1, Math.round(Math.abs(b - a) / step));
    for (var i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
    return out;
  }

  function coneShell() {
    var line = [];
    range(CONE.r0, CONE.r1, 1.6).forEach(function (r, i, all) { line.push([r, coneZ(r), i > 0 && i < all.length - 1 ? 1 : 0]); });
    var shell = shellOf(line, 0.9);
    var neck = [[12.75, 39.4, 0], [13.6, 39.4, 0]];
    var top = shell.slice(line.length);
    return neck.concat(shell.slice(0, line.length), top, [[12.75, top[top.length - 1][1], 0]]);
  }
  var CONE_PROF = coneShell();
  var NECK_TOP = CONE_PROF[CONE_PROF.length - 1][1];
  function inSpan(A, B, z0, z1) { return Math.min(A[1], B[1]) >= z0 - 1e-6 && Math.max(A[1], B[1]) <= z1 + 1e-6; }
  function dustLine() {
    var zb = coneZ(20.5) + 0.75, out = [];
    range(0, 90, 6).forEach(function (deg, i, all) {
      var a = deg * RAD;
      out.push([20.5 * Math.cos(a), zb + 8.2 * Math.sin(a), i > 0 && i < all.length - 1 ? 1 : 0]);
    });
    return out;
  }
  function spiderLine() {
    var out = [], r0 = 12.8, r1 = 50, a = 15, b = 47;
    range(r0, r1, 0.5).forEach(function (r) {
      var w = r < a || r > b ? 0 : Math.pow(Math.sin((Math.PI * (r - a)) / (b - a)), 0.35);
      out.push([r, 38 + 1.35 * Math.sin((TAU * (r - a)) / 6.4) * w, r > r0 && r < r1 ? 1 : 0]);
    });
    return out;
  }
  var SUR = { z: coneZ(66) + 0.9, c: 72, R: 6 };
  function surroundLine() {
    var out = [];
    range(62.4, 66, 0.9).forEach(function (r, i) { out.push([r, coneZ(r) + 0.9, i > 0 ? 1 : 0]); });
    out[out.length - 1][2] = 0;
    out[out.length - 1][1] = SUR.z;
    range(6, 174, 6).forEach(function (deg) {
      var a = deg * RAD;
      out.push([SUR.c - SUR.R * Math.cos(a), SUR.z + SUR.R * Math.sin(a), 1]);
    });
    out.push([78, SUR.z, 0]);
    range(78.9, 81.6, 0.9).forEach(function (r) { out.push([r, SUR.z, 0]); });
    return out;
  }
  var FLANGE_TOP = SUR.z - 0.45;

  function partList() {
    var cham = 0.7;
    return [
      { id: "yoke", group: "motor", tone: "mid", mat: "steel", explode: -60, prof: [[3.5, 0], [44.2, 0], [45, cham], [45, 6], [GAP.pole, 6], [GAP.pole, 27.0], [GAP.pole - 0.7, 27.6], [3.5, 27.6]] },
      { id: "magnet", group: "motor", tone: "mid", mat: "ferrite", explode: -31, prof: [[22.6, 6], [44.4, 6], [45, 6.6], [45, 20.4], [44.4, 21], [22.6, 21], [22, 20.4], [22, 6.6]] },
      { id: "plate", group: "motor", tone: "mid", mat: "steel", explode: 0, prof: [[GAP.plate, 21], [45, 21], [45, 26.3], [44.3, 27], [GAP.plate, 27]] },
      { id: "basket", group: "frame", tone: "lo", mat: "steel", explode: 14, prof: [[28, 27], [48.2, 27], [48.2, 35.8], [56, 35.8], [56, 37.75], [46.8, 37.75], [46.8, 29.5], [28, 29.5]] },
      { id: "flange", group: "frame", tone: "lo", mat: "steel", explode: 14, prof: [[73.5, 76.8], [84.6, 76.8], [84.6, 72.6], [86, 72.6], [86, FLANGE_TOP], [73.5, FLANGE_TOP]] },
      { id: "gasket", group: "frame", tone: "lo", mat: "paper", explode: 14, prof: [[81.9, FLANGE_TOP], [86, FLANGE_TOP], [86, FLANGE_TOP + 1.4], [81.9, FLANGE_TOP + 1.4]] },
      { id: "former", group: "moving", tone: "mid", mat: "paper", explode: 42, bias: 0.6, prof: [[12.6, 16.6], [12.75, 16.6], [12.75, COIL.z0], [12.75, COIL.z1], [12.75, 39.4], [12.75, NECK_TOP], [12.75, 44.2], [12.6, 44.2]],
        glued: function (A, B, e) { return A[0] === 12.75 && B[0] === 12.75 && (inSpan(A, B, COIL.z0, COIL.z1) || (e < 1e-3 && inSpan(A, B, 39.4, NECK_TOP))); } },
      { id: "coil", group: "moving", tone: "hi", mat: "copper", explode: 42, prof: [[COIL.rIn, COIL.z0], [COIL.rOut, COIL.z0], [COIL.rOut, COIL.z1], [COIL.rIn, COIL.z1]],
        glued: function (A, B) { return A[0] === COIL.rIn && B[0] === COIL.rIn; } },
      { id: "spider", group: "moving", tone: "mid", mat: "cloth", explode: 64, deform: [12.8, 50], prof: shellOf(spiderLine(), 0.5) },
      { id: "cone", group: "moving", tone: "hi", mat: "paper", explode: 90, prof: CONE_PROF.map(function (q) { return q.slice(); }),
        glued: function (A, B, e) { return e < 1e-3 && A[0] === 12.75 && B[0] === 12.75; } },
      { id: "surround", group: "moving", tone: "mid", mat: "rubber", explode: 112, deform: [66, 78], prof: shellOf(surroundLine(), 0.9) },
      { id: "dustcap", group: "moving", tone: "hi", mat: "paper", explode: 178, prof: shellOf(dustLine(), 0.6) },
    ].map(function (p) {
      p.prof = ccw(p.prof.map(function (q) { return [q[0], q[1], q[2] || 0]; }));
      p.rMax = Math.max.apply(null, p.prof.map(function (q) { return q[0]; }));
      return p;
    });
  }

  /* ── the renderer ──────────────────────────────────────────────────────────── */
  function create(options) {
    options = options || {};
    var AZ = options.azimuth || 38, EL = options.elevation || 34;
    var P = options.P;
    if (!P) {
      var ext = [];
      for (var i = 0; i < 24; i++) {
        var a = (i / 24) * TAU;
        ext.push([86 * Math.cos(a), 86 * Math.sin(a), 0], [86 * Math.cos(a), 86 * Math.sin(a), 86]);
      }
      P = fit(ext, 1000, 1000, 40, AZ, EL);
    }
    P._c = cam(P);
    var C = P._c;
    var V = [C.ca * C.ce, C.sa * C.ce, C.se];
    var Lr = [-C.sa, C.ca, LIGHT_UP], Ll = Math.hypot(Lr[0], Lr[1], Lr[2]);
    var L = [Lr[0] / Ll, Lr[1] / Ll, Lr[2] / Ll];
    var PHI = Math.atan2(C.sa, C.ca);
    var CUT = 45 * RAD;
    var A0 = PHI + CUT, A1 = PHI + TAU - CUT;
    var PARTS = partList();

    function stepsFor(r) { return Math.max(32, Math.min(108, Math.ceil(((A1 - A0) * r) / 3.4))); }
    PARTS.forEach(function (p) {
      p.m = stepsFor(p.rMax);
      p.cos = []; p.sin = [];
      for (var j = 0; j <= p.m; j++) {
        var t = A0 + ((A1 - A0) * j) / p.m;
        p.cos.push(Math.cos(t)); p.sin.push(Math.sin(t));
      }
      p.cm = []; p.sm = [];
      for (var j2 = 0; j2 < p.m; j2++) {
        var tm = A0 + ((A1 - A0) * (j2 + 0.5)) / p.m;
        p.cm.push(Math.cos(tm)); p.sm.push(Math.sin(tm));
      }
    });
    var byId = {};
    PARTS.forEach(function (p) { byId[p.id] = p; });

    function offsetOf(p, state) {
      var e = state.explode || 0, x = state.x || 0;
      return { dz: p.explode * e + (p.group === "moving" && !p.deform ? x : 0), x: p.deform ? x : 0 };
    }
    function liftAt(p, r, off) {
      if (!p.deform || !off.x) return off.dz;
      var w = (p.deform[1] - r) / (p.deform[1] - p.deform[0]);
      return off.dz + off.x * Math.max(0, Math.min(1, w));
    }
    function world(r, z, c, s) { return [r * c, r * s, z]; }

    function emitRevolved(p, state, out) {
      var off = offsetOf(p, state);
      var lit = (state.lit || []).indexOf(p.id) >= 0;
      var pr = p.prof, n = pr.length, m = p.m;
      var prof = pr.map(function (q) { return [q[0], q[1] + liftAt(p, q[0], off), q[2]]; });
      var vis = [], ton = [], norm = [];
      for (var k = 0; k < n; k++) {
        var A = prof[k], B = prof[(k + 1) % n];
        var dr = B[0] - A[0], dz = B[1] - A[1], len = Math.hypot(dr, dz);
        if (p.glued && p.glued(pr[k], pr[(k + 1) % n], state.explode || 0)) { vis.push("glued"); ton.push(null); norm.push(null); continue; }
        if (len < 1e-6 || (A[0] < 1e-4 && B[0] < 1e-4)) { vis.push(null); ton.push(null); norm.push(null); continue; }
        var nr = dz / len, nz = -dr / len;
        norm.push([nr, nz, len]);
        var vrow = new Array(m);
        for (var j = 0; j < m; j++) vrow[j] = nr * (p.cm[j] * V[0] + p.sm[j] * V[1]) + nz * V[2] > 1e-6;
        vis.push(vrow); ton.push(null);
      }
      /* gently curved runs take one tone normal, so band edges follow meridians instead of stair-stepping */
      var toneN = norm.map(function (q) { return q && [q[0], q[1]]; });
      for (var k0 = 0; k0 < n; ) {
        if (!norm[k0]) { k0++; continue; }
        var k1 = k0;
        while (k1 + 1 < n && norm[k1 + 1] && prof[k1 + 1][2]) k1++;
        if (k1 > k0) {
          var sr = 0, sz = 0, ok = true;
          for (var q = k0; q <= k1; q++) { sr += norm[q][0] * norm[q][2]; sz += norm[q][1] * norm[q][2]; }
          var sl = Math.hypot(sr, sz); sr /= sl; sz /= sl;
          for (var q2 = k0; q2 <= k1; q2++) if (norm[q2][0] * sr + norm[q2][1] * sz < Math.cos(24 * RAD)) ok = false;
          if (ok) for (var q3 = k0; q3 <= k1; q3++) toneN[q3] = [sr, sz];
        }
        k0 = k1 + 1;
      }
      for (var kt = 0; kt < n; kt++) {
        if (!norm[kt]) continue;
        var trow = new Array(m), tn = toneN[kt];
        for (var jt = 0; jt < m; jt++) trow[jt] = band(tn[0] * (p.cm[jt] * L[0] + p.sm[jt] * L[1]) + tn[1] * L[2]);
        ton[kt] = trow;
      }
      var cls = (lit ? "L " : "") + "p-" + p.id;
      var edgeCls = lit ? "e lit" : "e t-" + p.tone;
      for (var k2 = 0; k2 < n; k2++) {
        if (!vis[k2] || vis[k2] === "glued") continue;
        var A2 = prof[k2], B2 = prof[(k2 + 1) % n], len2 = norm[k2][2];
        var prevK = (k2 - 1 + n) % n, nextK = (k2 + 1) % n;
        var segLen = A2[2] && B2[2] ? 3.0 : 4.6;
        var nSeg = Math.max(1, Math.ceil(len2 / segLen));
        var rings = [];
        for (var s = 0; s <= nSeg; s++) {
          var t = s / nSeg;
          rings.push([A2[0] + (B2[0] - A2[0]) * t, A2[1] + (B2[1] - A2[1]) * t]);
        }
        var scr = rings.map(function (rz) {
          var row = [];
          for (var j = 0; j <= m; j++) row.push(iso(world(rz[0], rz[1], p.cos[j], p.sin[j]), P));
          return row;
        });
        var vrow2 = vis[k2], trow2 = ton[k2];
        var pv = vis[prevK], nv = vis[nextK];
        for (var s2 = 0; s2 < nSeg; s2++) {
          var j0 = 0;
          while (j0 < m) {
            if (!vrow2[j0]) { j0++; continue; }
            var j1 = j0;
            while (j1 + 1 < m && vrow2[j1 + 1] && trow2[j1 + 1] === trow2[j0] && j1 - j0 < 3) j1++;
            var lo = scr[s2], hi = scr[s2 + 1], poly = [];
            for (var j = j0; j <= j1 + 1; j++) poly.push(lo[j]);
            for (var j3 = j1 + 1; j3 >= j0; j3--) poly.push(hi[j3]);
            var tone = trow2[j0];
            var fillCls = (tone === 4 ? "f4 " : "f" + tone + " ") + cls;
            var edges = "";
            if (j0 > 0 && !vrow2[j0 - 1]) edges += path([lo[j0], hi[j0]]);
            if (j1 + 1 < m && !vrow2[j1 + 1]) edges += path([lo[j1 + 1], hi[j1 + 1]]);
            var crease = "";
            if (s2 === 0) {
              var piece = [], pieceC = [];
              for (var jj = j0; jj <= j1; jj++) {
                var sharp = !A2[2];
                var silh = pv !== "glued" && (!pv || !pv[jj]);
                if (silh) piece.push(jj); else if (sharp) pieceC.push(jj);
              }
              edges += runsPath(piece, lo);
              crease += runsPath(pieceC, lo);
            }
            if (s2 === nSeg - 1) {
              var piece2 = [], pieceC2 = [];
              for (var jk = j0; jk <= j1; jk++) {
                var sharp2 = !B2[2];
                var silh2 = nv !== "glued" && (!nv || !nv[jk]);
                if (silh2) piece2.push(jk); else if (sharp2) pieceC2.push(jk);
              }
              edges += runsPath(piece2, hi);
              crease += runsPath(pieceC2, hi);
            }
            var jm = Math.floor((j0 + j1 + 1) / 2);
            var rm = (rings[s2][0] + rings[s2 + 1][0]) / 2, zm = (rings[s2][1] + rings[s2 + 1][1]) / 2;
            var dpt = depth(world(rm, zm, p.cos[jm], p.sin[jm]), P) + (p.bias || 0);
            var svg = '<path class="' + fillCls + '" d="' + path(poly, true) + '"/>';
            if (crease) svg += '<path class="c' + (lit ? " lit" : "") + '" d="' + crease + '"/>';
            if (edges) svg += '<path class="' + edgeCls + '" d="' + edges + '"/>';
            out.push([dpt, svg]);
            j0 = j1 + 1;
          }
        }
      }
    }
    function runsPath(list, row) {
      if (!list.length) return "";
      var d = "", start = list[0], prev = list[0];
      for (var i = 1; i <= list.length; i++) {
        if (i < list.length && list[i] === prev + 1) { prev = list[i]; continue; }
        var pts = [];
        for (var j = start; j <= prev + 1; j++) pts.push(row[j]);
        d += path(pts);
        if (i < list.length) { start = list[i]; prev = list[i]; }
      }
      return d;
    }

    /* rings drawn on a revolved surface, cut per facet so they depth-sort with it */
    function emitRing(p, state, r, z, nr, nz, cls, out, bias, style) {
      var off = offsetOf(p, state);
      var zz = z + liftAt(p, r, off);
      var m = p.m, run = [];
      function flush() {
        if (run.length < 1) return;
        var pts = [];
        for (var j = run[0]; j <= run[run.length - 1] + 1; j++) pts.push(iso(world(r, zz, p.cos[j], p.sin[j]), P));
        var jm = run[Math.floor(run.length / 2)];
        out.push([depth(world(r, zz, p.cos[jm], p.sin[jm]), P) + (bias || 0.02), '<path class="' + cls + '"' + (style ? ' style="' + style + '"' : "") + ' d="' + path(pts) + '"/>']);
        run = [];
      }
      for (var j = 0; j < m; j++) {
        var v = nr * (p.cm[j] * V[0] + p.sm[j] * V[1]) + nz * V[2] > 1e-6;
        if (v) { run.push(j); if (run.length >= 4) flush(); } else flush();
      }
      flush();
    }

    /* convex boxes (basket spokes, terminal strip), faces cut along their length */
    function emitBox(corners, tone, mat, cls, out, pieces) {
      var faces = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
      var cen = [0, 0, 0];
      corners.forEach(function (c) { cen[0] += c[0] / 8; cen[1] += c[1] / 8; cen[2] += c[2] / 8; });
      faces.forEach(function (f) {
        var a = corners[f[0]], b = corners[f[1]], c = corners[f[2]], d = corners[f[3]];
        var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
        var nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        var fc = [(a[0] + c[0]) / 2 - cen[0], (a[1] + c[1]) / 2 - cen[1], (a[2] + c[2]) / 2 - cen[2]];
        if (nrm[0] * fc[0] + nrm[1] * fc[1] + nrm[2] * fc[2] < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
        var nl = Math.hypot(nrm[0], nrm[1], nrm[2]) || 1;
        nrm = [nrm[0] / nl, nrm[1] / nl, nrm[2] / nl];
        if (nrm[0] * V[0] + nrm[1] * V[1] + nrm[2] * V[2] <= 1e-6) return;
        var t = band(nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]);
        var la = Math.hypot(u[0], u[1], u[2]), lb = Math.hypot(v[0], v[1], v[2]);
        var along = la >= lb, count = Math.max(1, Math.min(pieces || 8, Math.ceil(Math.max(la, lb) / 4)));
        for (var i = 0; i < count; i++) {
          var t0 = i / count, t1 = (i + 1) / count, q;
          var lerp = function (p0, p1, tt) { return [p0[0] + (p1[0] - p0[0]) * tt, p0[1] + (p1[1] - p0[1]) * tt, p0[2] + (p1[2] - p0[2]) * tt]; };
          if (along) q = [lerp(a, b, t0), lerp(a, b, t1), lerp(d, c, t1), lerp(d, c, t0)];
          else q = [lerp(a, d, t0), lerp(b, c, t0), lerp(b, c, t1), lerp(a, d, t1)];
          var s = q.map(function (w) { return iso(w, P); });
          var e = along ? path([s[0], s[1]]) + path([s[3], s[2]]) : path([s[0], s[3]]) + path([s[1], s[2]]);
          if (i === 0) e += along ? path([s[0], s[3]]) : path([s[0], s[1]]);
          if (i === count - 1) e += along ? path([s[1], s[2]]) : path([s[3], s[2]]);
          var mid = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
          out.push([depth(mid, P), '<path class="f' + t + " " + cls + '" d="' + path(s, true) + '"/><path class="e t-' + tone + '" d="' + e + '"/>']);
        }
      });
    }
    function strapCorners(theta, a, b, width, thick) {
      var c = Math.cos(theta), s = Math.sin(theta);
      var dr = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dr, dz);
      var mr = -dz / len, mz = dr / len, hw = width / 2, ht = thick / 2;
      var tx = -s, ty = c;
      function pt(rz, side, up) {
        var r = rz[0] + mr * ht * up, z = rz[1] + mz * ht * up;
        return [r * c + tx * hw * side, r * s + ty * hw * side, z];
      }
      return [pt(a, -1, -1), pt(b, -1, -1), pt(b, 1, -1), pt(a, 1, -1), pt(a, -1, 1), pt(b, -1, 1), pt(b, 1, 1), pt(a, 1, 1)];
    }
    function shift(corners, dz) { return corners.map(function (c) { return [c[0], c[1], c[2] + dz]; }); }
    var SPOKES = [90, 180, 270].map(function (d) { return PHI + d * RAD; });
    var TERMINAL = PHI + 64 * RAD;

    function emitFrame(state, out) {
      var dz = 14 * (state.explode || 0);
      SPOKES.forEach(function (th) {
        emitBox(shift(strapCorners(th, [55.4, 36.9], [74.6, 76.4], 11, 1.5), dz), "lo", "steel", "p-basket", out, 10);
      });
      var c = Math.cos(TERMINAL), s = Math.sin(TERMINAL), tx = -s, ty = c;
      function box(r0, r1, w0, w1, z0, z1) {
        var q = [];
        [[r0, w0], [r1, w0], [r1, w1], [r0, w1]].forEach(function (rw) { q.push([rw[0] * c + tx * rw[1], rw[0] * s + ty * rw[1], z0 + dz]); });
        [[r0, w0], [r1, w0], [r1, w1], [r0, w1]].forEach(function (rw) { q.push([rw[0] * c + tx * rw[1], rw[0] * s + ty * rw[1], z1 + dz]); });
        return [q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7]];
      }
      emitBox(box(48.2, 53.4, -6, 6, 29.6, 34.6), "mid", "plastic", "p-terminal", out, 3);
      [-3.2, 2.2].forEach(function (w) { emitBox(box(53.4, 58.2, w, w + 1, 31.4, 32.4), "mid", "steel", "p-terminal", out, 2); });
    }

    function sectionFaces(state, out) {
      [A0, A1].forEach(function (a, side) {
        var c = Math.cos(a), s = Math.sin(a);
        PARTS.forEach(function (p) {
          var off = offsetOf(p, state);
          var lit = (state.lit || []).indexOf(p.id) >= 0;
          var pts = p.prof.map(function (q) { return iso(world(q[0], q[1] + liftAt(p, q[0], off), c, s), P); });
          out.push('<path class="cut m-' + p.mat + " s" + side + (lit ? " L" : "") + '" d="' + path(pts, true) + '"/>' +
            '<path class="' + (lit ? "e lit" : "e t-" + p.tone) + '" d="' + path(pts, true) + '"/>');
        });
      });
    }

    /* the winding seen in section: 2 layers of wire, current marks per side */
    function wireDots(state, out) {
      var p = byId.coil, off = offsetOf(p, state), cur = state.current || 0;
      var pitch = (COIL.z1 - COIL.z0) / COIL.turns, rw = 0.15;
      [A0, A1].forEach(function (a, side) {
        var c = Math.cos(a), s = Math.sin(a), d = "";
        for (var l = 0; l < COIL.layers; l++) {
          var r = COIL.rIn + ((l + 0.5) * (COIL.rOut - COIL.rIn)) / COIL.layers;
          for (var i = 0; i < COIL.turns; i++) {
            var z = COIL.z0 + (i + 0.5) * pitch + off.dz;
            var q = iso(world(r, z, c, s), P);
            d += "M" + f1(q[0] - 0.01) + " " + f1(q[1]) + "h0.02";
          }
        }
        var heat = Math.abs(cur) > 0.02 ? " on" : "";
        out.push('<path class="wire' + heat + '" style="stroke-width:' + (rw * 2 * P.scale * UNIT).toFixed(2) + "px;" + (heat ? "opacity:" + (0.35 + 0.65 * Math.min(1, Math.abs(cur))).toFixed(2) : "") + '" d="' + d + '"/>');
      });
    }

    /* the magnetic circuit on both cut faces: magnet → plate → gap → pole → yoke */
    function fieldLines(state, out, late) {
      var f = state.field || 0;
      if (f <= 0.001) return;
      var e = state.explode || 0;
      if (e > 0.02) return;
      var phase = state.fieldPhase || 0;
      [A0, A1].forEach(function (a) {
        var c = Math.cos(a), s = Math.sin(a), loops = "", gaps = "";
        [0, 1, 2].forEach(function (i) {
          var rm = 27 + i * 5.6, zt = 22.4 + i * 1.6, zb = 4.6 - i * 1.4, rp = 9.6 - i * 2.2;
          var pts = [[rm, 9], [rm, zt], [GAP.plate, zt]];
          loops += path(pts.map(function (q) { return iso(world(q[0], q[1], c, s), P); }));
          var back = [[GAP.pole, zt], [rp, zt], [rp, zb], [rm, zb], [rm, 9]];
          loops += path(back.map(function (q) { return iso(world(q[0], q[1], c, s), P); }));
        });
        for (var g = 0; g < 5; g++) {
          var zg = GAP.z0 + 0.6 + g * 1.2;
          gaps += path([[GAP.plate, zg], [GAP.pole, zg]].map(function (q) { return iso(world(q[0], q[1], c, s), P); }));
        }
        out.push('<path class="field" style="opacity:' + f.toFixed(3) + ";stroke-dashoffset:" + (-phase).toFixed(2) + '" d="' + loops + '"/>');
        late.push('<path class="gapline" style="opacity:' + f.toFixed(3) + '" d="' + gaps + '"/>');
      });
    }

    /* winding turns on the coil's outer face, and the current running round them */
    function coilTexture(state, out) {
      var p = byId.coil, pitch = (COIL.z1 - COIL.z0) / 12;
      for (var i = 1; i < 12; i++) emitRing(p, state, COIL.rOut, COIL.z0 + i * pitch, 1, 0, "c t-hi", out, 1);
      var cur = state.current || 0;
      if (Math.abs(cur) > 0.02) {
        var style = "opacity:" + Math.min(1, Math.abs(cur)).toFixed(2);
        for (var k = 0; k < 4; k++) emitRing(p, state, COIL.rOut + 0.05, COIL.z0 + 1.5 + k * 3, 1, 0, "current", out, 1.2, style);
      }
    }
    function coneTexture(state, out) {
      var p = byId.cone;
      [26, 38, 50, 60].forEach(function (r) {
        var t = (r - CONE.r0) / (CONE.r1 - CONE.r0), slope = (CONE.z1 - CONE.z0) / (CONE.r1 - CONE.r0) - (2.8 * Math.PI * Math.cos(Math.PI * t)) / (CONE.r1 - CONE.r0);
        var l = Math.hypot(1, slope);
        emitRing(p, state, r, coneZ(r) + 0.46, -slope / l, 1 / l, "c t-faint", out, 2.5);
      });
    }
    function holes(state, out) {
      var dz = 14 * (state.explode || 0), z = FLANGE_TOP + 1.4 + dz;
      [135, 225, 315, 45].forEach(function (deg) {
        var a = PHI + deg * RAD;
        if (Math.cos(a - PHI) > Math.cos(CUT)) return;
        var cx = 84 * Math.cos(a), cy = 84 * Math.sin(a), pts = [];
        for (var i = 0; i < 20; i++) { var t = (i / 20) * TAU; pts.push(iso([cx + 1.4 * Math.cos(t), cy + 1.4 * Math.sin(t), z], P)); }
        out.push([depth([cx, cy, z], P) + 0.05, '<path class="hole" d="' + path(pts, true) + '"/>']);
      });
      var zb = 29.5 + dz;
      [180, 90, 270].forEach(function (deg) {
        var a = PHI + deg * RAD + 0.42;
        var q = iso([38 * Math.cos(a), 38 * Math.sin(a), zb], P);
        out.push([depth([38 * Math.cos(a), 38 * Math.sin(a), zb], P) + 0.05, '<path class="screw" d="M' + f1(q[0] - 0.01) + " " + f1(q[1]) + 'h0.02"/>']);
      });
    }

    /* air above the cone in the two cut planes: a plane wave ξ = X·sin(ωt − k(z − z0)) */
    function air(state, out) {
      var a = state.air;
      if (!a || !(a.on > 0.001)) return;
      var lambda = a.lambda || 40, amp = a.amp == null ? 5 : a.amp, ph = a.phase || 0;
      var z0 = 80, z1 = a.top || 250, k = TAU / lambda, x = state.x || 0, step = a.step || 5;
      var front = a.front == null ? 1e9 : a.front;
      [A0, A1].forEach(function (ang) {
        var c = Math.cos(ang), s = Math.sin(ang), d = "";
        var minZ = a.minZ == null ? 86 : a.minZ;
        var clipY = REST_TOP + iso([0, 0, x], P)[1] - iso([0, 0, 0], P)[1] - (a.margin == null ? 14 : a.margin);
        for (var r = 3; r <= 80; r += step) {
          var floor = coneZ(Math.min(CONE.r1, Math.max(r, CONE.r0))) + 1.6 + x;
          if (r < 20.5) floor = coneZ(20.5) + 0.75 + 8.2 * Math.sqrt(Math.max(0, 1 - (r * r) / (20.5 * 20.5))) + 1.6 + x;
          if (r > CONE.r1) floor = SUR.z + SUR.R + 1.6 + x;
          var rest = floor - x;
          for (var z = z0 - 60; z <= z1; z += step) {
            if (z < minZ) continue;
            var xi;
            if (a.xOf) xi = a.xOf(a.t - Math.max(0, z - rest) / (a.c || 32));
            else xi = amp * Math.sin(ph - k * (z - z0)) * Math.min(1, Math.max(0, front - (z - z0)) / 12);
            if (z + xi < floor) continue;
            var q = iso(world(r, z + xi, c, s), P);
            if (q[1] > clipY) continue;
            d += "M" + f1(q[0] - 0.01) + " " + f1(q[1]) + "h0.02";
          }
        }
        out.push('<path class="air" style="opacity:' + a.on.toFixed(3) + '" d="' + d + '"/>');
      });
    }

    function halo(state) {
      var dz = -60 * (state.explode || 0), pts = [];
      for (var i = 0; i < 48; i++) { var t = (i / 48) * TAU; pts.push(iso([47 * Math.cos(t), 47 * Math.sin(t), dz - 0.5], P)); }
      var pts2 = [];
      for (var j = 0; j < 48; j++) { var t2 = (j / 48) * TAU; pts2.push(iso([84 * Math.cos(t2), 84 * Math.sin(t2), 14 * (state.explode || 0) + 30], P)); }
      return '<path class="halo" d="' + path(pts, true) + '"/>' + ((state.explode || 0) > 0.05 ? "" : '<path class="halo soft" d="' + path(pts2, true) + '"/>');
    }

    function render(state) {
      state = state || {};
      var list = [];
      PARTS.forEach(function (p) { emitRevolved(p, state, list); });
      emitFrame(state, list);
      coilTexture(state, list);
      coneTexture(state, list);
      holes(state, list);
      list.sort(function (a, b) { return a[0] - b[0]; });
      var top = [];
      sectionFaces(state, top);
      var late = [];
      fieldLines(state, top, late);
      wireDots(state, top);
      top.push.apply(top, late);
      air(state, top);
      return halo(state) + list.map(function (x) { return x[1]; }).join("") + top.join("");
    }

    function bounds(state) {
      state = state || {};
      var xs = [], ys = [];
      PARTS.forEach(function (p) {
        var off = offsetOf(p, state);
        for (var i = 0; i < 16; i++) {
          var t = A0 + ((A1 - A0) * i) / 15;
          p.prof.forEach(function (q) {
            var s = iso(world(q[0], q[1] + liftAt(p, q[0], off), Math.cos(t), Math.sin(t)), P);
            xs.push(s[0]); ys.push(s[1]);
          });
        }
      });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    var REST_TOP = bounds({}).y;
    function point(r, z, side) { return iso(world(r, z, Math.cos(side ? A1 : A0), Math.sin(side ? A1 : A0)), P); }

    return { P: P, render: render, bounds: bounds, point: point, parts: PARTS.map(function (p) { return p.id; }), facts: { coil: COIL, gap: GAP, cone: CONE } };
  }

  /* camera = { cx, cy, w } in rig units; height follows the svg's aspect */
  function mount(svg, rig, aspect) {
    var last = "";
    return function draw(state, cam) {
      var h = cam.w * aspect;
      var vb = (cam.cx - cam.w / 2).toFixed(2) + " " + (cam.cy - h / 2).toFixed(2) + " " + cam.w.toFixed(2) + " " + h.toFixed(2);
      var key = JSON.stringify(state);
      svg.setAttribute("viewBox", vb);
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

  root.Speaker = { create: create, mount: mount, fitCamera: fitCamera, drive: drive, seg: seg, mixCam: mixCam, clamp01: clamp01 };
})(typeof window !== "undefined" ? window : globalThis);
