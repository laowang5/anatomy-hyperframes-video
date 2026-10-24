import * as K from "../../anatomy/kit/iso-kit.mjs";
import { prism, tube, ring, solid, frustum, matCss, leader, tag, svgDoc, INK } from "./lib.mjs";

export const U = 24;
export const GAP = 1.9;

export const LAYOUT = [
  [["esc", 1], ["1", 1], ["2", 1], ["3", 1], ["4", 1], ["5", 1], ["6", 1], ["7", 1], ["8", 1], ["9", 1], ["0", 1], ["-", 1], ["=", 1], ["del", 2]],
  [["tab", 1.5], ["Q", 1], ["W", 1], ["E", 1], ["R", 1], ["T", 1], ["Y", 1], ["U", 1], ["I", 1], ["O", 1], ["P", 1], ["[", 1], ["]", 1], ["\\", 1.5]],
  [["caps", 1.75], ["A", 1], ["S", 1], ["D", 1], ["F", 1], ["G", 1], ["H", 1], ["J", 1], ["K", 1], ["L", 1], [";", 1], ["'", 1], ["ret", 2.25]],
  [["shift", 2.25], ["Z", 1], ["X", 1], ["C", 1], ["V", 1], ["B", 1], ["N", 1], ["M", 1], [",", 1], [".", 1], ["/", 1], ["shift", 2.75]],
  [["ctrl", 1.25], ["win", 1.25], ["alt", 1.25], ["", 7.5], ["alt", 1.25], ["fn", 1.25], ["ctrl", 1.25]],
];

export const CASE_W = 15 * U;
export const CASE_D = 5 * U;
export const MARGIN = 14;

export const Z = {
  caseBot: 0,
  caseTop: 16,
  foamBot: 16,
  foamTop: 21,
  pcbBot: 21,
  pcbTop: 24.6,
  plateBot: 24.6,
  plateTop: 27.6,
  swBot: 24.6,
  swTop: 43.6,
  capBot: 43.6,
  capTop: 55.6,
};

export const LAYERS = [
  { id: "case", label: "外壳", dz: 0 },
  { id: "foam", label: "硅胶垫", dz: 1 },
  { id: "pcb", label: "PCB", dz: 2 },
  { id: "plate", label: "定位板", dz: 3 },
  { id: "switch", label: "轴体", dz: 4 },
  { id: "cap", label: "键帽", dz: 5 },
];

export const STEP = 104;

export function keys() {
  const out = [];
  LAYOUT.forEach((row, r) => {
    let x = 0;
    row.forEach(([label, w]) => {
      const cx = (x + w / 2) * U - CASE_W / 2;
      const cy = (r + 0.5) * U - CASE_D / 2;
      out.push({ label, w, row: r, cx, cy, col: x });
      x += w;
    });
  });
  return out;
}

const ACCENT = new Set(["W", "A", "S", "D", "esc", "ret", "space"]);

export function keycap(k, P, dz, mat) {
  const w = k.w * U - GAP;
  const d = U - GAP;
  const taper = 2.6;
  const bottom = ring(k.cx, k.cy, w, d, 1.7, 3);
  const top = ring(k.cx, k.cy, w - taper * 2, d - taper * 2, Math.max(0, 1.7 - taper * 0.6), 3);
  const paths = frustum(bottom, top, Z.capBot + dz, Z.capTop + dz, P);
  const m = mat ?? (k.label === "" ? "capWide" : ACCENT.has(k.label) ? "accent" : "cap");
  return solid(paths, m);
}

