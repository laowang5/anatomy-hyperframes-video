# Script, timing and scene structure

## Narration drives the timeline

Do not decide shot lengths by feel. Write the narration, synthesize it, **measure it**, then build the timeline around the measured durations. A 25-word Chinese sentence at `--rate=+8%` runs about 11 seconds; you will not guess that.

```bash
node bin/video.mjs voice --project <name> [--production]
# Invokes core/tts/engine.py --project-dir projects/<name>
```

```
import { execFileSync } from "node:child_process";
const dur = (f) => Number(execFileSync("ffprobe",
  ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
  { encoding: "utf8" }).trim());
```

Voice generation (see `templates/tts.mjs`):

```
python -m edge_tts --voice zh-CN-YunxiNeural --text "<sentence>" --rate=+8% --write-media out.mp3
```

Chinese voices that work: `zh-CN-XiaoxiaoNeural` (female), `zh-CN-YunxiNeural` / `zh-CN-YunjianNeural` / `zh-CN-YunyangNeural` (male). Skip generation when the mp3 already exists so you can re-run freely.

### Scene length

```
const PAD = 1.05;                          // tail after the voice ends
s.len   = Number((s.voice + PAD).toFixed(2));
s.start = running total;
```

`1.05 s` of tail is enough for the last animation to settle and the progress bar to finish. Too little and the scene cuts on a moving element.

## Scene file structure

A scene is a **complete HTML document** with everything inside one `<template>`:

```html
<template>
  <style>/* all scene CSS */</style>
  <div id="root" data-composition-id="k03-switch" data-width="1920" data-height="1080">
    <div class="bg"></div>
    <div class="grid"></div>
    <div class="spot" id="k03-switch-spot"></div>

    <div id="k03-switch-num" class="clip num" data-start="0" data-duration="16.29">03</div>
    <h1 id="k03-switch-h1" class="clip h1" data-start="0" data-duration="16.29">机械轴：一次真实的接触</h1>
    <p id="k03-switch-lead" class="clip lead" data-start="0" data-duration="16.29">轴心压着弹簧下沉……</p>

    <div class="figwrap">
      <img id="k03-switch-img" class="clip" src="assets/figures/switch.svg"
           data-start="0" data-duration="16.29" alt="">
    </div>

    <div class="bar"><i id="k03-switch-prog"></i></div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#k03-switch-img", {opacity:0,scale:.93,y:26},
                                 {opacity:1,scale:1,y:0,duration:1.05,ease:"power3.out"}, 0);
    tl.fromTo("#k03-switch-h1", {opacity:0,y:24}, {opacity:1,y:0,duration:.7,ease:"power3.out"}, .3);
    tl.fromTo("#k03-switch-prog", {scaleX:0}, {scaleX:1,duration:16.29,ease:"none"}, 0);
    window.__timelines["k03-switch"] = tl;
  </script>
</template>
```

Non-negotiables:
- **Everything inside `<template>`.** Styles or scripts outside it are silently discarded.
- `#root` id, `data-composition-id`, and the `window.__timelines` key must all be the **same string**.
- Every timed element gets `class="clip"`, `data-start`, `data-duration`.
- Use `fromTo`, never `from`. A `from` tween leaves the element in its natural state before the timeline seeks to it, which the frame-exact renderer will show.
- Never `add()` a scene timeline into the root timeline.
- All ids prefixed per scene (`k03-switch-…`) so they stay globally unique.

## Root index.html

```html
<div id="root" data-root="true" data-composition-id="main"
     data-start="0" data-duration="103.53" data-width="1920" data-height="1080">
  <div id="k01-hook" class="scene" data-composition-id="k01-hook"
       data-composition-src="compositions/01-hook.html"
       data-start="0" data-duration="9.98" data-track-index="1" data-track-kind="graphics"></div>
  ...
  <audio id="vo-01-hook" src="assets/voice/01-hook.mp3"
         data-start="0" data-duration="8.928" data-track-index="2" data-volume="1"></audio>
</div>
<script>
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = gsap.timeline({ paused: true });
</script>
```

- `.scene{position:absolute;inset:0;width:100%;height:100%}` — inset, never hard pixels.
- Root `data-duration` is the **total**, and the sum of scene durations must match it.
- Every `<audio>` needs an `id` or it is dropped from the mix.
- **`data-root="true"` on the root is mandatory.** See `render.md`.

## Layout that does not collide

A 1920×1080 scene with art on the right and copy on the left: art at `right:36px; width:1180px` has a **left edge of 704px**. Copy must end before that.

```
.h1   { left:94px; top:186px; width:560px; font-size:64px; line-height:1.22 }  /* right edge 654 */
.lead { left:96px; top:392px; width:520px; font-size:25px; line-height:1.78 }  /* right edge 616 */
.list { left:96px; top:560px; width:520px }                                     /* right edge 616 */
```

Budget: **560 px** for a 64 px headline is 8 characters per line at most in Chinese. Test the longest headline you have written.

Text-safe is 80% of the frame — 1536×864 centered. Key text stays inside it.

## Chinese typography

HyperFrames resolves only its bundled fonts by name. Any other family needs an `@font-face` to a file in `assets/fonts/`. `local()` works for a system font:

```
@font-face{font-family:"YaHei";src:local("Microsoft YaHei"),local("Microsoft YaHei UI");font-weight:100 900}
#root{font-family:"YaHei",sans-serif}
```

