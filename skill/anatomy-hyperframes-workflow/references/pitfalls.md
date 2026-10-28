# Pitfalls

Every item here cost real time. All were solved; none are obvious from the code.

## The whole figure renders black

**Symptom.** The figure is a dark mass; only a few faces have any colour. Pixel sampling returns `[0,0,0]` where a top face should be, and the correct material colour where a front face is.

**Cause.** You wrote your own material CSS and did not include Anatomy's baseline rules. Without `fill: none` on `.iso-line`, `.iso-edge` and `.iso-crease`, every **stroke** path is also **filled** — with black, the default. The outlines cover the entire model.

**Fix.** Prepend these four lines to your generated CSS:

```
.iso-line{fill:none;stroke-linecap:round;stroke-linejoin:round}
.iso-edge{fill:none;stroke-linecap:round;stroke-linejoin:round}
.iso-crease{fill:none;stroke-linecap:round;stroke-linejoin:round}
.iso-fill,.iso-top,.iso-shade{stroke-linejoin:round}
```

**How to diagnose.** Render a single prism on a **white** background and sample it. The top face goes black, the front face is correct — that tells you it is the fill/stroke confusion, not your palette.

**A related trap.** Anatomy's own `ISO_CSS` has `.iso-solid[data-lit]>.iso-fill` at specificity `(0,3,0)`, which beats a naive `.m-case>.iso-fill` at `(0,2,0)`. If you inherit Anatomy's CSS rather than replacing it, your materials lose to its rules. Either replace `ISO_CSS` entirely (recommended) or emit every rule in four attribute variants — which `matCss()` does anyway.

## CSS custom properties disappear

**Symptom.** Materials render as flat black or transparent when the SVG is embedded in a HyperFrames scene, but look right when opened directly in a browser.

**Cause.** `ISO_CSS` themes everything through `var(--anatomy-*)`. librsvg (used by `sharp`) does not support custom properties; a CSS pipeline may also drop them.

**Fix.** Do not use `ISO_CSS` in a HyperFrames figure. Generate literal-colour CSS with `matCss()`.

If you must keep `ISO_CSS` for a standalone page, resolve the variables first:

```
const resolveVars = (css) => {
  const vars = {};
  for (const m of css.matchAll(/\.iso[^{]*\{([^}]*)\}/g))
    for (const d of m[1].matchAll(/--anatomy-([\w-]+)\s*:\s*([^;]+)/g))
      vars[d[1]] = d[2].trim();
  let out = css.replace(/\.iso\[data-theme="light"\][^{]*\{[^}]*\}/g, "");
  for (let i = 0; i < 4; i++)
    out = out.replace(/var\(--anatomy-([\w-]+)\)/g, (_, k) => vars[k] ?? "#888");
  return out;
};
```

Grab **both** the `.iso{...}` and `.iso[data-theme="light"]{...}` blocks before deleting the light one.

## `coil()` renders nothing

**Symptom.** A spring is missing from the figure entirely.

**Cause.** `K.coil(...)` returns **`{back, front}`** — an object with two path strings, one for the coil's far side and one for its near side. Interpolating it directly:

```
`<g>${K.coil(...)}</g>`        // → <g>[object Object]</g>
```

stringifies the object and draws nothing.

**Fix.** Destructure and wrap in a stroked group:

```
const coil = K.coil(from, to, center, 6.2, 6, "z", P, 16);
g.push(`<g class="iso-line" stroke="#e2e9f2" stroke-width="1.5" fill="none">${coil.back}${coil.front}</g>`);
```

**General rule.** Any Anatomy function documented as returning `{a, b}` — `topTicks`, `radialTicks`, `coil` — must be destructured. `${obj}` is always wrong.

## A part is hidden inside another part

**Symptom.** A component the narration names is invisible, or appears as a colour change on a surface rather than a separate object.

**Cause.** Z overlap. The part was modelled at the same height as the part that contains it.

**Worked example.** A keycap's cross-stem was drawn at `z = capBottom + 5, h = 8` — i.e. *inside* the cap, so it read as a white stripe on the cap's underside. The stem grips the switch **below** the cap, so it must hang down:

```
prism({ cx: 0, cy: 0, w: 8.4, d: 8.4, r: 0.5 }, capB - 12, 12, P)   // z = capB-12 .. capB
```

**Worked example.** A hall sensor was drawn at `z = -3`, inside a PCB occupying `-3..+0.6`. Moved to `z = 0.5` so it sits on the board's top face.

