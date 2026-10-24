import * as K from "../../vendor/anatomy-kit/iso-kit.mjs";
export { K };

export const area = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
};

export const orient = (pts) => (area(pts) < 0 ? [...pts].reverse() : pts);

export function runsOf(flags, want) {
  const count = flags.length;
  const runs = [];
  let start = -1;
  for (let i = 0; i < count; i++) {
    if (flags[i] !== flags[(i + count - 1) % count]) {
      start = i;
      break;
    }
  }
  if (start < 0) return flags[0] === want ? [Array.from({ length: count }, (_, i) => i).concat(0)] : [];
  let run = null;
  for (let k = 0; k < count; k++) {
    const i = (start + k) % count;
    if (flags[i] === want) {
      if (!run) {
        run = [];
        runs.push(run);
      }
      run.push(i);
    } else if (run) {
      run.push(i);
      run = null;
    }
  }
  if (run) run.push((start + count) % count);
  return runs;
}

export function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export function frustum(bottom, top, z0, z1, P) {
  const n = bottom.length;
  const counter = area(bottom) > 0;
  const [vx, vy] = K.towardViewer(P);
  const { sinA, cosA } = K.cameraOf(P);
  const normals = bottom.map(([ax, ay], i) => {
    const [bx, by] = bottom[(i + 1) % n];
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy) || 1;
    return counter ? [dy / L, -dx / L] : [-dy / L, dx / L];
  });
  const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
  const tp = top.map(([x, y]) => K.iso([x, y, z1], P));
  const bp = bottom.map(([x, y]) => K.iso([x, y, z0], P));
  const outline = [];
  const crease = [];
  for (const run of runsOf(facing, false)) outline.push(K.pathOf(run.map((i) => tp[i])));
  for (const run of runsOf(facing, true)) {
    crease.push(K.pathOf(run.map((i) => tp[i])));
    outline.push(K.pathOf(run.map((i) => bp[i])));
  }
  for (let i = 0; i < n; i++) {
    if (facing[(i + n - 1) % n] !== facing[i]) outline.push(K.pathOf([tp[i], bp[i]]));
  }
  const buckets = Array.from({ length: 4 }, () => []);
  const back = [];
  const [lx, ly] = [-sinA, cosA];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (!facing[i]) {
      back.push(K.pathOf([tp[i], tp[j], bp[j], bp[i]]));
      continue;
    }
    const [nx, ny] = normals[i];
    const lit = (nx * lx + ny * ly + 1) / 2;
    const s = Math.min(3, Math.max(0, Math.floor(lit * 4)));
    buckets[s].push(K.pathOf(orient([tp[i], tp[j], bp[j], bp[i]])));
  }
  return {
    fill: K.pathOf(convexHull([...tp, ...bp]), true),
    outline: outline.join(""),
    crease: crease.join(""),
    top: K.pathOf(orient(tp), true),
    shades: buckets.map((b) => b.join("")),
    back: back.join(""),
  };
}

export function ring(cx, cy, w, d, r = 0, steps = 4) {
  const hw = w / 2;
  const hd = d / 2;
  const rad = Math.max(0, Math.min(r, hw, hd));
  if (rad < 0.01) return [[cx - hw, cy - hd], [cx + hw, cy - hd], [cx + hw, cy + hd], [cx - hw, cy + hd]];
  const pts = [];
  const corners = [
    [cx + hw - rad, cy - hd + rad, -Math.PI / 2],
    [cx + hw - rad, cy + hd - rad, 0],
    [cx - hw + rad, cy + hd - rad, Math.PI / 2],
    [cx - hw + rad, cy - hd + rad, Math.PI],
  ];
  for (const [ox, oy, a0] of corners) {
    for (let s = 0; s < steps; s++) {
      const a = a0 + (s / steps) * (Math.PI / 2);
      pts.push([ox + Math.cos(a) * rad, oy + Math.sin(a) * rad]);
    }
  }
  return pts;
}

export function prism(plan, z0, h, P, { taper = 0, steps = 4 } = {}) {
  const { cx, cy, w, d, r = 0 } = plan;
  const bottom = ring(cx, cy, w, d, r, steps);
  const top = taper > 0 ? ring(cx, cy, w - taper * 2, d - taper * 2, Math.max(0, r - taper * 0.6), steps) : bottom;
  return frustum(bottom, top, z0, z0 + h, P);
}

export function tube(cx, cy, r0, r1, z0, z1, P, steps = 20) {
  const bottom = K.circleRing(cx, cy, r0, steps);
  const top = K.circleRing(cx, cy, r1, steps);
  return frustum(bottom, top, z0, z1, P);
}

