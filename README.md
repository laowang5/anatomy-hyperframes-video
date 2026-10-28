# Anatomy × HyperFrames Video Engine

<p align="center">
  <b>Code-First Engineering Anatomy & Isometric Video Generation Engine</b><br>
  <sub>Turn technical teardown scripts into precision 1080P animated explainer videos via code, SVGs, and acoustic time-alignment.</sub>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> •
  <a href="#core-features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#cli-reference">CLI Reference</a> •
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

### 1. Prerequisites

Make sure you have installed:
- **Node.js** ≥ 18.0.0
- **Python** ≥ 3.10
- **FFmpeg & FFprobe** (Available in your system PATH)
- **uv** (Recommended Python package manager) or standard `pip`

### 2. Installation & Doctor Check

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/anatomy-hyperframes-video.git
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