**Rule.** When a part is "attached to" another, its Z range must be **outside** the host's Z range, touching at exactly one face. Write the Z table down and check it.

## `extrude` distorts a non-convex ring

**Cause.** `convex` defaults to `true`, which fills with `convexHull([...top, ...bottom])` — correct for a rectangle or circle, wrong for anything concave.

**Fix.** `K.extrude(ring, z, h, P, { convex: false })` for curved blades, L-brackets, star shapes, anything with a notch.

## `figureSvg` output will not rasterize

**Symptom.** `sharp` produces a 1×1 or blank image.

**Cause.** `figureSvg` emits `viewBox` but **no `width`/`height` attributes**, and librsvg needs an intrinsic size.

**Fix.** Add them:

```
const sized = svg.replace("<svg", `<svg width="${W}" height="${H}"`);
await sharp(Buffer.from(sized)).png().toFile(out);
```

## Gradients vanish

**Symptom.** A `stroke: url(#g)` or `fadeLineSvg` gradient renders as nothing or as a flat colour.

**Cause.** librsvg does not resolve SVG paint-server references in all cases; `fadeLineSvg` also generates its gradient ids with an FNV-1a hash, which is easy to collide.

**Fix.** Avoid gradients in rasterized figures. Use `dotsSvg` with per-point `[x, y, alpha]` for fade effects — alpha is supported.

## The scene's text covers the figure

**Symptom.** Headlines run across the illustration.

**Cause.** The figure wrapper is right-anchored, so its left edge is `1920 - right - width`. With `right:36; width:1180` that is **704px**. A headline with `width:820` from `left:96` reaches 916px.

**Fix.** Right-anchor the copy budget off the art's left edge: `.h1{width:560}`, `.lead{width:520}`, `.list{width:520}` — right edge 616px, clear of 704px.

## Chinese renders in a fallback font

**Cause.** HyperFrames resolves only bundled fonts by name; a Chinese family needs `@font-face`.

**Fix.** `@font-face{font-family:"YaHei";src:local("Microsoft YaHei"),local("Microsoft YaHei UI");font-weight:100 900}`.

## `edit` refuses to write a file you changed with `sed`

**Symptom.** `Error: cannot write ... file changed since it was read` or `file no longer exists`.

**Cause.** The write tool's staleness check compares against what it last read; a `sed`/`python` rewrite invalidates it.

**Fix.** Either `read` the file first, or make scripted edits with `python -` heredocs through the shell (`io.open(p, encoding="utf-8")` — never `open()` for a file with Chinese in it, or you get `PermissionError: [Errno 13]` on Windows).

## Editing a file with a Chinese filename

Python's `open()` on a CJK path fails on Windows with `PermissionError: [Errno 13] Permission denied: 'anatomy项目总览.md'`. Use `io.open(p, encoding="utf-8")`.

## Sandbox blocks the browser entirely

`spawn EPERM` / `errno: -4048` from a Node `child_process.spawn` is a sandbox restriction, not a code bug. Switching shells does not help. The workaround is to use a tool that talks to Chrome over CDP (the HyperFrames renderer) rather than spawning a browser per frame.

## `tenth` / `thousandth` are not exported

`kit/iso-kit.mjs:24` and `:366` define deterministic rounding helpers as module-private `const`s. Calling `K.tenth(...)` throws `TypeError: k.tenth is not a function`. Round in your own code.

## Check your work at every stage

| Stage | Command | Look for |
| --- | --- | --- |
| Figures built | `node geo/build-figures.mjs` | byte sizes — a 40 KB figure that should be 400 KB lost parts |
| Figures valid | `python -c "import xml.etree.ElementTree as ET;[ET.parse('assets/figures/'+f) for f in ...]"` | a single unescaped `<` voids the whole file |
| Figures rasterized | `node geo/png.mjs <name>` | read the PNG; Z overlap, missing parts, flat black |
| Scenes generated | `node geo/gen-scenes.mjs` | durations sum to the root `data-duration` |
| Lint | `hyperframes check` | 0 errors; weigh warnings |
| Render probed | `ffprobe` | `nb_frames == duration × fps` |
| Render viewed | stills at each scene midpoint | overlap, unanimated elements, off-centre art |

## A bare `<` or `&` in label text voids the whole SVG

**Symptom.** One figure is blank in the render while its neighbours are fine. `node geo/png.mjs` may still produce a PNG if it screenshots an `<img>` wrapper (the browser paints the background and nothing else). The render log shows `[media_load_failed] image media failed to load before capture`.

