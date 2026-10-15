# anatomy-explainer-video

> An Agent Skill that turns "explain how X works" into a narrated, captioned short video: an anatomy-style isometric cutaway of the device that explodes, zooms and moves in sync with the voiceover, built in HyperFrames and rendered to MP4. Mandarin voiceover by default, English supported.

把"讲解某个器件/机构的工作原理"做成一支带配音和字幕的短视频。画面是 [anatomy](https://github.com/wheresryan22/anatomy) 风格的等轴测剖面图，零件会随着讲解拆解、聚焦、运动。视频用 [HyperFrames](https://github.com/heygen-com/hyperframes) 合成，最终渲染成 MP4。

![扬声器示例的成片缩略图](examples/speaker/contact-sheet.jpg)

上图是范例《扬声器怎么发声》：58.8 秒，1080×1920，7 帧，中文配音加字幕。从左到右、从上到下依次是：微距开场，爆炸图认零件，聚焦磁隙，F=B·I·L 受力，交流驱动，空气疏密形成声波，最后总结。完整源码在 [`examples/speaker/`](examples/speaker/)。

## 核心思路

**一个零件模型，多个状态。** 整支视频只有一个参数化的器件模型。每一帧只是给它换一个状态（拆解程度、位移、高亮哪个零件、电流、磁场、气流）和一个机位，状态完全由时间算出，并对齐到配音中每个短语的开始时刻。好处有三个：

- 帧与帧之间画面连续，转场像一个镜头；
- 跳到任意时间点都能正确渲染，适合 HyperFrames 的逐帧截图；
- 画面 bug 只需在一处修。

所以帧不是逐帧手写的，而是由一个脚本从帧规格批量生成。

## 依赖

这个 skill 负责编排流程，具体能力来自下面几个 skill。它们必须**和本 skill 装在同一个 skills 目录下**，因为脚本按相对路径（`../faceless-explainer/scripts` 等）找它们。

| Skill | 提供什么 |
|---|---|
| [anatomy](https://github.com/wheresryan22/anatomy) | 等轴测画法：相机、四档光影、画家排序、剖面规则、截图脚本 |
| [hyperframes](https://github.com/heygen-com/hyperframes) 套件：`hyperframes`、`faceless-explainer`、`hyperframes-creative`、`hyperframes-animation`、`media-use` 等 | 项目结构、设计预设、配音（Kokoro）、字幕、转场、检查与渲染 |

运行环境：

- **Node.js 22 或更新**（脚本用到内置 `fetch`；`npx skills` 也要求较新的 Node）
- **ffmpeg / ffprobe** 在 PATH 中（`deliver.mjs` 生成缩略图总览时用到）
- **Chrome 或 Chromium**（HyperFrames 截图、渲染和 anatomy 截图脚本用到）
- 网络：首次运行时，HyperFrames 会下载 Kokoro 语音模型；`cjk-fonts.mjs` 会从 Google Fonts 下载中文字体子集

不需要任何 API Key。离线时配音走本地 Kokoro。

## 安装

用 [`skills`](https://github.com/vercel-labs/skills) CLI 装到用户级目录（`-a` 换成你用的 agent，例如 `claude-code`、`codex`、`cursor`）：

```bash
npx skills add wheresryan22/anatomy -g -a claude-code
npx skills add heygen-com/hyperframes --skill '*' -g -a claude-code
npx skills add cloudycliff/anatomy-video-skill -g -a claude-code
```

或者用 git 克隆到 skills 目录（以 Cursor 为例，Claude Code 是 `~/.claude/skills/`）：

```bash
cd ~/.cursor/skills
git clone https://github.com/wheresryan22/anatomy.git anatomy
git clone https://github.com/cloudycliff/anatomy-video-skill.git anatomy-explainer-video
npx skills add heygen-com/hyperframes --skill '*' -g -a cursor
```

装好后确认这几个目录是同级的：

```text
skills/
├── anatomy/
├── anatomy-explainer-video/
├── faceless-explainer/
├── hyperframes/
├── hyperframes-creative/
└── …
```

## 使用

直接对 agent 说，例如：

- 「做一个讲解扬声器工作原理的视频，大约 1 分钟」
- 「用 anatomy 做个视频，讲直流电机怎么转起来」
- "Make a 45-second video explaining how a disc brake works."

skill 会按 HyperFrames 的流程先确认几个选项：画幅（默认 9:16）、配音加字幕、浅色主题、是否审分镜、自动还是协作模式，然后依次完成：

1. **因果链**：把原理拆成 5–8 个环节，每个环节都对应器件上一个看得见的变化
2. **设计与字体**：套用 `code-editorial` 预设，准备中英文字体
3. **分镜与脚本**：一帧对应一个环节、一次状态变化
4. **配音**：`fit-voice.mjs` 自动调语速，让总时长贴近目标
5. **零件模型**：从模板起步建模，用预览图逐项检查
6. **帧**：按配音中每个短语的时间写帧规格，批量生成
7. **重建与校验**：一条命令重建，包括零件模型体检、lint、按台词截图和 check
8. **预览、确认、渲染、交付**

完整流程和每一步的通过标准见 [`SKILL.md`](SKILL.md)。

## 目录结构

```text
SKILL.md                 主流程（agent 读这个）
scripts/                 直接运行的脚本
templates/               复制进项目后修改的模板
references/
  rig-contract.md        零件模型的接口、状态、跳帧安全、绘制修复、性能预算
  pitfalls.md            踩过的坑和对应修法
examples/speaker/        扬声器范例的完整源码、脚本、分镜和成片缩略图
```

### 脚本

都在项目根目录（`videos/<project>/`）下运行：`node <skill>/scripts/<name>.mjs`。

| 脚本 | 作用 |
|---|---|
| `fit-voice.mjs` | 自动调 Kokoro 语速，让配音总时长落在目标 ±3% 内，保留最接近的一版 |
| `zh-voice.mjs` | 中文配音：整句合成，按真实停顿对齐短语时间，切好字幕分组，写出 `audio_meta.json`；`--say` 修正多音字 |
| `rebuild.mjs` | 按正确顺序重建全部产物：零件模型打包、生成帧、模型体检、字幕、合成 index、转场 |
| `rig-health.mjs` | 在沙箱里跑每一帧的真实动画，检查面片预算、NaN、渲染一致性和机位，不通过时退出码为 1 |
| `cue-snapshots.mjs` | 按每句台词的开始时间截图，再加每帧中点，输出台词与截图的对照表 `cues.json` |
| `deliver.mjs` | 渲染后读出时长，生成缩略图总览，写出带帧 id 表的 `renders/DELIVERY.md` |
| `stage-fonts.mjs` | 把设计预设的英文字体复制进项目 |
| `cjk-fonts.mjs` | 只下载视频里实际用到的汉字，生成中文字体子集 |
| `patch-captions.mjs` | 给字幕层补上中文字体 |
| `bundle-rig.mjs` | 把零件模型的 CSS 打包进 JS，每帧只需加载一个文件 |

### 模板

| 模板 | 复制到 |
|---|---|
| `templates/rig.js`、`rig.css` | `assets/rig/`：零件模型骨架（投影、光影、排序、运行时辅助函数） |
| `templates/frame-shell.mjs` | `tools/frames/common.mjs`：每帧共用的外壳（字体、背景、标题、图区、读数卡） |
| `templates/build-frames.mjs` | `tools/frames/build.mjs`：帧规格生成器 |
| `templates/preview-rig.mjs` | `tools/preview-rig.mjs`：把各个状态渲染到一张预览图 |

## 已知局限

- **零件模型仍需针对器件编写。** 旋转对称的器件（扬声器、电机转子、阀门、轴承）可以直接复用范例里的四分之一剖切画法。结构复杂、非对称的器件，建模工作量会大不少，这一步也最考验 agent 的能力。
- **中文字幕的时间来自停顿检测**，不是逐字识别，对齐精度到短语级。英文项目走 faceless-explainer 自带的转写流程。
- **性能预算是按一个项目校准的**：7 帧的扬声器视频在约 6.9k 面片时通过了 check，在 9.8k 时超时。换机器或换帧数时，可以用 `rig-health.mjs --max-paths` 调整。
