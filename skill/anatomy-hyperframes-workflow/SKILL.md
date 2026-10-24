---
name: anatomy-hyperframes-workflow
description: Make technical explainer videos with isometric exploded-view illustrations, using Anatomy (SVG isometric geometry kit) for the artwork and HyperFrames (HTML-to-video) for the timeline, voiceover and render. Features a production-grade multi-workspace sandbox architecture where each video project is completely isolated under projects/<name>, avoiding asset collisions and cross-directory pollution. Holds the geometry API, the render contract, the work loop and every battle-tested solution this pipeline has established.
---

# Anatomy × HyperFrames (Multi-Workspace Architecture)

Anatomy draws **isometric exploded views as static SVG strings**; HyperFrames turns HTML into a frame-exact video. Together with a **core engine + multi-workspace sandbox architecture**, they power scalable, industrial-grade technical explainer video production — taking apart mechanical keyboards, active noise cancelling headphones, drones, or architectural structures layer by layer with synchronized narration and frame-exact animations.

---

## Architecture Topology

The codebase uses a strict separation between universal engine code and project-specific business assets:

```text
anatomy-hyperframes-video/
├── core/                                 # 🌟 Universal Core Engine (Zero business logic)
│   ├── config.mjs                        # Dynamic Chrome sniffing & Puppeteer temp profile locks
│   ├── tts/engine.py                     # Dual-track TTS driver + Heteronym phonetic decoupling
│   ├── generator/compiler.mjs            # Composition & root timeline compiler (38px clean subtitles)
│   └── styles/lib.mjs                    # Isometric geometry & material shader kit (matCss)
├── bin/
│   └── video.mjs                         # 🌟 Master CLI Orchestrator: Parameterized --project <name>
└── projects/                             # 🌟 Physically Isolated Video Sandboxes
    ├── _template/                        # Minimal starter template for new videos
    ├── mechanical-keyboard/              # Project 1: Mechanical Keyboard (105.6s explainer)
    └── anc-headphones/                   # Project 2: ANC Headphones (Anti-noise explainer)
```

---

## Work Loop: Creating a New Video

1. **Scaffold from Template**:
   Copy `projects/_template` to `projects/<your-project-name>`. Never build videos in the root directory.
   ```bash
   cp -r projects/_template projects/drone-anatomy
   ```
2. **Draft Script & Voiceover (`script.json`)**:
   Write the narration text for each scene. Identify any heteronyms (e.g. “弹片”, “重合”) and add phonetic mappings to `core/tts/engine.py` for 100% correct audio while keeping display text pristine.
3. **Build Anatomy Figures (`geo/`)**:
   Model the physical object with Anatomy isometric kit (`K.*`) and output SVG figures to `projects/<name>/assets/figures/`.
   Verify with PNG rasterization: `node geo/png.mjs` or preview renders.
4. **Configure Scene Metadata (`scenes.config.mjs`)**:
   Define scene titles, numbered badges, lead sentences, parts breakdown list, and target SVG figures.
5. **Run End-to-End Build**:
   ```bash
   node bin/video.mjs build --project <your-project-name>
   ```
   This automatically synthesizes Edge-TTS audio, extracts millisecond-accurate word timestamps, builds figures, compiles composition HTML files, and validates with the HyperFrames quality gate.
6. **Golden Master Visual Inspection (Snapshots)**:
   Capture keyframes at critical timestamps and inspect with vision before shipping:
   ```bash
   node bin/video.mjs snapshot --project <your-project-name> --at 2.0,15.0 -o preview/snap.png
   ```
7. **Export Production MP4**:
   ```bash
   node bin/video.mjs render --project <your-project-name> [--production]
   ```

---

## Core Contracts & Standards

### 1. Multi-Workspace Physical Sandbox Isolation
- Each video project owns its own `project.json`, `script.json`, `scenes.config.mjs`, `geo/`, `assets/`, `compositions/`, `preview/`, and `renders/`.
- Cross-project relative path traversing is strictly prohibited. Subprocess commands must always execute with `cwd: projectDir` to prevent root directory pollution.
- The master CLI `bin/video.mjs` defaults to `mechanical-keyboard` when `--project` is omitted for seamless backward compatibility.

