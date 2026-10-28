# Anatomy × HyperFrames Video Engine

<p align="center">
  <b>Code-First Engineering Anatomy & Isometric Video Generation Engine</b><br>
  <sub>Turn technical teardown scripts into precision 1080P animated explainer videos via code, SVGs, and acoustic time-alignment.</sub>
</p>

<p align="center">
  <b>English</b> •
  <a href="README_zh.md">简体中文</a>
</p>

<p align="center">
  <a href="#-what-is-this">Overview</a> •
  <a href="#-upstream-foundations-hyperframes--anatomy">Foundations</a> •
  <a href="#-demo-showcase">Demo Showcase</a> •
  <a href="#-core-features">Features</a> •
  <a href="#%EF%B8%8F-architecture-topology">Architecture</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-cli-reference">CLI Reference</a> •
  <a href="THIRD_PARTY_NOTICES.md">Third-Party Notices</a> •
  <a href="LICENSE">License</a>
</p>

---

## 🌟 What is this?

Traditional motion graphics and 3D teardown videos (Blender, Cinema 4D, After Effects) suffer from a critical flaw: **brittle iteration**. When a voiceover line changes by half a second, engineers must manually keyframe and stretch dozens of animation tracks across multiple layers.

**Anatomy-HyperFrames** solves this with a **compiler-driven video synthesis pipeline**:
1. **Script as Single Source of Truth**: Write your technical explainer script in simple JSON.
2. **Acoustic Timeline Derivation**: The engine synthesizes audio, extracts millisecond-accurate word boundaries, and automatically deduces every scene's duration and animation trigger points.
3. **Pure Code Vector Mechanics**: High-precision isometric SVG figures (Anatomy Kit) with GSAP material-piercing animations.
4. **Deterministic Headless Rendering**: Frame-by-frame headless browser rendering through HyperFrames, fully verified against WCAG AA contrast, layout, and motion quality gates.

---

## 🧩 Upstream Foundations: HyperFrames × Anatomy

This project is built directly on top of two exceptional open-source ecosystems:

1. **[HyperFrames](https://github.com/hyperframes/hyperframes)** (*"Write HTML. Render video. Built for agents."*):
   - **Video Synthesis Host**: Provides headless Chrome offscreen frame-by-frame capture, millisecond timeline synchronization, hot-reloading Studio preview, and 1080P MP4 export.
   - **CLI Environment**: Driven by `@hyperframes/cli` (via global install, local dependency, or automatic `npx` execution).
2. **[Anatomy](https://github.com/wheresryan22/anatomy)** (*"Explain an idea by building it as a real, working object."*):
   - **Isometric Vector Geometry**: Provides parametric 3D isometric projection algorithms, face normal calculation, lighting buckets, and mechanical assembly hierarchy.
   - **Zero-Setup Embedded Kit**: The core 3D projection operators are pre-bundled in [`vendor/anatomy-kit`](vendor/anatomy-kit). For AI agent-driven coding workflows, you can also add its native skill via `npx skills add wheresryan22/anatomy`.

---

## 🎬 Demo Showcase

This repository includes a full 9-scene custom mechanical keyboard teardown benchmark. Below is the full 1080P video generated purely via code and vector SVGs (playable directly in GitHub):

https://github.com/user-attachments/assets/edd718c8-c0b7-4a1f-b5f8-50cfa9c46c7a

> 💡 *Showcase: Isometric layer-by-layer explosion, switch actuation mechanics, Hall-effect magnetic sensor simulation, and acoustic word-boundary alignment.*

---

## ⚡ Core Features

- 📐 **Vector Isometric Assemblies**: Parametric 3D-like isometric projection with shadow/lighting buckets, custom frustums, and real-time material shaders.
- 🎙️ **Dual-Track Acoustic Alignment**:
  - **Preview**: Edge-TTS (`zh-CN-YunxiNeural`) for instant, zero-cost drafting with millisecond-level `WordBoundary` timestamps.
  - **Production**: High-fidelity commercial voice synthesis with elastic timestamp scaling.
- 🗣️ **Decoupled Heteronym System**: Multi-level pronunciation override dictionary (Project-level `project.json` / `pronunciation.json`) ensuring 100% phonetic accuracy without polluting on-screen subtitles.
- 🔒 **Physical Sandbox Isolation**: Multi-tenant architecture (`projects/<name>`). Every video project is strictly self-contained with independent assets, timelines, and renders.
- 🛡️ **Multi-Axis Quality Gate**: Automated linting, runtime evaluation, WCAG AA 4.5:1 text contrast checks, and motion safety auditing.
- 🎬 **Multi-Platform Poster Engine**: Automated 4:3 safe-area and 16:9 blurred-wings cover synthesis with container-level MP4 `attached_pic` metadata injection.

---

## 🏗️ Architecture Topology

```text
anatomy-hyperframes-video/
├── core/                                 # 🌟 Universal Engine (Domain-Neutral)
│   ├── config.mjs                        # Dynamic Chrome path resolver & lock cleaner
│   ├── tts/engine.py                     # Dual-track TTS & pronunciation alignment engine
│   ├── generator/compiler.mjs            # Declarative scene compiler & timeline builder
│   └── styles/lib.mjs                    # Isometric shader library & frustum algorithms
├── bin/
│   └── video.mjs                         # 🌟 Master CLI Orchestrator (hyper-video)
├── vendor/
│   └── anatomy-kit/                      # Embedded isometric geometry projection kit
├── projects/                             # 🌟 Isolated Video Sandboxes
│   ├── _template/                        # Minimal reproducible starter template
│   └── mechanical-keyboard/              # Benchmark: 9-scene mechanical keyboard anatomy
├── package.json                          # Node.js project manifest & bin linking
└── pyproject.toml / requirements.txt     # Python audio alignment dependencies
```

---

## 🚀 Quickstart

### 1. Prerequisites & Environment Setup

Before getting started, make sure you have the following environments installed:

1. **Core Toolchain**:
   - **Node.js** ≥ 18.0.0
   - **Python** ≥ 3.10
   - **FFmpeg & FFprobe** (Configured in your system PATH)
   - **uv** (Recommended Python package manager) or standard `pip`

2. **HyperFrames Video Renderer**:
   This project relies on `@hyperframes/cli` for browser timeline orchestration and frame-by-frame rendering:
   ```bash
   # Install HyperFrames CLI globally (Recommended)
   npm install -g hyperframes
   
   # Or let the engine invoke it via npx on first run
   ```
   > 💡 **Headless Chrome**: On your first `check` or `render`, HyperFrames will automatically download the matching `chrome-headless-shell` binary into your local cache (`~/.cache/hyperframes/chrome/`). You can also specify an existing browser via `HYPERFRAMES_BROWSER_PATH`.

3. **Anatomy Isometric Geometry**:
   - The core 3D isometric polygon algorithms are **pre-bundled** in [`vendor/anatomy-kit`](vendor/anatomy-kit), ready out-of-the-box.
   - For Cursor, Claude Code, or Antigravity agents, install the native skill via: `npx skills add wheresryan22/anatomy`.

---

### 2. Installation & Doctor Check

Clone the repository and install dependencies:

```bash
git clone https://github.com/laowang5/anatomy-hyperframes-video.git
cd anatomy-hyperframes-video

# Install Python audio dependencies
uv pip install -r requirements.txt
# (or: pip install -r requirements.txt)

# Run environment health check
node bin/video.mjs doctor
```

A healthy environment output will look like:
```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🩺 Anatomy-HyperFrames Video Environment Doctor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Node.js           : v24.13.0
  ✅ Python 3          : 3.14.6
  ✅ uv (Package Mgr)  : 0.12.17
  ✅ FFmpeg            : ffmpeg version 9.0.1
  ✅ FFprobe           : ffprobe version 9.0.1
  ✅ HyperFrames CLI   : @hyperframes/cli ready
  ✅ Chrome Headless   : .../chrome-headless-shell.exe
  ✅ Python Modules    : edge-tts & requests ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 3. Build & Render Your First Video (30 Seconds)

Build the starter template project:

```bash
# Step 1: Synthesize voice, compile scenes, and run quality checks
node bin/video.mjs build --project _template

# Step 2: Render to 1080P MP4
node bin/video.mjs render --project _template
```

Your rendered video will be available at:
`projects/_template/renders/_template.mp4`

---

## 📖 CLI Reference

The master CLI orchestrator can be invoked via `node bin/video.mjs` or `npm run <command>`:

| Command | Usage | Description |
| :--- | :--- | :--- |
| `doctor` | `node bin/video.mjs doctor` | Audits system tools, Node, Python, and Chrome status. |
| `build` | `node bin/video.mjs build -P <name>` | Runs full pipeline: voice synthesis → SVG figures → HTML compilation → Quality gate check. |
| `voice` | `node bin/video.mjs voice -P <name> [--production]` | Generates speech audio and extracts word-level timestamps. |
| `figures` | `node bin/video.mjs figures -P <name>` | Generates isometric 3D SVG figures from `geo/build-figures.mjs`. |
| `scenes` | `node bin/video.mjs scenes -P <name>` | Compiles scene compositions and root timeline HTML. |
| `check` | `node bin/video.mjs check -P <name>` | Runs HyperFrames quality gates (Lint, Runtime, Contrast, Motion). |
| `preview` | `node bin/video.mjs preview -P <name>` | Starts persistent background Studio preview server. |
| `snapshot` | `node bin/video.mjs snapshot -P <name> --at 1.5` | Captures a single validation frame at specified second. |
| `render` | `node bin/video.mjs render -P <name> [--production]` | Renders frame-by-frame 1080P MP4 video. |

> **Context Smart Inference**: If your shell is already inside `projects/<name>`, you can omit `--project <name>`. The CLI automatically deduces the current workspace sandbox!

---

## 🛠️ Creating a New Project

1. Copy the starter template:
   ```bash
   cp -r projects/_template projects/my-gadget
   ```
2. Edit `projects/my-gadget/project.json`:
   ```json
   {
     "id": "my-gadget",
     "name": "My Gadget Anatomy",
     "resolution": "landscape",
     "width": 1920,
     "height": 1080,
     "fps": 30
   }
   ```
3. Define your narration lines in `projects/my-gadget/script.json`.
4. Configure scenes in `projects/my-gadget/scenes.config.mjs`.
5. Run `node bin/video.mjs build --project my-gadget`.

---

## 📄 License & Attribution

- **License**: Released under the [MIT License](LICENSE).
- **Attributions**: See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for detailed open-source acknowledgments.

