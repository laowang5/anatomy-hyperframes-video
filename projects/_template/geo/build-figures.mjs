import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../assets/figures");
mkdirSync(OUT_DIR, { recursive: true });

const W = 1240;
const H = 1080;
const P = { origin: [W / 2, H / 2 + 60], scale: 1.8, azimuth: 45, elevation: 30 };

// 绘制一个最小等轴测方块
const cube = L.prism({ cx: 0, cy: 0, w: 120, d: 120, r: 8 }, 0, 80, P);
const pTop = L.K.iso([0, 0, 80], P);

const body = `
<g class="m-housing">
  ${L.solid(cube, "housing")}
</g>
${L.leader(pTop[0], pTop[1], pTop[0] + 160, pTop[1] - 80, "SAMPLE PART", { tone: L.INK.hot, anchor: "start" })}
`;

const svg = L.svgDoc(W, H, body, L.matCss(), [L.INK.bg, "#0f172a"]);
writeFileSync(resolve(OUT_DIR, "hero.svg"), svg, "utf8");
console.log("✅ [Template] Generated sample assets/figures/hero.svg");