**Cause.** The label helper interpolates raw text into `<text>…</text>`. A caption like `升力 < 重力` injects a `<` that makes the document invalid XML. An XML parser rejects the file at that line and the browser refuses to paint any of it.

**Diagnosis.** Byte size and `</svg>`-at-end checks all pass, because the file is only *textually* complete. Parse it instead:

```bash
python -c "import xml.etree.ElementTree as ET; ET.parse('assets/figures/x.svg')"
# xml.etree.ElementTree.ParseError: not well-formed (invalid token): line 894, column 188
```

Then look at that line — the offending character is usually a comparison operator in prose.

**Fix.** Escape in the text helper, not at the call site:

```js
export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// txt(), textOn(), and every other <text> writer must use ${esc(s)}
```

Do not escape `>` alone and assume you are done: `&` must come first or you double-escape the ampersands you just inserted. `check` does not catch this class of bug — the compositions reference the SVG by `src`, so lint never parses the figure.

## `<img>` tag isolates SVG from GSAP animation

**Symptom.** The figure fades in or floats, but internal parts cannot be animated, highlighted, or moved when narration names them.

**Cause.** An `<img>` element embeds the SVG in an isolated document context. External CSS and JavaScript (GSAP) cannot traverse the shadow/image boundary to select `#s-stem` or `#s-spring`.

**Fix.** Embed the SVG as an **Inline SVG** inside the `<template>` of the scene. Strip the outer `<svg>` declaration attributes and give it a scoped ID:
```javascript
const rawSvg = readFileSync(`assets/figures/${s.fig}.svg`, "utf8");
const inlineSvg = rawSvg.replace(/<svg[^>]*>/, `<svg id="${s.key}-svg" viewBox="0 0 1240 1080" class="clip fig" data-start="0" data-duration="${d}">`);
```

## Inline SVG materials render black or transparent

**Symptom.** When converted to Inline SVG, the model turns black, or faces lose their material shading.

**Cause.** The SVG's scoped `<style>` block is either lost during string slicing or overridden by outer reset styles.

**Fix.** Extract the material CSS definition (`matCss()`) and inject it into the scene's top-level `<template><style>` block so it cascades down to all `.iso-fill`, `.iso-top`, and `.iso-shade` classes.

## Windows Puppeteer Profile Lock / Chrome Collision

**Symptom.** `hyperframes render` or `snapshot` hangs indefinitely or throws `TargetCloseError` / `EPERM` when launching Chrome.

**Cause.** A background Node process or prior failed render left an unclosed profile directory in `AppData/Local/Temp/puppeteer_dev_chrome_profile-*`. Subsequent Headless Chrome instances hit a file lock on `Preferences` or socket ports.

**Fix.** In the master CLI script (`bin/video.mjs`), always run a cleanup routine before calling HyperFrames CLI:
```javascript
for (const dir of readdirSync(tmpDir)) {
  if (dir.startsWith("puppeteer_dev_chrome_profile-")) {
    rmSync(join(tmpDir, dir), { recursive: true, force: true });
  }
}
```
And explicitly set `HYPERFRAMES_BROWSER_PATH` to point to the dedicated `chrome-headless-shell.exe` rather than the user's primary desktop browser.

## Node.js ESM on Windows: `ERR_UNSUPPORTED_ESM_URL_SCHEME`

**Symptom.** Dynamically importing a module via absolute path fails on Windows:
```text
TypeError [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported. Received protocol 'g:'
```

**Cause.** Windows file paths start with drive letters (e.g. `G:\Workspace\...`), which Node's ESM loader treats as an invalid URL protocol (`g:`).

**Fix.** Always convert absolute file paths to `file://` URLs using `pathToFileURL(absPath).href`, or use relative module specifiers:
```javascript
import { pathToFileURL } from "node:url";
const { compileProject } = await import(pathToFileURL(compilerPath).href);
```

## HyperFrames Check: `Missing browser script motion-signature.browser.js`

**Symptom.** Running `hyperframes check .` fails at runtime inspection:
```text
Runtime
  ✗ check_runtime_failure: Missing browser script motion-signature.browser.js
```

**Cause.** The local HyperFrames CLI build (`packages/cli/dist/commands`) is missing browser-injected audit scripts because `build-copy.mjs` was skipped or timed out.

