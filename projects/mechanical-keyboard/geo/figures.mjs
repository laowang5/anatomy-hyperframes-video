import { K, prism, tube, solid, frustum, matCss, svgDoc, leader, tag, INK } from "./lib.mjs";
import { U, GAP, keys, keycap, switchSvg, caseSvg, foamSvg, pcbSvg, plateSvg, CASE_W, CASE_D, Z, LAYERS, STEP } from "./keyboard.mjs";

export const FW = 1240;
export const FH = 1080;

const css = () => matCss() + `
.fig{display:block;overflow:visible}
`;

const doc = (body) => svgDoc(FW, FH, body, css());

const proj = (pts, opts = {}) => {
  const { az = 38, el = 30, pad = 40, headroom = 0 } = opts;
  return K.fitProjection(pts, FW, FH, { pad, headroom, azimuth: az, elevation: el });
};

const box3 = (w, d, z0, z1) => K.boxCorners({ x: -w / 2, y: -d / 2, w, d }, z0, z1);
const dep = (p, P) => K.depthOf(p, P);

/* ---------- 01 hero: assembled keyboard ---------- */
export function fHero() {
  const P = proj([...box3(CASE_W + 46, CASE_D + 46, -14, 72)], { pad: 26, az: 34, el: 31 });
  const g = [];
  for (const L of LAYERS) {
    let inner = "";
    if (L.id === "case") inner = caseSvg(P, 0);
    else if (L.id === "foam") inner = foamSvg(P, 0);
    else if (L.id === "pcb") inner = pcbSvg(P, 0);
    else if (L.id === "plate") inner = plateSvg(P, 0);
    else if (L.id === "switch") {
      const ks = keys().slice().sort((a, b) => dep([a.cx, a.cy, Z.swTop], P) - dep([b.cx, b.cy, Z.swTop], P));
      inner = ks.map((k) => switchSvg(k, P, 0, "mech")).join("");
    } else if (L.id === "cap") {
      const ks = keys().slice().sort((a, b) => dep([a.cx, a.cy, Z.capTop], P) - dep([b.cx, b.cy, Z.capTop], P));
      inner = ks.map((k) => keycap(k, P, 0)).join("");
    }
    g.push(`<g id="L-${L.id}">${inner}</g>`);
  }
  return doc(g.join("\n"));
}

/* ---------- 02 keycap: shell + cross stem over switch ---------- */
export function fCap() {
  const P = proj([[-34, -30, -8], [34, -30, -8], [-34, 30, -8], [34, 30, -8], [0, 0, 104]], { pad: 92, az: 34, el: 32 });
  const g = [];
  g.push(`<g id="c-plate">${solid(prism({ cx: 0, cy: 0, w: 58, d: 58, r: 3 }, -8, 7, P), "plate")}</g>`);
  g.push(`<g id="c-base">${solid(prism({ cx: 0, cy: 0, w: 30, d: 30, r: 2.6 }, 7, 12, P), "housingLo")}</g>`);
  g.push(`<g id="c-top">${solid(prism({ cx: 0, cy: 0, w: 30, d: 30, r: 2.6 }, 19, 16, P), "housing")}</g>`);
  g.push(`<g id="c-xstem">${solid(prism({ cx: 0, cy: 0, w: 6.8, d: 6.8, r: 0.5 }, 35, 9, P), "stem")}</g>`);
  const capB = 60;
  const capT = capB + 13;
  const w = 2.0 * U - GAP;
  const d = U - GAP;
  const taper = 3.0;
  const bottom = K.ringOf({ x: 0, y: 0, w, d, r: 1.8 }, 3);
  const top = K.ringOf({ x: 0, y: 0, w: w - taper * 2, d: d - taper * 2, r: 1.2 }, 3);
  /* the cross stem hangs DOWN from the underside of the cap — it is the part
     that grips the switch stem, so it must live below capB, never inside it */
  g.push(`<g id="c-cross">${solid(prism({ cx: 0, cy: 0, w: 8.4, d: 8.4, r: 0.5 }, capB - 12, 12, P), "stem")}</g>`);
  g.push(`<g id="c-cap">${solid(frustum(bottom, top, capB, capT, P), "accent")}</g>`);
  const [cx1, cy1] = K.iso([0, 0, capT], P);
  const [cx2, cy2] = K.iso([0, 0, capB - 6], P);
  const [cx3, cy3] = K.iso([0, 0, 27], P);
  g.push(leader(cx1, cy1, cx1 + 118, cy1 - 6, "键帽", { tone: INK.hot, size: 26, weight: 600 }));
  g.push(leader(cx2, cy2, cx2 - 118, cy2 + 26, "十字柱", { tone: INK.ink, size: 26, weight: 600, anchor: "end" }));
  g.push(leader(cx3, cy3, cx3 - 118, cy3 + 4, "轴体外壳", { tone: INK.dim, size: 24, weight: 500, anchor: "end" }));
  return doc(g.join("\n"));
}

