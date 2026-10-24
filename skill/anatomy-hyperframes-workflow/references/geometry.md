# Geometry: modeling and drawing

## The coordinate system

Anatomy is **isometric**: a world point `[x, y, z]` projects to a screen point through a `projection` object `P` built once per figure.

```
const P = K.fitProjection(points, W, H, { pad, azimuth, elevation, headroom });
const [sx, sy] = K.iso([x, y, z], P);
```

- `azimuth` — rotate the object around Z. `34–40°` reads well for keyboards and wide flat things; `50–60°` for tall objects.
- `elevation` — how far above the horizon you look. `28–32°`. Lower flattens the top face away; higher looks like a plan view.
- `pad` — margin in SVG pixels. `20–40`.
- `fitProjection` picks `scale = min((W-2pad)/(right-left), (H-2pad)/(down-up))` and centers the object. Feed it the **bounding corners of the whole figure including the tallest part**, or the fit is wrong.

`W`/`H` for a 1920×1080 scene where the art occupies the right ~60%: `FW = 1240, FH = 1080` works, with `.figwrap{width:1180px;height:960px;object-fit:contain}` in the scene CSS.

## Depth sorting

Nothing does this for you. A part drawn first is painted first.

```
const dep = (p, P) => K.depthOf(p, P);   // (x*cosA + y*sinA)*cosE + z*sinE
keys.sort((a, b) => dep([a.cx, a.cy, Z.swTop], P) - dep([b.cx, b.cy, Z.swTop], P));
```