**Fix.** Copy the browser scripts from `packages/cli/src/commands/` to `packages/cli/dist/commands/`:
- `motion-signature.browser.js`
- `layout-audit.browser.js`
- `contrast-audit.browser.js`
- `motion-sample.browser.js`

## HyperFrames Check: WCAG AA 4.5:1 Text Contrast Rejection

**Symptom.** `hyperframes check .` fails under the `Contrast` category with `need 4.5:1` error for secondary text or tags.

**Cause.** Dark-theme palettes often use subdued grays (such as `#5d6878` or `#6b7787`) on near-black backgrounds (`#05060a`), which yield contrast ratios around 3.4:1 ~ 4.1:1, falling below WCAG AA minimum 4.5:1.

**Fix.** Bump muted foreground tones to at least `#8391a3` in `core/generator/compiler.mjs`. This maintains dark-theme sophistication while passing 100% of HyperFrames automated contrast checks.

## Cross-Sandbox Path Resolution: `ValueError: ... is not in the subpath of ...`

**Symptom.** Running TTS or compiler scripts throws `ValueError` during `Path.relative_to(...)`.

**Cause.** Code assumed paths were always located inside a single root directory. When migrating to multi-workspace sandboxes (`projects/<name>`), paths outside the assumed ancestor trigger Python `pathlib.Path.relative_to()` failure.

**Fix.** Anchor relative calculations to the true repository root (`REPO_ROOT = Path(__file__).resolve().parent.parent.parent`), and wrap with fallback exception handling:
```python
try:
    rel_path = target_file.relative_to(REPO_ROOT)
except Exception:
    rel_path = target_file
```

## Watermark & Overlay: `text_below_floor` or `low-contrast` Rejection

**Symptom.** Adding a translucent watermark or texture text triggers `text_below_floor` warnings or fails WCAG AA contrast audits.

**Cause.** HyperFrames layout auditor treats all untagged text as critical reading copy, expecting font-size >= 28px and contrast ratio >= 4.5:1.

**Fix.** Always tag the watermark container with `data-layout-ignore="true"`:
```html
<div class="watermark" data-layout-ignore="true"><i>@智能体老王</i></div>
```
This instructs the layout and contrast engines to bypass the overlay element, allowing extreme low-opacity artistic watermarks (e.g. `rgba(238, 242, 248, 0.045)`) without failing quality gates.

## HyperFrames Check: `font_family_without_font_face` for Chinese System Fonts

**Symptom.** StaticGuard fails with: `Font family used without @font-face declaration: microsoft yahei` or `yahei`.

**Cause.** StaticGuard verifies that every font family specified in CSS has an explicit `@font-face` binding. System fonts that have no local `.woff2` file still require an explicit `local()` declaration.

**Fix.** Add local `@font-face` bindings in both `BASE_CSS` and the root `index.html`:
```css
@font-face {
  font-family: "Microsoft YaHei";
  src: local("Microsoft YaHei"), local("Microsoft YaHei UI");
  font-weight: 100 900;
}
@font-face {
  font-family: "YaHei";
  src: local("Microsoft YaHei"), local("Microsoft YaHei UI");
  font-weight: 100 900;
}
```

## Subtitles: `overlapping_gsap_tweens` on Consecutive Short Sentences

**Symptom.** HyperFrames motion audit warns: `GSAP tweens overlap on "#k*-sub-*" between t1 and t2`.

**Cause.** When speech tempo is fast, consecutive subtitle segments can have short durations (e.g. < 0.4s). Hardcoded tween durations (0.25s in + 0.2s out) will cause the exit tween to start before the entrance tween completes.

**Fix.** In `compiler.mjs`, dynamically clamp entrance/exit durations to a fraction of the subtitle window, ensure `outT >= inT + inDur + 0.05`, and append `overwrite: "auto"` to all subtitle tweens:
```javascript
const dur = Math.max(0.3, sub.end - sub.start);
const inDur = Math.min(0.25, Number((dur * 0.3).toFixed(2)));
const outDur = Math.min(0.2, Number((dur * 0.25).toFixed(2)));
const inT = Number(sub.start.toFixed(2));
const outT = Math.max(Number((inT + inDur + 0.05).toFixed(2)), Number((sub.end - outDur).toFixed(2)));

tl.fromTo(target, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: inDur, ease: "power2.out", overwrite: "auto" }, inT)
  .to(target, { opacity: 0, y: -6, duration: outDur, ease: "power2.in", overwrite: "auto" }, outT);
```