/* ---------- 03 mechanical switch, exploded ---------- */
export function fSwitch() {
  const P = proj([[-26, -26, -10], [26, -26, -10], [-26, 26, -10], [26, 26, -10], [0, 0, 128]], { pad: 26, az: 36, el: 30 });
  const g = [];
  const parts = [
    ["s-bottom", 0, 13, 32, 32, 3, "housingLo"],
    ["s-contact", 18, 4, 24, 8, 0.6, "copper"],
    ["s-spring", 27, 30, 16, 16, 0, "spring"],
    ["s-stem", 62, 24, 12, 12, 1, "stem"],
    ["s-top", 92, 26, 32, 32, 3, "housing"],
  ];
  for (const [id, z, h, w, d, r, mat] of parts) {
    if (id === "s-spring") {
      /* K.coil() returns {back, front} — each a set of raw <path> fragments,
         never a single element, so they must be wrapped by hand */
      const coil = K.coil(z, z + h, [0, 0, 0], 9.0, 6, "z", P, 20);
      const body = solid(tube(0, 0, 6.2, 6.2, z, z + h, P, 24), mat);
      const wire = `<g class="iso-line" stroke="#e2e9f2" stroke-width="1.5" fill="none">${coil.back}${coil.front}</g>`;
      g.push(`<g id="${id}">${body}${wire}</g>`);
    } else {
      g.push(`<g id="${id}">${solid(prism({ cx: 0, cy: 0, w, d, r }, z, h, P), mat)}</g>`);
    }
  }
  /* leaders naming the five parts — the figure alone is unreadable at speed */
  const at = (zz) => K.iso([0, 0, zz], P);
  const marks = [
    ["上盖 Top housing", 105, INK.dim, "end"],
    ["轴心 Stem", 74, INK.ink, "end"],
    ["弹簧 Spring", 42, INK.hot, "end"],
    ["弹片 Contact leaf", 20, INK.cool, "end"],
    ["下盖 Bottom housing", 6, INK.dim, "end"],
  ];
  const [mx, my] = at(74);
  for (const [label, zz, tone, anchor] of marks) {
    const [px, py] = at(zz);
    g.push(leader(px, py, px - 118, py + (zz > 74 ? -14 : zz > 42 ? 4 : 16), label, { tone, size: 24, weight: 500, anchor }));
  }
  g.push(tag(mx + 92, my - 150, "弹片被触点断开", { tone: INK.cool, size: 22, weight: 500 }));
  return doc(g.join("\n"));
}

