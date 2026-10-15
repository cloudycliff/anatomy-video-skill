# Example: 扬声器怎么发声 (how a loudspeaker works)

This example is a 58.8 s, 1080×1920 video in 7 frames, with a Mandarin voiceover (Kokoro `zf_xiaobei` at speed 1.35), CJK captions and no BGM.
It uses the code-editorial preset with the anatomy light theme. `contact-sheet.jpg` shows one still every 4.2 s of the final render.

| File here | Lived in the project at | Template it corresponds to |
| --- | --- | --- |
| `speaker.js` | `assets/speaker/speaker.js` (global `Speaker`) | `templates/rig.js` |
| `speaker.css` | `assets/speaker/speaker.css` (class `.spk`) | `templates/rig.css` |
| `common.mjs` | `tools/frames/common.mjs` | `templates/frame-shell.mjs` |
| `build.mjs` | `tools/frames/build.mjs` | `templates/build-frames.mjs` |
| `preview-speaker.mjs` | `tools/preview-speaker.mjs` | `templates/preview-rig.mjs` |
| `SCRIPT.md`, `STORYBOARD.md` | project root | — |

This project predates the generic names, so it uses `Speaker` and `.spk` instead of `Rig` and `.rig`.
To reuse its rebuild chain, run `rebuild.mjs --rig assets/speaker:speaker`.

Things worth copying from it:
- **The quarter-section revolve.** In `speaker.js`, look at `emitRevolved`, the `glued` predicates, `emitRing`, `sectionFaces`, and the `late` list.
- **Retarded-time air.** In `speaker.js`, `air()` takes `xOf(t − d/c)`, so the wave keeps the cone's history.
- **Camera hand-offs.** In `build.mjs`, `END` in 01 is the same literal as `START` in 02, and `CAM.exploded` takes over from there.
- **A formula that builds term by term.** Frame 04-force, with the result counting up inside the driver.
- **A live trace strip with a playhead.** Frame 05-alternating, where the current, the cone and the readout all come from one `I(t)`.
- **The landing frame.** Frame 07-landing has a smaller figure, traces that merge, a summary chain, and the final veil fade. The example shrinks the figure with a CSS override and a second `mount`; with the template, pass `fig` and `aspect` to `frame()` instead.