export const MATS = {
  case: { face: "#171b21", top: "#2b323d", shades: ["#0b0e12", "#11151a", "#171c22", "#1e242c"], edge: "#5c6674" },
  deck: { face: "#1c2129", top: "#333b47", shades: ["#0d1014", "#13171c", "#1a1f26", "#222831"], edge: "#68727f" },
  cap: { face: "#2a3038", top: "#4a5462", shades: ["#15181d", "#1d222a", "#262c35", "#313845"], edge: "#8b95a4" },
  capOn: { face: "#5d6878", top: "#828fa3", shades: ["#31383f", "#3d4551", "#4a5360", "#5d6878"], edge: "#b9c4d4" },
  accent: { face: "#a2432f", top: "#c95a3c", shades: ["#5a2318", "#722c1e", "#8a3626", "#a2432f"], edge: "#ff9670" },
  capWide: { face: "#262c34", top: "#414a57", shades: ["#13161a", "#1a1f25", "#222830", "#2c333c"], edge: "#7d8797" },
  chip: { face: "#1a1e24", top: "#2a313a", shades: ["#0c0e11", "#12151a", "#181c22", "#20252c"], edge: "#59616e" },
  plate: { face: "#39414c", top: "#5a6474", shades: ["#1c2128", "#262c35", "#323a45", "#414a58"], edge: "#9aa5b6" },
  pcb: { face: "#14453a", top: "#1c6352", shades: ["#081f1a", "#0d2e27", "#113b32", "#164a3f"], edge: "#43b294" },
  gold: { face: "#8a6c31", top: "#b08a3f", shades: ["#43341a", "#584421", "#6e5629", "#8a6c31"], edge: "#e6bd68" },
  foam: { face: "#22222a", top: "#383843", shades: ["#111114", "#17171b", "#1d1d23", "#25252c"], edge: "#6a6a7a" },
  housing: { face: "#434c59", top: "#636e7e", shades: ["#20252c", "#2b313a", "#363e49", "#434c59"], edge: "#a3aebe" },
  housingLo: { face: "#2c333c", top: "#434c59", shades: ["#14181d", "#1d222a", "#262c35", "#303845"], edge: "#7b8595" },
  stem: { face: "#cfd7e2", top: "#eef3f9", shades: ["#7e8794", "#99a3b1", "#b4bfcd", "#cfd7e2"], edge: "#ffffff" },
  spring: { face: "#98a2b0", top: "#c0cad6", shades: ["#5b636f", "#6e7784", "#838d9b", "#98a2b0"], edge: "#e2e9f2" },
  copper: { face: "#94592d", top: "#b87340", shades: ["#4d2b15", "#63371c", "#7a4624", "#94592d"], edge: "#e8a066" },
  magnet: { face: "#7a3244", top: "#a0455a", shades: ["#3d1822", "#4f1f2c", "#622837", "#7a3244"], edge: "#e07a92" },
  sensor: { face: "#173a4d", top: "#1f4d64", shades: ["#0b1e28", "#0f2734", "#143141", "#173a4d"], edge: "#3f8fae" },
  accent2: { face: "#1f6b5e", top: "#28897a", shades: ["#0d2f29", "#123d35", "#184f45", "#1f6b5e"], edge: "#4fd1b8" },
};

export function matCss() {
  const out = [
    ".iso-line{fill:none;stroke-linecap:round;stroke-linejoin:round}",
    ".iso-edge{fill:none;stroke-linecap:round;stroke-linejoin:round}",
    ".iso-crease{fill:none;stroke-linecap:round;stroke-linejoin:round}",
    ".iso-fill,.iso-top,.iso-shade{stroke-linejoin:round}",
  ];
  for (const [name, m] of Object.entries(MATS)) {
    const s = `.m-${name}`;
    const q = [`${s}`, `${s}[data-lit]`, `${s}[data-seamless]`, `${s}[data-lit][data-seamless]`];
    for (const p of q) {
      out.push(`${p}>.iso-fill{fill:${m.face};stroke:none}`);
      out.push(`${p}>.iso-top{fill:${m.top};stroke:${m.top};stroke-width:.45;stroke-linejoin:round}`);
      m.shades.forEach((c, i) =>
        out.push(`${p}>.iso-shade[data-shade="${i}"]{fill:${c};stroke:${c};stroke-width:.45;stroke-linejoin:round}`)
      );
      out.push(`${p}>.iso-edge{stroke:${m.edge};stroke-width:.7}`);
      out.push(`${p}>.iso-crease{stroke:${m.edge};stroke-width:.5;opacity:.5}`);
    }
    out.push(`${s}>.iso-halo{fill:#000;opacity:.9;filter:blur(10px)}`);
  }
  return out.join("\n");
}

export const solid = (paths, mat, opts = {}) => K.solidSvg(paths, { className: `m-${mat}`, crease: "none", ...opts });

export const INK = {
  bg: "#08090b",
  card: "#0c0e11",
  line: "#20242b",
  ink: "#e9eef6",
  dim: "#8b95a3",
  faint: "#4b5462",
  hot: "#ff8a5c",
  cool: "#5ad2c0",
};

export function leader(ax, ay, bx, by, label, opts = {}) {
  const { tone = INK.dim, size = 21, anchor = "start", gap = 26 } = opts;
  const dx = bx - ax;
  const dy = by - ay;
  const L = Math.hypot(dx, dy) || 1;
  const ex = bx + (dx / L) * gap;
  const ey = by + (dy / L) * gap;
  const elbow = anchor === "end" ? ex - 34 : ex + 34;
  return `<g class="lbl">
<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3.4" fill="none" stroke="${tone}" stroke-width="1.2"/>
<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="1.3" fill="${tone}"/>
<path d="M${ax.toFixed(1)},${ay.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)} L${elbow.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${tone}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${(elbow + (anchor === "end" ? -12 : 12)).toFixed(1)}" y="${(ey + size * 0.35).toFixed(1)}" fill="${tone}" font-size="${size}" text-anchor="${anchor}" font-family="'Noto Sans SC','Microsoft YaHei',sans-serif">${label}</text>
</g>`;
}

export function tag(x, y, label, opts = {}) {
  const { tone = INK.ink, size = 19, weight = 500, anchor = "start", mono = false } = opts;
  const fam = mono ? "'JetBrains Mono','Consolas',monospace" : "'Noto Sans SC','Microsoft YaHei',sans-serif";
  return `<text class="tag" x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${tone}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" font-family="${fam}">${label}</text>`;
}

export function svgDoc(w, h, body, css, bg) {
  const back = bg
    ? `<defs><radialGradient id="vig" cx="50%" cy="42%" r="72%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#vig)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="fig">
<style>${css}</style>
${back}
${body}
</svg>`;
}
