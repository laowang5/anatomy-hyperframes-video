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

## Project Structure

- `index.html` — main composition (root timeline)
- `compositions/` — sub-compositions referenced via `data-composition-src`
- `meta.json` — project metadata (id, name)
- `transcript.json` — whisper word-level transcript (if generated)

## Linting — ALWAYS RUN AFTER CHANGES

After creating or editing any `.html` composition, **always** run the full check before considering the task complete:

```bash
npm run check
```

Fix all errors before presenting the result. Warnings should be reviewed before rendering.

Then look at what you changed: `npx hyperframes snapshot --at <seconds>` (or `--range START,END`, `--composition <id>`) at the moments you edited, and read the frames before you reply. A passing check does not show how it looks.

## Key Rules

1. Every timed element needs `data-start` and a duration. `data-start` is what marks it as timed; `data-track-index` is an optional Studio display lane the render never reads
2. Give timed visual elements `class="clip"`. The framework keys visibility off `data-start`, not the class, but the shared `.clip` CSS is what gives a scene its full-frame box, and `lint` warns without it
3. Register one paused root timeline per composition on `window.__timelines`:
   ```js
   window.__timelines = window.__timelines || {};
   window.__timelines["composition-id"] = gsap.timeline({ paused: true });
   ```
   Scene timelines manually added to this root must not be paused. A paused
   child does not advance when the root is seeked. The runtime activates
   registered composition siblings, not arbitrary nested scene timelines.
4. A video with sound keeps it on the `<video>` (`data-has-audio="true"`, no `muted`). Use a separate `<audio>` for music, voiceover, replacement audio, J/L cuts, or audio detached in Studio. Silent footage and b-roll: `muted`.
5. Sub-compositions use `data-composition-src="compositions/file.html"` to reference other HTML files
6. Only deterministic logic — no `Date.now()`, no `Math.random()`, no network fetches

---

## Anatomy × HyperFrames Explainer Pipeline Rules (Next Video Reference)

When building or updating isometric exploded-view technical explainer videos, **always follow this standardized pipeline**:

### 1. Unified Agentic CLI (`bin/video.mjs`)
Do not run fragmented manual scripts. Use the unified master CLI configured in `package.json`:
```bash
# Full automated end-to-end build & render (Commercial MiMo TTS + Aligned Video)
node bin/video.mjs render --production renders/my_video.mp4

# Granular workflow steps:
node bin/video.mjs voice --production    # 1. Dual-track TTS synthesis & timestamp alignment
node bin/video.mjs figures               # 2. Build Anatomy isometric SVG figures
node bin/video.mjs scenes                # 3. Assemble compositions with Inline SVG & Subtitles
node bin/video.mjs snapshot --at 1.0     # 4. Visual snapshot quality inspection
node bin/video.mjs check                 # 5. HyperFrames linter & duration gate
```

### 2. Inline SVG Animation & Material Piercing
- **Never use `<img src="*.svg">` for interactive/exploding figures**: `<img>` creates an isolated document tree that prevents GSAP from animating internal parts.
- **Always use Inline SVG**: Inject the raw SVG directly into the scene `<template>` so parts (`#s-stem`, `#s-spring`, `#s-contact`) can be translated, scaled, and highlighted dynamically.
- **Top-Level Material CSS (`matCss()`)**: Always lift the material stylesheet to the scene's top-level `<template><style>` to prevent material black-out or inheritance loss.

### 3. Dual-Track TTS & Heteronym Pronunciation Rule
- **Dual-Track**:
  - `preview`: Edge-TTS (`zh-CN-YunxiNeural`) for instant, zero-cost drafting and millisecond-level `WordBoundary` timestamp extraction.
  - `production`: MiMo-v2.5-TTS (`茉莉` / `苏打`) for studio-quality 44.1kHz commercial audio, with timestamps elastically scaled (`mimoDur / edgeDur`).
- **Phonetic Decoupling for Heteronyms**:
  - Technical terms with multiple readings (e.g. "弹片" misread as weapon shrapnel `dàn piàn` instead of `tán piàn`) **MUST be decoupled**:
  - Pass homophones (`谈片`) to the TTS engine so audio is 100% phonetically correct.
  - Keep canonical text (`弹片 LEAF`) in all HTML labels, headlines, and subtitles.

### 4. Modern Clean Subtitles Standard
- **Eliminate Bottom Clutter**: Remove bottom progress bars (`.bar`), footer watermarks (`.foot`), and pagination indices (`.pg`) to allow clean breathing room.
- **Typography & Positioning**:
  - Dock: `position: absolute; bottom: 52px; left: 50%; transform: translateX(-50%); width: 100%;`
  - Typography: Large **38px** (font-weight 600), cold-white (`#f8fafc`), borderless, pill-less.
  - Shadow: Dual-layer deep shadow (`text-shadow: 0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.85)`).
  - GSAP: Smooth `opacity: 0, y: 8` fade-in and `opacity: 0, y: -6` fade-out per spoken sentence beat.

### 5. Windows Chrome Headless Stability
- The CLI automatically kills orphaned Chrome processes and recursively purges `AppData/Local/Temp/puppeteer_dev_chrome_profile-*` before launching to prevent headless socket/profile deadlocks.
- The root scene element `#root` must carry `data-root="true"` to prevent zero-duration capture errors.
