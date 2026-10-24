import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { svgDoc, leader, tag, INK, matCss } from "./lib.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const dir = resolve(__dirname, "../assets/figures");
mkdirSync(dir, { recursive: true });

const FW = 1240;
const FH = 1080;
const css = matCss() + `
.wave-orange { stroke: #ff7a45; stroke-width: 3.5; fill: none; filter: drop-shadow(0 0 8px rgba(255,122,69,0.4)); }
.wave-cyan { stroke: #00d2ff; stroke-width: 3.5; fill: none; filter: drop-shadow(0 0 8px rgba(0,210,255,0.4)); }
.wave-flat { stroke: #5ad2c0; stroke-width: 4; fill: none; stroke-dasharray: 6 4; }
.chip-body { fill: #121822; stroke: #2a3648; stroke-width: 2; }
.shell { fill: #18202d; stroke: #3b485d; stroke-width: 2; }
.cushion { fill: #222c3d; stroke: #4f617d; stroke-width: 1.5; }
.glow-dot { fill: #00d2ff; filter: drop-shadow(0 0 6px #00d2ff); }
`;

// 01: 耳机结构解构图
function fHeadphone() {
  const cx = 620;
  const cy = 480;
  const body = `
  <g class="iso-group" transform="translate(0, 40)">
    <!-- 弧形头梁 -->
    <path d="M 380,520 C 380,240 860,240 860,520" fill="none" stroke="#2a3545" stroke-width="36" stroke-linecap="round"/>
    <path d="M 400,520 C 400,270 840,270 840,520" fill="none" stroke="#485870" stroke-width="12" stroke-linecap="round"/>
    
    <!-- 左耳罩（主体） -->
    <g transform="translate(360, 520)">
      <!-- 伸缩连接叉 -->
      <rect x="-14" y="-40" width="28" height="60" rx="6" fill="#323f52" stroke="#5d6f8a" stroke-width="2"/>
      <!-- 耳罩外壳椭圆 -->
      <ellipse cx="0" cy="80" rx="95" ry="145" class="shell"/>
      <ellipse cx="0" cy="80" rx="72" ry="118" fill="#0f151f" stroke="#222c3d" stroke-width="2"/>
      <!-- 声学阻尼网与单元 -->
      <circle cx="0" cy="80" r="44" fill="#182333" stroke="#00d2ff" stroke-width="2" stroke-dasharray="4 3"/>
      <circle cx="0" cy="80" r="16" fill="#ff7a45"/>
      <!-- 耳垫 -->
      <ellipse cx="14" cy="80" rx="76" ry="132" fill="none" stroke="#3d4d65" stroke-width="18"/>
      <!-- 降噪麦克风拾音孔 -->
      <circle cx="-65" cy="40" r="4.5" class="glow-dot"/>
      <circle cx="-65" cy="120" r="4.5" class="glow-dot"/>
    </g>

    <!-- 右耳罩（对称暗部投影） -->
    <g transform="translate(880, 520)">
      <rect x="-14" y="-40" width="28" height="60" rx="6" fill="#242c38" stroke="#3b485d" stroke-width="2"/>
      <ellipse cx="0" cy="80" rx="90" ry="140" fill="#111620" stroke="#253040" stroke-width="2"/>
      <ellipse cx="-12" cy="80" rx="72" ry="126" fill="none" stroke="#1d2633" stroke-width="16"/>
    </g>

    <!-- 引线指示标注 -->
    ${leader(295, 560, 210, 520, "前馈麦克风 FF MIC", { tone: "#00d2ff", anchor: "end" })}
    ${leader(360, 600, 220, 660, "40mm 动圈单元 DRIVER", { tone: "#ff7a45", anchor: "end" })}
    ${leader(435, 620, 520, 720, "高密度记忆海绵 FOAM", { tone: "#8b95a3", anchor: "start" })}
    ${leader(620, 255, 740, 210, "铝合金轻量头梁 HEADBAND", { tone: "#8b95a3", anchor: "start" })}
  </g>
  `;
  return svgDoc(FW, FH, body, css);
}

// 02: 反相声波干涉相消图
function fAntiWave() {
  const body = `
  <g class="anc-wave-graph" transform="translate(100, 80)">
    <!-- 标尺基准线 -->
    <line x1="80" y1="260" x2="980" y2="260" stroke="#212a38" stroke-width="1.5" stroke-dasharray="6 6"/>
    <line x1="80" y1="520" x2="980" y2="520" stroke="#212a38" stroke-width="1.5" stroke-dasharray="6 6"/>
    <line x1="80" y1="780" x2="980" y2="780" stroke="#212a38" stroke-width="1.5" stroke-dasharray="6 6"/>

    <!-- 1. 外界环境噪声正相波 -->
    <path d="M 120,260 Q 200,160 280,260 T 440,260 T 600,260 T 760,260 T 920,260" class="wave-orange"/>
    <text x="120" y="210" fill="#ff7a45" font-size="22" font-family="'JetBrains Mono',monospace" font-weight="600">+ 环境噪音声波 (NOISE WAVE 0°)</text>

    <!-- 2. 耳机实时计算产生的 180° 反向反相波 -->
    <path d="M 120,520 Q 200,620 280,520 T 440,520 T 600,520 T 760,520 T 920,520" class="wave-cyan"/>
    <text x="120" y="470" fill="#00d2ff" font-size="22" font-family="'JetBrains Mono',monospace" font-weight="600">- 实时反向声波 (ANTI-NOISE 180°)</text>

    <!-- 中间运算符号提示 -->
    <circle cx="530" cy="390" r="26" fill="#121822" stroke="#2a3648" stroke-width="2"/>
    <text x="530" y="398" fill="#dbe3ee" font-size="28" font-weight="700" text-anchor="middle">+</text>

    <line x1="400" y1="650" x2="660" y2="650" stroke="#3b485d" stroke-width="3"/>
    <polygon points="530,674 518,656 542,656" fill="#3b485d"/>

    <!-- 3. 相消叠加结果：完全静音的平滑直线 -->
    <line x1="120" y1="780" x2="920" y2="780" class="wave-flat"/>
    <text x="120" y="740" fill="#5ad2c0" font-size="24" font-family="'JetBrains Mono',monospace" font-weight="700">= 空气叠加相消静音 (DESTRUCTIVE SILENCE)</text>

    <!-- 标注 -->
    ${leader(280, 260, 360, 160, "外界声压波峰 PEAK", { tone: "#ff7a45", anchor: "start" })}
    ${leader(280, 520, 360, 620, "镜像精准反相波谷 TROUGH", { tone: "#00d2ff", anchor: "start" })}
    ${leader(680, 780, 780, 840, "残余噪音压制在-40dB以下", { tone: "#5ad2c0", anchor: "start" })}
  </g>
  `;
  return svgDoc(FW, FH, body, css);
}

const FIGS = {
  headphone: fHeadphone,
  "anti-wave": fAntiWave,
};

for (const [name, fn] of Object.entries(FIGS)) {
  const t0 = Date.now();
  const svg = fn();
  writeFileSync(`${dir}/${name}.svg`, svg, "utf8");
  console.log(name.padEnd(12), String(svg.length).padStart(8), "B", Date.now() - t0, "ms");
}
