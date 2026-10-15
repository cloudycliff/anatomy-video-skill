---
format: 1080x1920
duration: 60s
message: "扬声器把电流的变化变成空气的振动：音圈在磁场里受力，推着纸盆前后运动，推出声波"
arc: concept-explainer with process
audience: 对电子/声学好奇的普通观众，没有专业背景
mode: autonomous
music: none
---

## Video direction

- **One subject, one camera.** Every frame shows the same quarter-section cutaway speaker (`assets/speaker/speaker.bundle.js`, anatomy light theme) drawn by one deterministic rig. Frames change the rig's state (explode, cone excursion, lit parts, current, field, air) and move a virtual camera (the SVG viewBox), never a different drawing. Each frame starts in the state the previous one ended in, so crossfades read as continuous.
- **Palette** (frame.md code-editorial): cream canvas, ink lines, tile for the readout card, coral as the single "voltage" accent. Coral means electricity and magnetism only: the current in the coil, the gap field, the current trace. Highlighting a part is done by lit tones and heavier ink edges, never by fading other parts.
- **Layout (portrait, all frames):** header band at the top (mono kicker `FIG. n` plus a short serif title), the figure in the middle ~55% of the canvas (y ≈ 330–1290), one hairline readout card below it (y ≈ 1300–1570); captions own everything below y = 1600. No labels, leader lines or arrows inside the drawing; names and numbers live in the card.
- **Motion grammar:** long-tail eases (power3 out for reveals and camera, power2 inOut for mechanical explode/collapse). Every reveal is cued to its spoken phrase. The camera moves only on a cue (zoom-out, push, settle), then locks. Physical motion (cone, air) is real and continuous: the cone follows the drive signal, the air follows the cone with a travel delay. It is slowed and exaggerated, and the card says so.
- **Rhythm:** frame 1 and frame 4 end on held reads; frame 3 is the quiet focus beat before the force. Frames 5 and 6 are the busiest (continuous motion), and frame 7 resolves to stillness.
- **Never:** wireframes, see-through fades, glow, gradients on content, decorative bokeh, labels in the drawing, front-loaded slides, independent floating "screensaver" motion.

## Frame 1 — 一张推空气的纸

- scene: 特写一圈正在微微起伏的纸盆和折环，镜头一路拉远，露出整只等轴测扬声器单元，标题落下
- voiceover: "你听到的每一个声音，其实都是一张纸盆，在来回推动空气。"
- duration: 5.91s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Counterintuitive claim + Concretization
- beat: curiosity + surprise
- blueprint: zoom-out-workspace-reveal

narrativeRole: 用"声音=一张纸在推空气"这个反直觉的具体画面打开好奇心，同时立起整支片子的主舞台：同一只扬声器。
keyMessage: 所有声音最后都是一个振膜在推空气。

- focal: the cone and surround of the cutaway speaker
- roles: speaker rig = foreground subject · drafting-paper hairline grid = background (very faint) · kicker / title / readout card = supporting
- sfx: none

Adapt: keep the single continuous decelerating zoom-out (signature move); the "workspace" it reveals is the whole cutaway speaker.
Scene 1 (0.0–2.3s): macro on the right-hand cut face of the cone and surround, filling the figure area; the cone quivers in small, quick strokes and a few air particles above it shiver. Kicker `FIG. 0` fades up in the header. Layered depth: grid, figure, header.
Scene 2 (2.37–4.0s): on "纸盆" one continuous decelerating zoom-out pulls back to the whole speaker, centered in the figure area; the cone lights as the camera settles. The readout card rises with a live cone-excursion value.
Scene 3 (4.06–5.91s): camera locked; on "推动空气" air particles fill the section above the cone and the first compression bands lift off it. The title "扬声器怎么发声" lands per character in the header and holds.

## Frame 2 — 剖开看结构

- scene: 同一只扬声器沿轴线分解：盆架、磁铁、T 铁、华司、音圈、弹波、纸盆、折环、防尘帽依次分开，随旁白点名逐个提亮
- voiceover: "把扬声器剖开来看：最后面是一块环形磁铁；中间悬着一圈铜线，叫音圈；音圈粘在纸盆上，纸盆靠弹波和折环，挂在盆架上。"
- duration: 10.67s
- transition_in: crossfade
- status: animated
- src: compositions/frames/02-anatomy.html
- type: product_intro
- persuasion: Progressive disclosure + Signposting
- beat: orientation + fascination

narrativeRole: 认识主角的零件。分解图让每个部件的位置和连接关系一目了然，后面所有机制都发生在这些零件之间。
keyMessage: 扬声器只有三组关键零件：磁路、音圈、纸盆和它的悬挂。

- blueprint: compose
- focal: the exploding cutaway speaker, one part lit at a time
- roles: speaker rig = foreground subject · parts index card (numbered list of five) = supporting · grid = background
- sfx: none