export function switchSvg(k, P, dz, mode = "mech") {
  const w = 14.2;
  const parts = [];
  parts.push(solid(prism({ cx: k.cx, cy: k.cy, w, d: w, r: 1 }, Z.swBot + dz, 3.4, P), "housingLo"));
  parts.push(solid(prism({ cx: k.cx, cy: k.cy, w, d: w, r: 1 }, Z.swBot + 3.4 + dz, 12.6, P), "housing"));
  if (mode === "magnet") {
    parts.push(solid(prism({ cx: k.cx, cy: k.cy, w: 5.6, d: 5.6, r: 0.7 }, Z.swBot + 16 + dz, 3.4, P), "magnet"));
    parts.push(solid(prism({ cx: k.cx, cy: k.cy, w: 3.6, d: 3.6, r: 0.4 }, Z.swBot + 19.4 + dz, 2.2, P), "stem"));
  } else {
    parts.push(solid(prism({ cx: k.cx, cy: k.cy, w: 6.8, d: 6.8, r: 0.7 }, Z.swBot + 16 + dz, 3.2, P), "stem"));
    parts.push(solid(prism({ cx: k.cx, cy: k.cy, w: 4.4, d: 4.4, r: 0.5 }, Z.swBot + 19.2 + dz, 2.4, P), "stem"));
  }
  return parts.join("");
}

export function plateSvg(P, dz) {
  const w = CASE_W - 6;
  const d = CASE_D - 6;
  const parts = [];
  parts.push(solid(prism({ cx: 0, cy: 0, w, d, r: 3 }, Z.plateBot + dz, Z.plateTop - Z.plateBot, P), "plate"));
  const holes = [];
  for (const k of keys()) {
    const h = 6.5;
    holes.push(
      K.pathOf(
        [
          [k.cx - h, k.cy - h],
          [k.cx + h, k.cy - h],
          [k.cx + h, k.cy + h],
          [k.cx - h, k.cy + h],
        ].map(([x, y]) => K.iso([x, y, Z.plateTop + dz + 0.03], P)),
        true
      )
    );
  }
  parts.push(`<path d="${holes.join("")}" fill="#07080a"/>`);
  return parts.join("");
}

export function pcbSvg(P, dz) {
  const w = CASE_W - 10;
  const d = CASE_D - 10;
  const parts = [];
  parts.push(solid(prism({ cx: 0, cy: 0, w, d, r: 2.5 }, Z.pcbBot + dz, Z.pcbTop - Z.pcbBot, P), "pcb"));
  const z = Z.pcbTop + dz + 0.04;
  const traces = [];
  for (let r = 0; r < 5; r++) {
    const y = (r + 0.5) * U - CASE_D / 2 - 8.5;
    traces.push(K.lineOnTop([-w / 2 + 7, y], [w / 2 - 7, y], z, P));
  }
  for (let c = 0; c < 9; c++) {
    const x = (c + 0.5) * (w / 9) - w / 2;
    traces.push(K.lineOnTop([x, -d / 2 + 7], [x, d / 2 - 7], z, P));
  }
  parts.push(`<path d="${traces.join("")}" fill="none" stroke="#3c9a82" stroke-width="0.85" opacity="0.6"/>`);
  const pads = [];
  for (const k of keys()) {
    pads.push([...K.iso([k.cx - 5, k.cy + 5, z], P), 0.6]);
    pads.push([...K.iso([k.cx + 5, k.cy + 5, z], P), 0.6]);
  }
  parts.push(K.dotsSvg(pads, { size: 1.5, tone: "hi" }));
  const chips = [];
  for (const [x, y, cw, cd] of [[-64, 40, 24, 17], [52, -36, 19, 19], [-96, -30, 15, 12]]) {
    chips.push(solid(prism({ cx: x, cy: y, w: cw, d: cd, r: 0.8 }, Z.pcbTop + dz + 0.04, 3.6, P), "chip"));
  }
  parts.push(chips.join(""));
  return parts.join("");
}