### 2. Modern Clean Subtitle System (38px Borderless Standard)
- **Zero Bottom Clutter**: Progress bars (`.bar`), footer marks (`.foot`), and pagination indices (`.pg`) are removed from composition layouts to maintain professional cinematic breathing space.
- **Dock Positioning**: `position: absolute; bottom: 52px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 1600px; display: flex; justify-content: center; pointer-events: none; z-index: 90;`
- **Typography & Shadows**: Large **38px** font size, weight `600`, cold-white (`#f8fafc`), borderless, pill-less, enhanced with dual-layer dark shadows (`text-shadow: 0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.85)`).
- **GSAP Sync**: Timed to spoken sentence start/end beats with subtle vertical easing (`opacity: 0, y: 8` -> `opacity: 1, y: 0` -> `opacity: 0, y: -6`).

### 3. Inline SVG vs. `<img>` for Dynamic Mechanical Motion
- **Static Overview Figures**: Can use `<img src="assets/figures/*.svg">` for simple fades and subtle global rotations.
- **Interactive Assembly / Explosions / Contact Deformation**: **MUST be injected as Inline SVG** into the scene `<template>`. Only Inline SVG allows GSAP to pierce the DOM tree and animate internal parts (e.g., `#s-stem` translation, `#s-spring` scaleY compression, `#s-contact` stroke color highlights).
- **Material CSS Ingestion**: Always lift `matCss()` into the scene `<template><style>` so inline elements inherit shaders correctly without blacking out.

### 4. Dual-Track TTS & Phonetic Decoupling
- **Dual Track**:
  - *Preview*: Edge-TTS (`zh-CN-YunxiNeural`) provides instant, zero-cost speech synthesis with `WordBoundary` timestamp extraction.
  - *Production*: MiMo-v2.5-TTS (`茉莉` / `苏打`) generates 44.1kHz commercial studio audio; timestamps are elastically scaled via `mimoDur / edgeDur`.
- **Phonetic Decoupling**:
  - Homophones are substituted in the audio stream (`弹片` -> `谈片`) so speech is phonetically accurate (e.g. `tán` instead of `dàn`).
  - Canonical Chinese characters are preserved in subtitles, title headings, and structural part annotations.

### 5. Robust Environment & Headless Chrome Execution
- Dynamic Chrome path resolution: Automatically probes user overrides, then dynamically scans `~/.cache/hyperframes/chrome/chrome-headless-shell/*/chrome-headless-shell-win64/chrome-headless-shell.exe` to avoid version hardcoding.
- Pre-launch lock purging: Purges `AppData/Local/Temp/puppeteer_dev_chrome_profile-*` directories before every check, snapshot, and render to eliminate Windows process deadlocks.
- WCAG AA Contrast Compliance: Text colors for subtitles and meta tags are tuned to pass the HyperFrames 4.5:1 contrast floor.

---

## What to Read

| Request Type | Reference File |
| :--- | :--- |
| Anatomy 3D isometric modeling & parts assembly | `references/geometry.md` |
| Narration script, sentence timestamps, TTS & heteronyms | `references/script.md` |
| Chrome headless setup, CLI orchestration, render flags | `references/render.md` |
| Real-world debugging, black materials, audio & timing gotchas | `references/pitfalls.md` |
| Starter template files for new projects | `templates/` |

---

## Three Inviolable Rules

1. **Never ship a figure you haven't inspected visually.** Anatomy operates purely in math without a live canvas. Always rasterize with `node geo/png.mjs` or view snapshots before delivering.
2. **Never release a video without keyframe snapshot verification.** Run `node bin/video.mjs snapshot --project <name> --at <time>` and verify typography, part alignment, and subtitles.
3. **Always preserve physical sandbox isolation.** Never hardcode root-relative paths or commit project-specific assets into `core/`.