/* ---------- 04 magnetic switch ---------- */
export function fMagnet() {
  const P = proj([[-34, -26, -10], [34, -26, -10], [-34, 26, -10], [34, 26, -10], [0, 0, 122]], { pad: 30, az: 36, el: 30 });
  const g = [];
  g.push(`<g id="m-pcb">${solid(prism({ cx: 0, cy: 0, w: 70, d: 50, r: 2 }, -10, 7, P), "pcb")}</g>`);
  g.push(`<g id="m-sensor">${solid(prism({ cx: 0, cy: 0, w: 12, d: 10, r: 0.8 }, 0.5, 3.6, P), "sensor")}</g>`);
  g.push(`<g id="m-bottom">${solid(prism({ cx: 0, cy: 0, w: 32, d: 32, r: 3 }, 12, 16, P), "housingLo")}</g>`);
  /* the magnet is bonded to the BOTTOM of the stem — that is the whole point:
     it has to approach the sensor on the PCB as the key travels down */
  g.push(`<g id="m-magnet">${solid(prism({ cx: 0, cy: 0, w: 7.6, d: 7.6, r: 0.6 }, 28, 7, P), "magnet")}</g>`);
  g.push(`<g id="m-stem">${solid(prism({ cx: 0, cy: 0, w: 14, d: 14, r: 1 }, 35, 21, P), "stem")}</g>`);
  g.push(`<g id="m-top">${solid(prism({ cx: 0, cy: 0, w: 32, d: 32, r: 3 }, 64, 22, P), "housing")}</g>`);
  const at = (zz) => K.iso([0, 0, zz], P);
  const [mx, my] = at(31);
  const marks = [
    ["上盖 Top housing", 75, INK.dim],
    ["轴心 Stem", 45, INK.ink],
    ["磁铁 Magnet", 31, INK.hot],
    ["霍尔传感器 Sensor", 2, INK.cool],
  ];
  for (const [label, zz, tone] of marks) {
    const [px, py] = at(zz);
    g.push(leader(px, py, px + 122, py + (zz > 45 ? -10 : zz > 31 ? 6 : 12), label, { tone, size: 24, weight: 500, anchor: "start" }));
  }
  g.push(tag(mx - 210, my - 96, "距离变化 → 电压变化", { tone: INK.cool, size: 22, weight: 500 }));
  return doc(g.join("\n"));
}

/* ---------- 05 plate ---------- */
export function fPlate() {
  const P = proj([[-112, -66, -16], [112, -66, -16], [-112, 66, -16], [112, 66, -16], [0, 0, 64]], { pad: 26, az: 38, el: 32 });
  const g = [];
  const pw = 208;
  const pd = 92;
  g.push(`<g id="p-plate">${solid(prism({ cx: 0, cy: 0, w: pw, d: pd, r: 3 }, 0, 4.4, P), "plate")}</g>`);
  const holes = [];
  const cols = 8;
  const rows = 3;
  const cell = 23;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * cell;
      const y = (r - (rows - 1) / 2) * cell;
      holes.push(K.pathOf([[-6.6, -6.6], [6.6, -6.6], [6.6, 6.6], [-6.6, 6.6]].map(([a, b]) => K.iso([x + a, y + b, 4.46], P)), true));
    }
  g.push(`<path d="${holes.join("")}" fill="#05060a"/>`);
  g.push(`<g id="p-sw">${switchSvg({ cx: -1.5 * cell, cy: 0 }, P, 4.4, "mech")}</g>`);
  return doc(g.join("\n"));
}

/* ---------- 06 PCB ---------- */
export function fPcb() {
  const P = proj([[-112, -64, -12], [112, -64, -12], [-112, 64, -12], [112, 64, -12], [0, 0, 44]], { pad: 26, az: 38, el: 32 });
  const g = [];
  const pw = 212;
  const pd = 96;
  g.push(`<g id="b-board">${solid(prism({ cx: 0, cy: 0, w: pw, d: pd, r: 2.5 }, 0, 3.6, P), "pcb")}</g>`);
  const z = 3.66;
  const tr = [];
  for (let r = 0; r < 4; r++) tr.push(K.lineOnTop([-pw / 2 + 9, (r - 1.5) * 22], [pw / 2 - 9, (r - 1.5) * 22], z, P));
  for (let c = 0; c < 9; c++) tr.push(K.lineOnTop([(c - 4) * 23, -pd / 2 + 9], [(c - 4) * 23, pd / 2 - 9], z, P));
  g.push(`<path d="${tr.join("")}" fill="none" stroke="#3fae92" stroke-width="1.1" opacity="0.5"/>`);
  const pads = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++) {
      const x = (c - 3.5) * 23;
      const y = (r - 1) * 22;
      pads.push([...K.iso([x - 5, y, z], P), 0.95]);
      pads.push([...K.iso([x + 5, y, z], P), 0.95]);
    }
  g.push(K.dotsSvg(pads, { size: 2.0, tone: "hi" }));
  g.push(`<g id="b-mcu">${solid(prism({ cx: 58, cy: -20, w: 28, d: 21, r: 1 }, z, 4.6, P), "chip")}</g>`);
  g.push(`<g id="b-usb">${solid(prism({ cx: -92, cy: 0, w: 15, d: 19, r: 1 }, z, 5.4, P), "gold")}</g>`);
  g.push(`<g id="b-diode">${solid(prism({ cx: 18, cy: 28, w: 11, d: 7.5, r: 0.6 }, z, 2.8, P), "chip")}</g>`);
  return doc(g.join("\n"));
}

