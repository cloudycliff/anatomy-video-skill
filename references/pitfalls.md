# Pitfalls and fixes

Every entry here was hit while making the speaker video. Check this list before debugging from scratch.

## Composition / HyperFrames

| Symptom | Cause | Fix |
| --- | --- | --- |
| Frame styles don't apply | CSS id starts with a digit (`#01-hook-title`) | Prefix every id/class with `f01`, `f02`… and keep `data-composition-id` = frame id verbatim |
| One element animates, another freezes | Duplicate id across header and body (`#f05-head` used twice) | Ids are global per frame; name sub-parts distinctly (`f05-ph` for a playhead) |
| Rig frozen at t=0 in snapshots or render | State updated from `onUpdate` / `call()` | Use `Rig.drive`; see rig-contract.md § Driving it |
| `module is not defined` when the rig is imported in Node | Rig used `module.exports` inside an ES module | Attach to `typeof window !== "undefined" ? window : globalThis` |
| Helper silently wrong after a refactor | New helper named the same as an inner one (`fit`) | Use distinct names (`fitCamera` vs projection `fit`) |
| Fonts fall back to system serif | `build-frame.mjs` copies the preset but not its font files | `stage-fonts.mjs --preset <name>`; every family needs a local `@font-face` |
| Chinese text renders in a fallback face | Preset fonts are Latin-only | `cjk-fonts.mjs` (subset download) + CJK families in every stack |
| Caption pills in the wrong font | `captions.mjs` writes a Latin-only skin | `patch-captions.mjs` after every captions build (rebuild.mjs does it) |
| Lint: `caption_track_kind_missing` | `assemble-index` doesn't tag the captions track | rebuild.mjs adds `data-track-kind="captions"` after assembling |
| Transition timings lost after editing a frame | `transitions.mjs inject` rewrites frame files; rebuilding frames erases it | Always run the full `rebuild.mjs`, never only the frame build |
| `check_runtime_failure: Check did not finish within its deadline` | Rig too heavy per render | `rig-health.mjs` names the frame and time; cut paths per rig-contract.md § Performance. Snapshots still working is not proof it will pass |
| `check` info: `content_overlap #f04-kicker inside #f05-kicker` | Crossfade between frames | Expected; ignore |

## Rig drawing

| Symptom | Cause | Fix |
| --- | --- | --- |
| Dashed rings across a surface | Ring drawn as one path, facets sort over parts of it | Emit rings per facet into the sorted list with a bias |
| Black dash rows on a part | Coincident glued faces z-fighting | `glued` predicate + depth bias (rig-contract.md) |
| Overlay (current marks) printed over a plate in front | Overlay drawn in the late layer instead of sorted | Overlays that live on a surface belong in the sorted list |
| Gap/field lines invisible in close-up | Covered by wire dots drawn after them | Push them into a `late` list drawn after everything |
| Particles over the solid body | No screen-space clip | Skip particles below the source's silhouette y (shifted by the current displacement) |
| Close-up unreadable | Camera too tight for the 9:16 figure box | Keep about 3 recognisable features in view; widen the camera before adding callouts |

## Voice and captions (Chinese)

| Symptom | Cause | Fix |
| --- | --- | --- |
| Total length way off the target | Kokoro speed is non-linear (1.15 → 79 s, 1.3 → 69 s, 1.35 → 59 s, 1.4 → 56 s for one script) | `fit-voice.mjs`; note `--reuse` only retimes cached audio and cannot change length |
| Captions jump early or late | Phrase boundaries placed greedily on wrong pauses | zh-voice.mjs uses a monotonic DP over real pauses; tune `--chars` before touching the cost |
| Caption groups too long | `captions.mjs` groups on gaps over 0.18 s, so Chinese phrases with no gap merge | zh-voice.mjs ends the last word of a group early (`next.start − 0.2`) to force a break |
| Polyphone read wrong (弹 dàn vs tán) | Kokoro G2P picks the common reading | `--say "弹波=谈波"`: speech uses the substitute, captions keep the original |
| No word timings at all | No whisper.cpp on the machine | That is why zh-voice.mjs exists; English projects use faceless-explainer's `audio.mjs` |