Scene 1 (0.0–2.4s): the assembled speaker separates along its axis (mechanical explode) while the camera eases out to fit the tall stack; kicker `FIG. 1 · 剖面` and title "五个零件" set in the header. Centered, figure ~60% of frame.
Scene 2 (2.47–3.85s): on "环形磁铁" the motor (magnet, plate, yoke) lights; index row `01 磁铁` writes into the card.
Scene 3 (3.89–6.1s): on "铜线" the coil and its former light; on "叫音圈" row `02 音圈` writes in.
Scene 4 (6.19–7.8s): on "纸盆" the cone and dust cap light; row `03 纸盆`.
Scene 5 (7.84–9.0s): on "弹波和折环" the spider and surround light; row `04 弹波 · 折环`.
Scene 6 (9.02–10.67s): on "盆架" the basket and flange light; row `05 盆架`; the full list holds, still.

## Frame 3 — 一毫米的磁隙

- scene: 部件合拢，镜头推近剖面的磁路，磁感线从华司内沿横穿磁隙到 T 铁中柱，音圈骨架悬在缝中
- voiceover: "磁铁和铁件，把磁场集中进一道约一毫米宽的环形缝隙；音圈，就悬在这道缝里。"
- duration: 7.05s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/03-gap.html
- type: feature_showcase
- persuasion: Concretization + Progressive disclosure
- beat: focus + comprehension

narrativeRole: 机制第一层：磁场在哪里。把抽象的"磁场"落到一道看得见的窄缝上。
keyMessage: 磁铁的作用是在一道窄缝里造出很强的径向磁场，音圈正好待在里面。

- blueprint: compose
- focal: the magnetic gap in the motor section, with the coil inside it
- roles: speaker rig = foreground subject · gap readout card (gap width, flux density) = supporting · grid = background
- sfx: none

Scene 1 (0.0–1.6s): the exploded stack collapses back together (mechanical), the motor parts lit; kicker `FIG. 2 · 磁路`, title "一毫米的缝".
Scene 2 (1.68–4.8s): zoom-through push into the right-hand motor section until the gap fills the figure; dotted field lines draw on through magnet, plate, gap and pole, and the gap itself glows coral. On "一毫米" the card writes `磁隙 ≈ 1.2 mm`, then `B ≈ 1 T`.
Scene 3 (4.86–7.05s): on "音圈" the coil lights inside the gap; the card adds `音圈 → 悬在缝中`. Held, quiet focus beat.

## Frame 4 — 通电就受力

- scene: 剖面特写保持，电流沿音圈导线流动（导线逐圈亮起），音圈和纸盆向前推出；画面下方出现 F = B · I · L 和算例数值
- voiceover: "电流流进音圈，导线就在磁场里受力。力等于磁场、电流、导线长度相乘：一特斯拉、六米导线、一安电流，就是六牛的推力。"
- duration: 10.91s
- transition_in: crossfade
- status: animated
- src: compositions/frames/04-force.html
- type: feature_showcase
- persuasion: Causal chain + Worked example with real numbers
- beat: "aha" + confidence

narrativeRole: 机制第二层：电变成力。用 F = BIL 和一个可以心算的例子把"受力"量化。
keyMessage: 磁场里的通电导线会受力，力 = B × I × L。

- blueprint: compose
- focal: the formula card F = B · I · L, building term by term, with the coil and cone moving above it
- roles: speaker rig (medium shot on the motor and cone) = foreground subject · formula card = foreground (second half) · grid = background
- sfx: none

Scene 1 (0.0–1.5s): camera eases back from the gap to a medium shot of motor, coil and cone; on "电流流进音圈" current switches on, so the coil section and its winding turn coral. Kicker `FIG. 3 · 受力`, title "通电就受力".
Scene 2 (1.54–3.6s): on "受力" coil, former and cone push up together (≈ 3.5 mm) and hold.
Scene 3 (3.71–6.4s): the formula assembles in the card, one term per cue: `F = B` on "磁场", `· I` on "电流", `· L` on "导线长度".
Scene 4 (6.48–9.2s): under each term its value writes in: `1 T`, `6 m`, `1 A`.
Scene 5 (9.24–10.91s): on "六牛" the result `= 6 N` counts up 0 → 6 with a coral underline, and holds.

## Frame 5 — 交流电让它来回推

- scene: 回到整只扬声器的剖面，上方一条交流电波形滚动；电流正半周音圈和纸盆前推，负半周后拉，弹波和折环随之伸缩并把纸盆拉回中位
- voiceover: "音乐信号是交流电，方向不停翻转，力也跟着翻转。音圈带着纸盆前后推拉，弹波和折环，再把它拉回中间。"
- duration: 9.91s
- transition_in: crossfade
- status: animated
- src: compositions/frames/05-alternating.html
- type: feature_showcase
- persuasion: Demonstration + Before/after
- beat: momentum + comprehension