/* ---------- 07 foam ---------- */
export function fFoam() {
  const P = proj([[-112, -64, -18], [112, -64, -18], [-112, 64, -18], [112, 64, -18], [0, 0, 62]], { pad: 26, az: 38, el: 30 });
  const g = [];
  g.push(`<g id="f-foam">${solid(prism({ cx: 0, cy: 0, w: 204, d: 92, r: 9 }, 0, 10, P), "foam")}</g>`);
  const holes = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++) {
      const x = (c - 3.5) * 23;
      const y = (r - 1) * 22;
      holes.push(K.pathOf([[-6.2, -6.2], [6.2, -6.2], [6.2, 6.2], [-6.2, 6.2]].map(([a, b]) => K.iso([x + a, y + b, 10.06], P)), true));
    }
  g.push(`<path d="${holes.join("")}" fill="#05060a"/>`);
  g.push(`<g id="f-plate">${solid(prism({ cx: 0, cy: 0, w: 212, d: 98, r: 3 }, 34, 4.4, P), "plate")}</g>`);
  return doc(g.join("\n"));
}

/* ---------- 08 case ---------- */
export function fCase() {
  const P = proj([...box3(CASE_W + 56, CASE_D + 56, -18, 76)], { pad: 26, az: 35, el: 30 });
  const g = [];
  g.push(`<g id="k-shell">${caseSvg(P, 0)}</g>`);
  g.push(`<g id="k-foam">${foamSvg(P, 0)}</g>`);
  g.push(`<g id="k-pcb">${pcbSvg(P, 0)}</g>`);
  g.push(`<g id="k-plate">${plateSvg(P, 0)}</g>`);
  return doc(g.join("\n"));
}

/* ---------- 09 exploded stack ---------- */
export function fStack(step = STEP) {
  const topZ = Z.capTop + step * 5 + 12;
  const P = proj([...box3(CASE_W + 56, CASE_D + 56, -16, topZ)], { pad: 22, az: 38, el: 28 });
  const g = [];
  for (const L of LAYERS) {
    const dz = L.dz * step;
    let inner = "";
    if (L.id === "case") inner = caseSvg(P, dz);
    else if (L.id === "foam") inner = foamSvg(P, dz);
    else if (L.id === "pcb") inner = pcbSvg(P, dz);
    else if (L.id === "plate") inner = plateSvg(P, dz);
    else if (L.id === "switch") {
      const ks = keys().slice().sort((a, b) => dep([a.cx, a.cy, Z.swTop + dz], P) - dep([b.cx, b.cy, Z.swTop + dz], P));
      inner = ks.map((k) => switchSvg(k, P, dz, "mech")).join("");
    } else if (L.id === "cap") {
      const ks = keys().slice().sort((a, b) => dep([a.cx, a.cy, Z.capTop + dz], P) - dep([b.cx, b.cy, Z.capTop + dz], P));
      inner = ks.map((k) => keycap(k, P, dz)).join("");
    }
    g.push(`<g id="x-${L.id}" data-layer="${L.id}">${inner}</g>`);
  }
  return doc(g.join("\n"));
}

export const FIGS = { hero: fHero, cap: fCap, switch: fSwitch, magnet: fMagnet, plate: fPlate, pcb: fPcb, foam: fFoam, case: fCase, stack: fStack };
