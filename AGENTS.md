# HyperFrames Composition Project

## Skills — read these first

**Invoke the relevant skill before writing or modifying compositions.** Skills encode framework-specific patterns (e.g., `window.__timelines` registration, `data-*` attribute semantics, shader-compatible CSS rules) that generic web docs don't cover, so compositions written without them break.

**Doing anything with HyperFrames?** Start at `/hyperframes`. Make any video by asking for it; the `/hyperframes` skill carries the contract and the references (each kind of film, story, motion, look, sound, review, captions, overlays). Read it first, especially when there's no project context to orient you.

- `/hyperframes` — read first for any request to make, edit, animate or render a video, motion graphic, captions or overlays. Holds the render contract and the work loop.
- `/hyperframes-cli` — the CLI by job: scaffold, check, look at frames, edit the timeline, preview, render, publish, project history.
- `/hyperframes-registry` — ready-made blocks and components installed as editable source. Search it before hand-building any named visual.
- `/media-use` — get or make any media (music, sound effects, images, voiceover, avatar and generated video, transcripts, cutouts, colour grades) and mix placed audio.
- `/figma` — bring a Figma design, frame, logo or brand into a video.
- `/slideshow` — a presentation or pitch deck. Output is a navigable deck, not a rendered MP4.
- `/remotion-to-hyperframes` — bring existing video code or footage into HyperFrames (Remotion first; also Motion Canvas, Lottie, Three.js, canvas, or renders from other tools) and verify it frame by frame against the original.

**Changing how real footage or images look or reveal?** Load `/media-use` and read its `references/media-treatments.md` before editing, even when the request only says dark, flat, boring, retro, private, or “make the reveal cooler.” It governs how footage is treated, never whether media may be used. Use canonical media treatments and seek-safe motion; do not improvise equivalent CSS/SVG filters or overlays.

> **Tailwind v4 projects** (`hyperframes init --tailwind`): see `hyperframes-cli/references/init-and-scaffold.md` (Tailwind).

> **Using a HyperFrames plugin?** Load skills from that installed bundle and follow
> its `hyperframes/references/plugin-installation.md` execution rules. Update via
> the plugin manager, not the standalone commands below.
>
> **Standalone skill missing or stale?** Run `npx hyperframes skills update <name>` to install/refresh
> the specific skill you need, or bare `npx hyperframes skills update` to refresh the core set plus
> everything already installed — neither pulls the full set. Restart the agent session so
> newly installed skills load.

## Commands

```bash
npm run dev          # human-operated foreground preview (blocks until stopped)
npx hyperframes preview --background  # agent-safe persistent Studio preview
npx hyperframes preview --status      # verify the persistent preview is listening
npx hyperframes preview --stop        # stop it when review is finished
npm run check        # lint + runtime + layout + motion + contrast (one command)
npm run render       # render to MP4
npm run publish      # publish and get a shareable link
npx hyperframes lint --verbose  # include info-level findings
npx hyperframes lint --json     # machine-readable output for CI
npx hyperframes docs <topic> # reference docs in terminal
```

> **Agents must use `npx hyperframes preview --background` for Studio handoff.** Do not rely
> on a shell/tool `run_in_background` wrapper around `npm run dev`: that foreground process
> remains owned by the invoking session and can disappear while the browser stays open,
> leaving refreshes at `ERR_CONNECTION_TIMED_OUT`. Verify with `preview --status`, keep it
> alive through review, and stop it explicitly with `preview --stop` afterward.

> **Back from the desktop app.** Once this project was opened in the HyperFrames desktop app, run `npx hyperframes catch-up` before your next change here: it lists what the person asked Framey in the app and which files changed since.

> **Pinned CLI version.** These scripts pin an exact `hyperframes@X.Y.Z` so this project re-renders identically over time. Weeks later that pin lags fixes shipped since. To move up: `npx hyperframes@latest upgrade --project . --check` (shows the delta), then `npx hyperframes@latest upgrade --project .` to rewrite the pins. Always unpinned — the pinned script re-runs the old version against itself.

## Documentation

**For quick reference**, use the local CLI docs command (no network required):

```bash
npx hyperframes docs <topic>
```

Topics: `data-attributes`, `gsap`, `compositions`, `rendering`, `examples`, `troubleshooting`

**For full documentation**, discover pages via the machine-readable index — do NOT guess URLs:

```
https://hyperframes.heygen.com/llms.txt
```

## Multi-Workspace Project Topology

The workspace separates universal engine tools from project-specific video sandboxes:

```text
anatomy-hyperframes-video/
├── core/                                 # 🌟 Universal Engine
│   ├── config.mjs                        # Dynamic Chrome path resolver & lock cleaner
│   ├── tts/engine.py                     # Dual-track TTS & heteronym decoupling engine
│   ├── generator/compiler.mjs            # Composition compiler (38px clean subtitles)
│   └── styles/lib.mjs                    # Isometric shader library (matCss)
├── bin/
│   └── video.mjs                         # 🌟 Master CLI Orchestrator (Parameterized --project)
└── projects/                             # 🌟 Isolated Project Sandboxes
    ├── _template/                        # Minimal starter template for new videos
    ├── mechanical-keyboard/              # Project 1: Mechanical Keyboard (105.6s)
    └── anc-headphones/                   # Project 2: Active Noise Cancelling (15.6s)
```

