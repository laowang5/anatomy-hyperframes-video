# Templates — copy and adapt

These are the working files from a real 9-scene explainer (a mechanical keyboard). They are complete and runnable as-is against the anatomy checkout at `G:\Workspace\anatomy`; adapt them rather than rewriting from scratch.

```
templates/
  lib.mjs            geometry helpers: frustum, ring, prism, tube, MATS, matCss, solid, leader, tag, svgDoc
  keyboard.mjs       subject model: dimensions, Z table, layer stack, per-part drawing functions
  figures.mjs        one exported function per scene figure, each returning a standalone SVG string
  build-figures.mjs  writes every figure to assets/figures/<name>.svg
  png.mjs            rasterizes figures to preview/f-<name>.png so you can look at them
  script.json        the narration, one entry per scene
  tts.mjs            synthesizes each entry to assets/voice/<id>.mp3 and prints a duration table
  gen-scenes.mjs     writes compositions/<id>.html and the root index.html
```

## What to change, in order

1. **`lib.mjs`** — nothing, usually. `MATS` is a colour palette: rename entries to your subject's materials and adjust the hexes to your background. Keep the four baseline `.iso-line`/`.iso-edge`/`.iso-crease` rules and the four-attribute-variant loop in `matCss()`.

2. **`keyboard.mjs`** — this is your subject. Replace:
   - `LAYOUT` with your part positions (or delete it and list parts explicitly)
   - `U`, `GAP` — your base unit
   - `Z` — the Z height of every layer, as a table
   - `LAYERS` — the exploded-view layer stack
   - `keycap`, `switchSvg`, `plateSvg`, `pcbSvg`, `foamSvg`, `caseSvg` — one drawing function per part kind

   Every part function takes `(..., P, dz)` and adds `dz` to its own Z. That is what makes the assembled and exploded views share code.

3. **`figures.mjs`** — one function per scene figure. Keep `FW`/`FH`/`proj`/`doc` as they are. Each function builds `P` from probe corners, draws parts in painter order with `<g id="...">` wrappers, and returns `doc(...)`.

4. **`script.json`** — the narration. One entry per scene with `id`, `voice`, `text`. Write it, run `tts.mjs`, read the printed durations, and let them set your scene lengths.

5. **`gen-scenes.mjs`** — the `SCENES` array (id, number, English label, Chinese headline, figure name, lead sentence, bullet rows) and `BASE_CSS`. The duration computation and HTML emission are generic; leave them alone.

## Running

```
node geo/tts.mjs            # once per narration edit
node geo/build-figures.mjs  # after any geometry edit
node geo/png.mjs            # always — read the PNGs
node geo/gen-scenes.mjs     # after any script/scene edit
hyperframes check .
hyperframes render . -o renders/out.mp4 -f 30 -w 1 -q looks
```

## Import paths

`lib.mjs` and `keyboard.mjs` import from `../../anatomy/kit/iso-kit.mjs`, which assumes this layout:

```
<workspace>/
  anatomy/kit/iso-kit.mjs
  <your-project>/geo/lib.mjs
```

Adjust the relative path if your project sits elsewhere. `png.mjs` and `tts.mjs` hard-code absolute paths — replace them.