narrativeRole: 机制第三层：力怎么变成往复运动。交流电方向翻转 → 力翻转 → 纸盆活塞运动，悬挂系统负责回中。
keyMessage: 电流方向一翻转，纸盆就换方向；弹波和折环让它始终回到中间。

- blueprint: compose
- focal: the whole cutaway speaker pumping in step with a scrolling AC trace
- roles: AC trace strip (top of figure area) = supporting foreground · speaker rig = foreground subject · current readout in card = supporting · grid = background
- sfx: none

Scene 1 (0.0–1.9s): camera eases out to the whole speaker, set in the lower part of the figure area; on "交流电" a coral sine trace draws on left to right in a strip above it. Kicker `FIG. 4 · 交流`, title "方向不停翻转".
Scene 2 (1.93–4.6s): a playhead runs along the trace; the current (coral intensity in the coil) and the card readout `I = ±…A` follow it, and its sign flips on each half cycle. The cone pushes forward on positive halves and back on negative ones.
Scene 3 (4.69–6.9s): on "前后推拉" the stroke grows; coil and cone stay lit.
Scene 4 (6.91–9.91s): on "弹波和折环" the spider and surround light as they flex; on "拉回中间" the drive fades and the cone settles back to center and holds.

## Frame 6 — 一密一疏，就是声波

- scene: 纸盆前方的空气画成一排排粒子，纸盆前推时粒子挤密、后拉时变疏，密疏带一层层向画面外传播
- voiceover: "纸盆往前，挤压空气；往后，空气变稀疏。一密一疏向外传开，就是声波。"
- duration: 6.9s
- transition_in: crossfade
- status: animated
- src: compositions/frames/06-wave.html
- type: benefit_highlight
- persuasion: Demonstration + Causal chain
- beat: fascination + "aha"

narrativeRole: 从机械运动跳到声音：纸盆的往复运动在空气里变成压缩和稀疏交替的纵波。
keyMessage: 声波就是纸盆推出来的一层层疏密变化。

- blueprint: compose
- focal: the air section above the cone, with compression bands travelling up
- roles: speaker rig + air particles = foreground subject · card (密 / 疏 tags, "示意" note) = supporting · grid = background
- sfx: none

Scene 1 (0.0–2.1s): the camera tilts up so the speaker sits low in the figure area with a tall column of air above it; air particles fill the cut planes. On "往前" the cone pushes forward and the particles just above it pack together; card tag `密 · 压缩` lights.
Scene 2 (2.14–4.0s): on "往后" the cone pulls back and a thinned band opens behind the dense one; tag `疏 · 稀疏` lights.
Scene 3 (4.02–5.9s): on "向外传开" the cone keeps oscillating and the bands travel up the column, each one leaving the cone in turn.
Scene 4 (5.9–6.9s): on "声波" the hero word "声波" sets in the header; the card notes `示意：已放慢、放大`; motion continues underneath.

## Frame 7 — 电流的形状，变成声音的形状

- scene: 左右两种振动对比：快振（音调高）和大振幅（声音响）；最后电流波形和声波波形叠成同一条曲线，收尾句落定
- voiceover: "振得越快，音调越高；推得越远，声音越响。电流的形状，就这样变成了声音的形状。"
- duration: 7.48s
- transition_in: crossfade
- status: animated
- src: compositions/frames/07-landing.html
- type: branding
- persuasion: Rule of three (频率/振幅/形状) + Distillation + Callback
- beat: clarity + "now I get it"
- blueprint: kinetic-type-beats

narrativeRole: 把频率→音调、振幅→响度两条规律落地，再用"电流的形状=声音的形状"一句话收束全片。
keyMessage: 扬声器忠实地把电信号的波形，翻译成空气的波形。

- focal: the paired current / sound-pressure traces that merge into one curve, with the small speaker above them
- roles: speaker rig (small, top) = supporting foreground · trace panel = foreground subject · rule rows + closing chain = foreground type · grid = background
- sfx: none

Adapt: keep the in-place token swap and the build to a payoff line (signature); the tokens are the two rules and the closing chain, stacked for portrait.
Scene 1 (0.0–1.7s): small speaker at the top vibrating fast with tight air bands; below it a fast trace draws; on "音调越高" the row `频率 ↑ → 音调 ↑` sets.
Scene 2 (1.77–3.4s): the speaker swings slow and wide, and the trace swaps in place to a tall slow wave; on "声音越响" row `振幅 ↑ → 响度 ↑` sets beneath.
Scene 3 (3.53–4.4s): the rows clear (hard cut) to the trace panel: coral current trace `I(t)` above, ink sound-pressure trace `p(t)` below, the same irregular music-like shape.
Scene 4 (4.43–7.48s): the two traces slide together and overlay into one curve; the closing chain `电流 → 力 → 振动 → 声波` builds token by token beneath and holds, then the whole frame settles to stillness (final frame, gentle fade allowed at the very end).
