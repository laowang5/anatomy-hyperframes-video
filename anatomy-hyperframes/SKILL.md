---
name: anatomy-hyperframes
description: Make technical explainer videos with isometric exploded-view illustrations, using Anatomy (SVG isometric geometry kit) for the artwork and HyperFrames (HTML-to-video) for the timeline, voiceover and render. Use when the topic is a physical object, machine, or product — keyboards, drones, engines, tools, electronics, architecture — where the audience needs to see how parts fit together. Holds the geometry API, the render contract, the work loop and every bug this pipeline has already hit.
---

# Anatomy × HyperFrames

Anatomy draws **isometric exploded views as static SVG strings**; HyperFrames turns HTML into a frame-exact video. Together they make technical explainers where a 60-key keyboard can be taken apart layer by layer, or a drone can be peeled open to its motors, on screen, with narration.

**Read this first**, then the file your request needs.

## What each half does

| | |
| --- | --- |
| **Anatomy** (`G:\Workspace\anatomy`) | `kit/iso-kit.mjs` — 55 exports of pure functions `(world coords) → SVG path string`. No DOM, no canvas, no browser. Every figure is a deterministic string you can diff in git. |
| **HyperFrames** | Renders HTML by seeking a paused GSAP timeline frame by frame. `index.html` is the root composition; `compositions/<scene>.html` holds one scene each. |

Anatomy produces the **artwork** (transparent-background SVG). HyperFrames produces the **film** (typography, timing, voiceover, camera moves, render).

## Work loop

1. **Write the narration first.** `references/script.md`. Voice length, not shot count, sets the timeline — measure the mp3, then build the timeline around it.
2. **Model the object** in a `geo/<subject>.mjs` file: dimensions, layer stack, Z heights. `references/geometry.md`.
3. **Draw the figures.** One function per scene, each returning a standalone SVG. `references/geometry.md` + `templates/`.
4. **Rasterize and look at them.** `node geo/png.mjs` then read the PNGs. Do not skip this — a geometry bug is invisible in code and obvious in pixels.
5. **Generate scenes and the root index.** `node geo/gen-scenes.mjs`.
6. **Check, then render.** `hyperframes check`, then `hyperframes render`.

## Contract

1. Anatomy figures are **transparent SVG, no background**. The HTML scene supplies the background, grid and vignette. A baked-in background locks the composition.
2. Every SVG element that HyperFrames animates needs a **stable, prefixed `id`** (`c-cap`, `b-mcu`, `L-pcb`, `#s-stem`, `#s-spring`). Ids must be globally unique across scenes.
3. Anatomy's `ISO_CSS` uses **CSS custom properties** (`var(--anatomy-*)`). These do not survive being embedded in a HyperFrames scene — resolve them to literals first, or use the `matCss()` pattern in `templates/lib.mjs`.
4. **Mechanical Assembly requires Inline SVG**: Do not use `<img src="*.svg">` if parts need to explode, compress, or deform. Inject the SVG inline into the scene DOM so GSAP can target internal components directly (`#s-stem`, `#s-spring`, `#s-contact`). Lift `matCss()` to the top-level scene `<style>` to prevent material black-out.
5. **Dual-Track TTS & Timing Alignment**:
   - *Preview*: Edge-TTS (`zh-CN-YunxiNeural`) provides instant zero-cost voiceover and extracts millisecond-accurate `WordBoundary` timestamps.
   - *Production*: MiMo-v2.5-TTS (e.g. "茉莉" / "苏打") renders 44.1kHz studio-grade audio; timestamps are elastically scaled via `mimoDur / edgeDur`.
6. **Heteronym Pronunciation Rule (Phonetic Decoupling)**:
   - When polyphonic words (e.g., “弹片” read as weapon shrapnel `dàn piàn` instead of `tán piàn`) occur, decouple phonetic text from display text:
   - Pass homophones (`谈片`) to TTS models for 100% correct audio, but retain canonical characters (`弹片 LEAF`) in HTML subtitles and annotations.
7. **Clean Borderless Subtitle Standard**:
   - Clear bottom clutter: Remove progress bar (`.bar`), footer marks (`.foot`), and pagination (`.pg`).
   - Place large (38px, font-weight 600), borderless, pill-less subtitles at `bottom: 52px; left: 50%; transform: translateX(-50%)` with dual-layer dark drop shadow (`text-shadow: 0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.85)`).
   - Animate in/out with GSAP based on aligned sentence boundaries.
8. `figureSvg()` emits **no `width`/`height` attributes**, only a `viewBox`. Rasterizing needs them added by hand.
9. The scene file's styles, markup and script go inside `<template>`; the root element is `#root` and carries `data-composition-id`. Anything outside `<template>` is discarded.
10. The root composition needs `data-root="true"` — without it the frame capturer reads `data-duration` from the wrong element and every render fails with `Composition has zero duration`. See `references/render.md`.
11. **Agentic CLI First**: Drive the entire pipeline through `bin/video.mjs` (`voice`, `scenes`, `snapshot`, `render --production`). Always clean temp Puppeteer profiles on Windows before launching Chrome Headless.

## What to read

| The request | Read |
| --- | --- |
| Geometry API, exploded views, part lists | `references/geometry.md` |
| Narration, timing, TTS, subtitles, heteronym fixes | `references/script.md` |
| Browser setup, CLI crashes, render flags | `references/render.md` |
| Copy-and-adapt project files | `templates/` |
| Something renders wrong (black figures, z-index, SVG isolation) | `references/pitfalls.md` |

## Three hard rules

1. **Never ship a figure you have not looked at.** Anatomy gives you no visual feedback. A part drawn inside another part, a spring interpolated as `[object Object]`, a material rendered as flat black — all of these produce valid SVG and a silent failure. `node geo/png.mjs <name>` and read the file.
2. **Never ship a video you have not watched frames of.** Run `node bin/video.mjs snapshot --at <seconds>` and verify subtitle placement, part assembly, and lighting.
3. **Always decouple TTS phonetics from visual text.** Never let multi-tone mispronunciations degrade voiceover quality.
