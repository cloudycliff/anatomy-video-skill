# Rig contract

The rig is the one drawing of the device that every frame shares. Frames differ only in the
**state** they pass and the **camera** they look through. Build it once, verify it on a preview
sheet, and only then write frames.

## API

```js
Rig.create(options?)        // → rig; options: { azimuth = 38, elevation = 34, P? }
rig.render(state)           // → SVG markup string (pure, synchronous)
rig.bounds(state)           // → { x, y, w, h } of the drawn parts, in viewBox units
rig.point(...)              // → [x, y] screen point of a named world feature (for callouts)
Rig.mount(svg, rig, aspect) // → draw(state, camera); sets viewBox every call, re-renders only when state changes
Rig.fitCamera(bounds, aspect, pad) // → camera that frames those bounds
Rig.drive(tl, DUR, fn)      // seek-safe driver: fn(t) runs on every timeline render
Rig.seg(ease)               // → (t, a, b) => eased 0..1 progress over [a, b]
Rig.mixCam(a, b, p)         // camera blend; zoom interpolates in log space
```

- **Coordinates.** Model in real units (mm). `create` fits the device's resting envelope into a
  1000-unit square; everything after that is in those viewBox units. Write camera presets
  (`CAM` in `common.mjs`) as `{ cx, cy, w }` in viewBox units, with height = `w * ASPECT`.
- **Strokes** use `vector-effect: non-scaling-stroke`, so line weights stay the same when the camera zooms in.
  Dots that represent a physical size (wire cross-sections) opt out (`vector-effect: none`) and
  compute their width from `P.scale`.

## State

State is a plain object, JSON-serialisable (`mount` diffs it with `JSON.stringify`). Typical keys:

| key | meaning |
| --- | --- |
| `explode` | 0..1, each part moves by its own `explode` distance along the assembly axis |
| `lit` | ids of the parts the narration is naming: darker edges (`e lit`), `L` fill ramp |
| motion (`x`, `angle`, …) | the mechanism's degree of freedom, in world units |
| overlays (`current`, `field`, `air`, …) | 0..1 opacities plus their own parameters |

Functions are allowed inside nested overlay objects (the speaker's `air.xOf`) because
`JSON.stringify` drops them; then the overlay must also carry `t` so the key changes.

## Driving it from the timeline

The HyperFrames runtime seeks the paused GSAP timeline, sometimes with `suppressEvents: true`.
`onUpdate` callbacks and `call()` markers are then **skipped**. The only reliable hook is a
tween on a function-valued property, which GSAP invokes as a setter on every render, and that is what `Rig.drive` does.

Inside the driver everything is a pure function of `t`:

```js
R.drive(tl, DUR, function (t) {
  var e = inOut(t, 0.2, 2.4);                     // segment progress, eased
  var lit = []; groups.forEach(function (g) { if (t >= g[0]) lit = g[1]; });
  draw({ explode: e, lit: lit }, R.mixCam(START, CAM.exploded, e));
  $("readout").textContent = value(t).toFixed(1); // DOM readouts too
});
```

- Text and cards use ordinary `tl.fromTo` tweens (they are seek-safe). Use `immediateRender: false` on
  any fade that starts later than another tween on the same element.
- Periodic motion: write `x(t)` in closed form, e.g. `amp(t) * sin(2π f t)`. Do not integrate it step by step.
- A wave that travels away from the source uses retarded time: the displacement at distance `d` is
  `x(t − d / c)`. The source's history then propagates exactly, and a seek to any `t` is still correct.
- Cross-frame continuity: frame N's end camera/state must equal frame N+1's start. Name both
  (`END` in N, `START` in N+1) with identical literals.

## Drawing rules that bit in practice

Read the anatomy skill's `references/craft.md` for the full rules. These are the video-specific consequences:

- **Painter's order.** Emit every solid facet as `[depth, svg]` into one list and sort it once. Draw
  overlays (section faces, flow lines, wire dots, particles) after the sorted list, in
  a fixed order. Anything that must read on top of the coil/wires goes in a `late` list drawn last.
- **Revolved parts** (speakers, motors, valves, bearings): revolve the half-section over 270° and
  remove the 90° wedge that faces the viewer (`A0 = PHI + 45°`, `A1 = PHI + 315°`). Both cut planes
  then face the camera and nothing can stand in front of them. Draw section faces after all
  facets.
- **Glued faces.** Two parts sharing a surface (a coil on its former, a cone on its neck) produce
  coincident facets that z-fight into black dashes. Mark those profile segments `glued`: skip them,
  and treat them as creases rather than silhouettes for the neighbouring segments. Give the inner part a
  small depth `bias`.
- **Rings and textures on a surface** (winding turns, cone ribs, current marks): cut them per facet
  and push each piece into the sorted list with a bias of 1–2.5. A single long path drawn on
  top would show through solids in front of it.
- **Tone bands.** Use four tones, with thresholds `[0, .2, .42, .62]` on N·L. Average the normal over gently
  curved runs (spread < 24°), so band edges follow the meridians and don't stair-step.
- **Particles** (air, fluid): draw zero-length subpaths `M x y h0.02` with round caps, so one path holds
  all the dots. Clip them to the region in front of the source (the speaker skips dots below the
  rim's screen y), or they print over the solid.

## Performance budget

`hyperframes check` must finish inside its deadline. With seven frames at about 30 fps it timed out at about
9.8k paths per render and passed at about 6.8k.
- Cap the segments per revolution (`stepsFor(r)` clamped to 32–108).
- Merge runs of same-tone facets (up to 4 steps).
- Use longer segments on straight profile runs.
- Measure with `scripts/rig-health.mjs`. It samples every frame's real timeline, and `rebuild.mjs` runs it automatically. The hard gate is 7.5k paths per render. Render time only warns above 60 ms, since it depends on the machine; the speaker video ran at about 30–40 ms.

## Verifying the rig before frames exist

1. `node tools/preview-rig.mjs` renders every state the storyboard needs to one sheet.
2. Screenshot it with the anatomy `capture.mjs` (`--select` for one cell, `--zoom` for a close-up).
3. Check for:
   - see-through or dashed edges, which come from sort errors or glued faces;
   - stair-stepped tone bands;
   - parts poking through the cut planes;
   - lit parts that don't read as lit;
   - overlays hidden under solids.
4. Read the camera presets off `bounds(state)` in the log output, not by eye.