export function foamSvg(P, dz) {
  const w = CASE_W - 12;
  const d = CASE_D - 12;
  const parts = [];
  parts.push(solid(prism({ cx: 0, cy: 0, w, d, r: 6 }, Z.foamBot + dz, Z.foamTop - Z.foamBot, P), "foam"));
  const z = Z.foamTop + dz + 0.04;
  const holes = [];
  for (const k of keys()) {
    holes.push(
      K.pathOf(
        [
          [k.cx - 6.2, k.cy - 6.2],
          [k.cx + 6.2, k.cy - 6.2],
          [k.cx + 6.2, k.cy + 6.2],
          [k.cx - 6.2, k.cy + 6.2],
        ].map(([x, y]) => K.iso([x, y, z], P)),
        true
      )
    );
  }
  parts.push(`<path d="${holes.join("")}" fill="#0a0a0c"/>`);
  return parts.join("");
}

export function caseSvg(P, dz) {
  const w = CASE_W + MARGIN * 2;
  const d = CASE_D + MARGIN * 2;
  const parts = [];
  const feet = [];
  for (const [fx, fy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    feet.push(solid(tube(fx * (w / 2 - 30), fy * (d / 2 - 24), 10, 9, Z.caseBot + dz - 7, Z.caseBot + dz, P, 14), "case"));
  }
  parts.push(solid(prism({ cx: 0, cy: 0, w, d, r: 10 }, Z.caseBot + dz, Z.caseTop - Z.caseBot, P), "case", { halo: true }));
  const inner = { w: CASE_W + 5, d: CASE_D + 5, r: 5 };
  const ip = ring(0, 0, inner.w, inner.d, inner.r, 4);
  parts.push(`<path d="${K.pathOf(ip.map(([x, y]) => K.iso([x, y, Z.caseTop + dz + 0.03], P)), true)}" fill="#08090b"/>`);
  parts.push(K.lineSvg(K.pathOf(ip.map(([x, y]) => K.iso([x, y, Z.caseTop + dz + 0.06], P)), true), { tone: "faint" }));
  return feet.join("") + parts.join("");
}

const depth = (p, P) => K.depthOf([p[0], p[1], p[2]], P);

export function sceneStack(W, H, opts = {}) {
  const { az = 40, el = 30, pad = 56, step = STEP, spread = 1 } = opts;
  const probe = [];
  const topZ = Z.capTop + step * 5 * spread + 8;
  const botZ = Z.caseBot - 10;
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    for (const [rx, ry] of [[CASE_W / 2 + MARGIN, CASE_D / 2 + MARGIN], [CASE_W / 2 * 0.92, CASE_D / 2 * 0.92]]) {
      probe.push([Math.cos(a) * rx, Math.sin(a) * ry, botZ]);
      probe.push([Math.cos(a) * rx, Math.sin(a) * ry, topZ]);
    }
  }
  const P = K.fitProjection(probe, W, H, { pad, azimuth: az, elevation: el });
  const groups = [];
  for (const L of LAYERS) {
    const dz = L.dz * step * spread;
    let inner = "";
    if (L.id === "case") inner = caseSvg(P, dz);
    else if (L.id === "foam") inner = foamSvg(P, dz);
    else if (L.id === "pcb") inner = pcbSvg(P, dz);
    else if (L.id === "plate") inner = plateSvg(P, dz);
    else if (L.id === "switch") {
      const ks = keys().slice().sort((a, b) => depth([a.cx, a.cy, Z.swTop], P) - depth([b.cx, b.cy, Z.swTop], P));
      inner = ks.map((k) => switchSvg(k, P, dz, opts.mode ?? "mech")).join("");
    } else if (L.id === "cap") {
      const ks = keys().slice().sort((a, b) => depth([a.cx, a.cy, Z.capTop], P) - depth([b.cx, b.cy, Z.capTop], P));
      inner = ks.map((k) => keycap(k, P, dz)).join("");
    }
    groups.push(`<g id="L-${L.id}" data-layer="${L.id}" data-dz="${L.dz * step}">${inner}</g>`);
  }
  const css = `${matCss()}\n.fig{display:block;overflow:visible}`;
  return { svg: svgDoc(W, H, groups.join("\n"), css), P };
}

export function pointsAt(P, p) {
  const [x, y] = K.iso(p, P);
  return [x, y];
}