Without this the lint reports `font_family_without_font_face` and Chinese falls back to a default that may not have the glyphs.

Monospace accents (scene numbers, English labels, readouts) — `"JetBrains Mono", Consolas, monospace` is safe on Windows.

## Animation vocabulary

For a technical explainer, restraint reads as authority:

| What | How |
| --- | --- |
| Figure enters | `fromTo opacity 0→1, scale .93→1, y 26→0`, `duration 1.05`, `power3.out` |
| Slow life while it holds | a second tween `rotation -1.2→0` over the **whole scene duration**, `ease:"none"` |
| Headline | `fromTo opacity 0→1, y 24→0`, `duration .7`, staggered `.3` |
| Body copy | same, `.55`, `duration .65` |
| List rows | `fromTo opacity 0→1, x -18→0`, `duration .42`, staggered `0.11` apart |
| Accent rule | `fromTo height 0→96`, `duration .6` |
| Progress bar | `fromTo scaleX 0→1` over the full duration, `ease:"none"`, `transform-origin:left center` |

Stagger by `0.05–0.12 s`. More than that and the scene feels slow.

## Voiceover writing

For a 9-scene explainer the arc that works:

1. **Hook** — one sentence naming the object and the number of parts. ("一把键盘，六层结构。")
2. **The part the viewer already knows** — the keycap. Establishes the visual language.
3. **The core mechanism** — the switch. Give it the most time.
4. **A second mechanism** — magnetic vs mechanical. Contrast teaches better than description.
5–8. **The remaining layers**, one scene each, shortest possible copy.
9. **Reassembly** — the stack closing into one object. Ends the film on the whole.

Per-scene copy budget: a headline of 8–14 Chinese characters, a lead sentence of 20–40 characters, and 2–6 labelled bullet rows. Anything longer and the viewer reads instead of listens.

## Dual-Track Audio Pipeline (Edge-TTS + MiMo-v2.5-TTS)

Audio synthesis must support both **rapid iteration during drafting** and **broadcast-grade fidelity for final delivery**:

1. **Draft / Preview Track (`--mode preview`)**:
   - Engine: `edge_tts.Communicate(text, voice="zh-CN-YunxiNeural", boundary="WordBoundary")`
   - Role: Instant generation without token cost. Crucially extracts millisecond-level `WordBoundary` timestamps for every word and Chinese character.
2. **Production Track (`--mode production`)**:
   - Engine: `mimo-v2.5-tts` (MiniMax / OpenAI-compatible endpoint, voices: "茉莉" or "苏打")
   - Role: High-naturalness 24kHz PCM16 stream, transcoded to 44.1kHz MP3 via FFmpeg.
3. **Timestamp Elastic Scaling**:
   - Because MiMo and Edge-TTS have slight duration deltas, scale the word boundaries elastically:
   ```python
   ratio = mimo_duration / edge_duration
   for word in words:
       word["start"] = round(word["start"] * ratio, 3)
       word["end"] = round(word["end"] * ratio, 3)
   ```

## Heteronym Pronunciation (Phonetic Decoupling)

**Problem**: Chinese TTS models frequently mispronounce technical polyphonic words. For example, in mechanical keyboards, "弹片" (contact leaf) is mistakenly parsed as military shrapnel and voiced as `dàn piàn` instead of `tán piàn`.

**Golden Rule: Decouple Phonetic Text from Visual Display Text**:
1. Keep the canonical text in the script, HTML, diagrams, and subtitles: `两片金属弹片接触，电路闭合`、`弹片 LEAF`
2. Apply homophone substitution in Python *only* when dispatching text to the TTS engine:
   ```python
   PRONUNCIATION_OVERRIDES = {
       "两片金属弹片": "两片金属谈片",
       "两片弹片": "两片谈片",
       "弹片": "谈片",
   }
   ```
3. Because "谈" is unambiguously pronounced `tán`, the synthesized audio is 100% correct, while the screen visuals and subtitles remain 100% standard Chinese.

## Modern Clean Subtitles Standard (Borderless & Large Font)

To deliver a cinematic, uncluttered tech-explainer aesthetic:
1. **Remove Bottom Clutter**: Do not draw bottom progress bars (`.bar`), copyright marks (`.foot`), or slide numbers (`.pg`). These add visual noise and collide with captions.
2. **Bottom Anchoring**: Position the subtitle dock at `bottom: 52px; left: 50%; transform: translateX(-50%)`.
3. **Borderless Typography**:
   ```css
   .sub-dock {
     position: absolute; left: 50%; bottom: 52px; transform: translateX(-50%);
     width: 100%; max-width: 1600px; display: flex; justify-content: center;
     pointer-events: none; z-index: 90;
   }
   .sub-line {
     font-size: 38px; font-weight: 600; letter-spacing: .03em; color: #f8fafc;
     text-shadow: 0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.85);
     white-space: nowrap; text-align: center;
   }
   ```
4. **Sentence Splitting & GSAP Sync**: Split paragraph narration into 6–20 character sentence beats at punctuation marks (`。！？；，`), and bind each beat to the timeline with GSAP:
   ```javascript
   tl.fromTo(`#sub-${i}`, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }, sub.start)
     .to(`#sub-${i}`, { opacity: 0, y: -6, duration: 0.2, ease: "power2.in" }, sub.end);
   ```