Higher depth = further from the viewer = drawn first. Sort **per-part, per-figure**, using a representative point (usually the part's top-center). For a whole object made of stacked slabs, a hand-written painter order is often clearer than a sort:

```
feet → base → deck → can → rail → bearing → shaft → rotor(blades sorted by depth) → hub → nut
```

## The extrusion model

`extrude(ring, z, height, P, options)` is the workhorse. It returns:

```
{ fill, outline, crease, top, shades[4], bevel }
```

- `ring` — a **closed loop of `[x, y]` world points** (not screen points).
- `shades` — four strings, indexed by how much light each side face gets. This is where the 3D read comes from.
- `options.convex` — **`true` uses `convexHull([...top, ...bottom])` as one fill; `false` emits the top and bottom polygons plus one quad per visible side face.** Non-convex rings (an L-shaped bracket, a curved blade, a keycap's cross-stem seen at an angle) **must** pass `{convex: false}` or the fill is wrong.
- `options.bevel` — bevel width on the top edge.

`K.extrude` only extrudes a constant cross-section. For **tapers** (a keycap narrowing toward the top, a cone, a truncated pyramid) use the `frustum()` in `templates/lib.mjs`, which takes separate `bottom` and `top` rings.

## Building rings

```
K.roundedPlan({x, y, w, d, r}, steps)   // rounded rect, corner radius r
K.ringOf(plan, steps)                    // → point loop
K.circleRing(cx, cy, r, steps)           // → point loop, steps 20–40
ring(cx, cy, w, d, r, steps)             // lib.mjs: centered rounded rect
```

`steps` is corner smoothness. `3` is enough for a 1.7px radius; `8` for a big fillet; `32–40` for a true cylinder.

## Material colouring

Anatomy's own `ISO_CSS` themes everything through `--anatomy-*` custom properties. They do not survive embedding in a HyperFrames scene (librsvg and the CSS pipeline both drop them), and they are too dark to read on a near-black video background anyway.

So: **write your own material table and generate the CSS yourself.** See `matCss()` in `templates/lib.mjs`:

```
export const MATS = {
  case:   { face: "#171b21", top: "#2b323d", shades: ["#0b0e12", "#11151a", "#171c22", "#1e242c"], edge: "#5c6674" },
  cap:    { face: "#2a3038", top: "#4a5462", shades: ["#15181d", "#1d222a", "#262c35", "#313845"], edge: "#8b95a4" },
  accent: { face: "#a2432f", top: "#c95a3c", shades: ["#5a2318", "#722c1e", "#8a3626", "#a2432f"], edge: "#ff9670" },
  ...
};

export const solid = (paths, mat, opts = {}) =>
  K.solidSvg(paths, { className: `m-${mat}`, crease: "none", ...opts });
```

`solidSvg(paths, { className, crease, halo, lit, flat, inner })` wraps the paths in `<g class="iso-solid m-<mat>">` and emits the layer stack `halo → fill → shade0..3 → top → crease → bevel → inner → edge`.

**Each material needs four CSS rule variants**, because Anatomy toggles attributes on the group:

```
.m-cap, .m-cap[data-lit], .m-cap[data-seamless], .m-cap[data-lit][data-seamless]
```

Miss one and that material renders flat under some conditions. `matCss()` does this in a loop.

### Baseline rules you must include

Anatomy's `ISO_CSS` normally supplies `fill: none` on line elements. If you write your own CSS, **include these four lines or every outline renders as a solid black blob**:

```
.iso-line { fill: none; stroke-linecap: round; stroke-linejoin: round }
.iso-edge { fill: none; stroke-linecap: round; stroke-linejoin: round }
.iso-crease { fill: none; stroke-linecap: round; stroke-linejoin: round }
.iso-fill, .iso-top, .iso-shade { stroke-linejoin: round }
```

This is the single most expensive bug in this pipeline. See `pitfalls.md`.

### Lit vs unlit

`lit: true` tells `solidSvg` the part is a "lit" surface — it swaps `--anatomy-face`/`--anatomy-top` for the brighter `--anatomy-lit-top`/`--anatomy-lit-shade`. Use it for the part currently being talked about; it lifts it out of the assembly.

## Useful Anatomy functions

| Function | Returns |
| --- | --- |
| `iso([x,y,z], P)` | `[sx, sy]` screen point |
| `depthOf([x,y,z], P)` | number, higher = further |
| `towardViewer(P)` | `[cosA, sinA]`, the direction facing the camera |
| `extrude(ring, z, h, P, opts)` | `{fill, outline, crease, top, shades[4], bevel}` |
| `boxCorners({x,y,w,d}, z0, z1)` | 8 corners for `fitProjection` |
| `corners({x,y,w,d}, inset)` | 4 corners of a rect |
| `pathOf(points, closed)` | `d` attribute |
| `joinPaths(...)` | concatenate `d` strings |
| `lineOnTop(from, to, z, P)` | `d` for a line on a horizontal face |
| `segment(from, to, P)` | `d` for a line in 3D |
| `coil(from, to, center, r, turns, axis, P, perTurn)` | **`{back, front}`** — two `d` strings, one per side of the axis |
| `topTicks(from, to, step, every, edge, z, lengths, P, axis)` | `{minor, major}` |
| `radialTicks(cx, cy, r, count, every, z, lengths, P, from, span)` | `{minor, major}` |
| `sideArc(cx, cy, r, z, P, steps)` | `d` for a semicircle on a vertical face |
| `knurl(cx, cy, r, z0, z1, count, P, inset)` | knurled-grip vertical lines |
| `dotsSvg(points, {size, tone})` | dot field; a point may be `[x, y, alpha]` |
| `lineSvg(d, {tone, dotted, dashed, flow})` | styled line |
| `topMatrix(at, z, P, along)` / `sideMatrix(at, z, P, face)` | transform for text lying on a face |
| `faceTextSvg(transform, text, {size, tone, anchor})` | `<text>` laid flat on a surface |
| `haloOf(plan, z, h, P)` | a soft drop shadow path |
| `fitProjection(points, W, H, opts)` | `P` |

`tenth` and `thousandth` (deterministic number formatting) are **module-private** — not exported. Round yourself.

## Assembling a figure

```
import * as K from "../../anatomy/kit/iso-kit.mjs";
import { prism, tube, solid, frustum, matCss, svgDoc, leader, INK } from "./lib.mjs";

export function fCap() {
  const P = proj([[-34, -30, -8], [34, -30, -8], [-34, 30, -8], [34, 30, -8], [0, 0, 104]],
                 { pad: 92, az: 34, el: 32 });
  const g = [];
  g.push(`<g id="c-plate">${solid(prism({ cx: 0, cy: 0, w: 58, d: 58, r: 3 }, -8, 7, P), "plate")}</g>`);
  g.push(`<g id="c-cap">${solid(frustum(bottom, top, capB, capT, P), "accent")}</g>`);
  // leaders: a dot on the part, an elbow, a label
  g.push(leader(cx1, cy1, cx1 + 118, cy1 - 6, "键帽", { tone: INK.hot, size: 26, weight: 600 }));
  return doc(g.join("\n"));
}
```

- One `<g id="...">` per part. HyperFrames animates the `id`, not the `<path>`.
- Leader lines (`leader(ax, ay, bx, by, label, opts)`) point at a part from the outside. Compute the anchor with `K.iso([x, y, z], P)` so it lands exactly on the part.
- `svgDoc(w, h, body, css, bg)` wraps everything. Pass no `bg` for a transparent figure; the HTML supplies the backdrop.

## Exploded views

The whole point. Model the object as a **layer stack** with a Z height per layer:

```
export const LAYERS = [
  { id: "case",   label: "外壳",   dz: 0 },
  { id: "foam",   label: "硅胶垫", dz: 1 },
  { id: "pcb",    label: "PCB",   dz: 2 },
  { id: "plate",  label: "定位板", dz: 3 },
  { id: "switch", label: "轴体",   dz: 4 },
  { id: "cap",    label: "键帽",   dz: 5 },
];
export const STEP = 104;   // world units between exploded layers
```

Every part function takes a `dz` offset and adds it to its own Z. Assembled view passes `dz = 0`; exploded passes `dz = L.dz * STEP`. Same code, two views.

```
const topZ = Z.capTop + STEP * 5 + 12;
const P = K.fitProjection(probeCorners, W, H, { pad: 22, az: 38, el: 28 });
```

Build `probeCorners` by sampling the object's bounding box at `botZ` and `topZ`, or the fit will clip the top layer.

## Rasterizing to look at your work

Anatomy output is SVG. To see it you need a rasterizer. `sharp` bundles librsvg and handles everything except CSS variables:

```
import sharp from "file:///G:/Workspace/imagetoprompt/node_modules/sharp/dist/index.mjs";
await sharp(Buffer.from(svg)).resize(760).png().toFile(`preview/f-${n}.png`);
```

- The import must be a **`file://` URL** — `import("G:/...")` fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
- librsvg supports `<style>`, class/attribute/descendant selectors, `filter: blur()`, `fill-opacity`, `<text>`. It does **not** support `var(--x)` or `stroke: url(#gradient)`.
- Cost is roughly 200 ms per 1200×760 frame, 870 ms for a 40-part figure. Fine for a preview, far too slow for 3000 frames — that is what HyperFrames' Chrome renderer is for.