Each sandbox inside `projects/<name>` is strictly self-contained:
- `project.json` — metadata (resolution, dimensions, theme)
- `script.json` — narration voice lines
- `scenes.config.mjs` — scene metadata and part lists
- `geo/` — Anatomy isometric geometry & assembly code
- `assets/` — SVG figures (`assets/figures/`) & audio tracks (`assets/voice/`)
- `compositions/` — generated sub-compositions (`compositions/<scene>.html`)
- `index.html` — generated root composition timeline
- `preview/` & `renders/` — snapshot and final video output

---

## Master CLI Commands (`bin/video.mjs`)

Always drive the pipeline through the master orchestrator. Use `--project <name>` (defaults to `mechanical-keyboard`):

```bash
# 1. Full end-to-end build (voice -> figures -> scenes -> check)
node bin/video.mjs build --project <name> [--production]

# 2. Granular sub-commands
node bin/video.mjs voice --project <name> [--production]  # Dual-track TTS synthesis & timestamp extraction
node bin/video.mjs figures --project <name>              # Build Anatomy isometric SVG figures
node bin/video.mjs scenes --project <name>               # Compile HTML compositions & root index.html
node bin/video.mjs check --project <name>                # Quality gate: Lint + Runtime + Motion + Contrast (WCAG AA)
node bin/video.mjs snapshot --project <name> --at 1.0    # Capture visual validation frame
node bin/video.mjs render --project <name> [--production] # Render final MP4
```

---

## Five Inviolable Production Standards

### 1. Physical Sandbox Isolation
- **Never mutate files across project boundaries.** Each video belongs in its own `projects/<name>` sandbox.
- When running child processes, **always bind `cwd: projectDir`** to guarantee that HyperFrames resolves assets and caches strictly within the target sandbox.
- Copy `projects/_template` to create new videos. Do not write exploratory code in the root directory.

### 2. Inline SVG Animation & Material Piercing
- **Never use `<img src="*.svg">` for exploding, compressing, or moving assemblies**: `<img>` creates an isolated document tree that prevents GSAP from animating internal parts.
- **Inject raw SVG inline** into the scene `<template>` so GSAP can target internal components directly (`#s-stem`, `#s-spring`, `#s-contact`).
- **Lift `matCss()`** to the top-level scene `<template><style>` to prevent material black-out or inheritance loss.

### 3. Dual-Track TTS & Heteronym Phonetic Decoupling
- **Dual-Track**:
  - `preview`: Edge-TTS (`zh-CN-YunxiNeural`) for instant, zero-cost drafting and millisecond-level `WordBoundary` timestamp extraction.
  - `production`: High-fidelity commercial TTS (`TTS_API_KEY` / `TTS_BASE_URL` / `TTS_MODEL`) for studio-quality 44.1kHz audio, with timestamps elastically scaled (`prodDur / edgeDur`).
- **Phonetic Decoupling for Polyphonic Words**:
  - When technical terms have multiple pronunciations (e.g., "弹片" misread as weapon shrapnel `dàn piàn` instead of mechanical leaf `tán piàn`), decouple audio text from display text:
  - Send homophones (`谈片`) to the TTS engine so voiceover is 100% phonetically correct.
  - Maintain canonical Chinese characters (`弹片 LEAF`) in all HTML labels, headlines, and subtitles.

### 4. Modern Clean Subtitles Standard (38px Borderless)
- **Eliminate Bottom Clutter**: Remove bottom progress bars (`.bar`), footer marks (`.foot`), and pagination indices (`.pg`) to provide cinematic breathing room.
- **Dock Positioning**: `position: absolute; bottom: 52px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 1600px; display: flex; justify-content: center; pointer-events: none; z-index: 90;`
- **Typography & Shadows**: Large **38px** font size, weight `600`, cold-white (`#f8fafc`), borderless, pill-less, enhanced with dual-layer dark drop shadows (`text-shadow: 0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.85)`).
- **GSAP Sync**: Timed to spoken sentence start/end beats with subtle vertical easing (`opacity: 0, y: 8` -> `opacity: 1, y: 0` -> `opacity: 0, y: -6`).

### 5. Windows Chrome Headless Stability & WCAG AA Contrast
- Dynamic Chrome path resolution: Automatically scans `~/.cache/hyperframes/chrome/chrome-headless-shell` to avoid hardcoding brittle version strings.
- Pre-launch lock purging: Purges `AppData/Local/Temp/puppeteer_dev_chrome_profile-*` directories before every check, snapshot, and render to eliminate Windows process deadlocks.
- The root scene element `#root` must carry `data-root="true"` to prevent zero-duration capture errors.
- Text contrast must exceed WCAG AA 4.5:1 floor (use `#8391a3` or lighter on dark backgrounds) to ensure clean passes through HyperFrames checks.

---

## Git Safety & Commit Baseline
- **Never push to GitHub automatically** (strictly adhere to user Rule 6).
- All changes must be backed by local atomic commits and verified against golden master snapshots before task completion.
