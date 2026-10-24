import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = "G:/Workspace/kb-video";
const VOICE = join(ROOT, "assets/voice");

const dur = (f) =>
  Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], {
      encoding: "utf8",
    }).trim()
  );

const SCENES = [
  {
    id: "01-hook",
    num: "01",
    en: "THE STACK",
    cn: "一把键盘，六层结构",
    fig: "hero",
    lead: "每按下一颗键，背后都有一条精密的小型机械链路在同时工作。",
    lines: [
      ["键帽", "CAP"],
      ["轴体", "SWITCH"],
      ["定位板", "PLATE"],
      ["电路板", "PCB"],
      ["硅胶垫", "FOAM"],
      ["外壳", "CASE"],
    ],
  },
  {
    id: "02-cap",
    num: "02",
    en: "KEYCAP",
    cn: "键帽不只是印字的盖子",
    fig: "cap",
    lead: "内壁有加强筋，底部是一个十字柱，靠它扣在轴心上。",
    lines: [
      ["十字柱", "CROSS STEM"],
      ["加强筋", "RIBS"],
      ["球面弧度", "DISH"],
    ],
  },
  {
    id: "03-switch",
    num: "03",
    en: "MECHANICAL SWITCH",
    cn: "机械轴：一次真实的接触",
    fig: "switch",
    lead: "轴心压着弹簧下沉，两片金属弹片接触，电路闭合。",
    lines: [
      ["上盖", "TOP HOUSING"],
      ["轴心", "STEM"],
      ["弹簧", "SPRING"],
      ["弹片", "LEAF"],
      ["下盖", "BOTTOM"],
    ],
  },
  {
    id: "04-magnet",
    num: "04",
    en: "MAGNETIC SWITCH",
    cn: "磁轴：全程没有接触",
    fig: "magnet",
    lead: "轴心里装着一颗磁铁，正下方是霍尔传感器，靠磁场变化判断按了多深。",
    lines: [
      ["磁铁", "MAGNET"],
      ["霍尔传感器", "HALL SENSOR"],
      ["可调触发点", "ADJUSTABLE"],
      ["连续快速触发", "RAPID TRIGGER"],
    ],
  },
  {
    id: "05-plate",
    num: "05",
    en: "PLATE",
    cn: "定位板固定住每一颗轴",
    fig: "plate",
    lead: "开满方孔的金属板，决定每颗轴的位置和角度，敲击手感才一致。",
    lines: [
      ["开孔精度", "1.5mm 卡扣"],
      ["材质决定手感", "铝 / 铜 / FR4"],
      ["抑制晃动", "NO WOBBLE"],
    ],
  },
  {
    id: "06-pcb",
    num: "06",
    en: "CIRCUIT BOARD",
    cn: "电路板把动作翻译成字符",
    fig: "pcb",
    lead: "主控芯片逐行扫描按键矩阵，热插拔座让换轴不用焊接。",
    lines: [
      ["按键矩阵", "ROW × COL"],
      ["主控芯片", "MCU"],
      ["热插拔座", "HOT-SWAP"],
      ["二极管", "防鬼键"],
    ],
  },
  {
    id: "07-foam",
    num: "07",
    en: "DAMPENING FOAM",
    cn: "硅胶垫填满空腔",
    fig: "foam",
    lead: "把外壳里的余音吸掉，敲击声变得干净、厚实。",
    lines: [
      ["吸收空腔共鸣", "LESS HOLLOW"],
      ["改变声音性格", "THOCK"],
    ],
  },
  {
    id: "08-case",
    num: "08",
    en: "CASE",
    cn: "外壳是最后一块拼图",
    fig: "case",
    lead: "它决定整把键盘的重量、倾角和声音的性格，也把所有零件固定成一个整体。",
    lines: [
      ["重量与配重", "STABILITY"],
      ["倾角", "TYPING ANGLE"],
      ["固定结构", "GASKET / TRAY"],
    ],
  },
  {
    id: "09-outro",
    num: "09",
    en: "ONE MOTION",
    cn: "六层结构，一个动作",
    fig: "stack",
    lead: "键帽、轴体、定位板、电路板、硅胶垫、外壳。几十个零件，最后只为了：按下，然后松开。",
    lines: [],
  },
];

for (const s of SCENES) s.key = "k" + s.id;

const PAD = 1.05;
let t = 0;
for (const s of SCENES) {
  s.voice = dur(join(VOICE, `${s.id}.mp3`));
  s.len = Number((s.voice + PAD).toFixed(2));
  s.start = Number(t.toFixed(2));
  t += s.len;
}
const TOTAL = Number(t.toFixed(2));

const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const BASE_CSS = `
@font-face{font-family:"YaHei";src:local("Microsoft YaHei"),local("Microsoft YaHei UI");font-weight:100 900}
#root{position:absolute;inset:0;overflow:hidden;background:#05060a;
  font-family:"YaHei",sans-serif;color:#eef2f8}
.bg{position:absolute;inset:0;
  background:radial-gradient(120% 90% at 62% 44%,#161c25 0%,#0b0e13 52%,#05060a 100%)}
.grid{position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(120,150,190,.055) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(120,150,190,.055) 1px,transparent 1px);
  background-size:64px 64px;
  -webkit-mask-image:radial-gradient(75% 65% at 50% 50%,#000 30%,transparent 100%)}
.rule{position:absolute;left:96px;top:150px;width:2px;height:0;background:linear-gradient(180deg,#ff7a45,rgba(255,122,69,0))}
.num{position:absolute;left:96px;top:92px;font-family:"JetBrains Mono",Consolas,monospace;
  font-size:15px;letter-spacing:.34em;color:#ff8a5c}
.en{position:absolute;left:96px;top:120px;font-family:"JetBrains Mono",Consolas,monospace;
  font-size:13px;letter-spacing:.42em;color:#5d6878}
.h1{position:absolute;left:94px;top:186px;width:560px;font-size:64px;line-height:1.22;
  font-weight:700;letter-spacing:.01em;color:#f4f7fb}
.lead{position:absolute;left:96px;top:392px;width:520px;font-size:25px;line-height:1.78;
  color:#9aa6b6;font-weight:400}
.list{position:absolute;left:96px;top:560px;width:520px}
.row{position:relative;height:52px;display:flex;align-items:center;gap:18px;
  border-bottom:1px solid rgba(120,150,190,.13)}
.row i{width:6px;height:6px;border-radius:50%;background:#ff7a45;flex:none}
.row b{font-size:23px;font-weight:500;color:#dbe3ee;letter-spacing:.02em}
.row span{font-family:"JetBrains Mono",Consolas,monospace;font-size:12px;letter-spacing:.1em;
  color:#6b7787;margin-left:auto;padding-right:4px}
.figwrap{position:absolute;right:36px;top:60px;width:1180px;height:960px}
.figwrap img{width:100%;height:100%;object-fit:contain}
.spot{position:absolute;right:80px;top:110px;width:1140px;height:830px;border-radius:50%;
  background:radial-gradient(circle,rgba(90,140,190,.20) 0%,rgba(90,140,190,.05) 46%,transparent 70%)}
.bar{position:absolute;left:96px;bottom:74px;width:1728px;height:2px;background:rgba(120,150,190,.16)}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#ff7a45,#5ad2c0);transform-origin:left center}
.foot{position:absolute;left:96px;bottom:40px;font-family:"JetBrains Mono",Consolas,monospace;
  font-size:12.5px;letter-spacing:.3em;color:#4e5866}
.pg{position:absolute;right:96px;bottom:40px;font-family:"JetBrains Mono",Consolas,monospace;
  font-size:12.5px;letter-spacing:.3em;color:#5d6878}
`;

function sceneHtml(s) {
  const d = s.len;
  const rows = s.lines
    .map(
      ([cn, en], i) => `      <div id="${s.key}-r${i}" class="clip row" data-start="0" data-duration="${d}">
        <i></i><b>${esc(cn)}</b><span>${esc(en)}</span>
      </div>`
    )
    .join("\n");

  const rowsIn = s.lines
    .map(
      ([, ,], i) =>
        `    tl.fromTo("#${s.key}-r${i}",{opacity:0,x:-18},{opacity:1,x:0,duration:.42,ease:"power3.out"},${(0.95 + i * 0.11).toFixed(2)});`
    )
    .join("\n");

  return `<template>
  <style>${BASE_CSS}</style>
  <div id="root" data-composition-id="${s.key}" data-width="1920" data-height="1080">
    <div class="bg"></div>
    <div class="grid"></div>
    <div class="spot" id="${s.key}-spot"></div>
    <div class="rule" id="${s.key}-rule"></div>
    <div id="${s.key}-num" class="clip num" data-start="0" data-duration="${d}">${s.num}</div>
    <div id="${s.key}-en" class="clip en" data-start="0" data-duration="${d}">${esc(s.en)}</div>
    <h1 id="${s.key}-h1" class="clip h1" data-start="0" data-duration="${d}">${esc(s.cn)}</h1>
    <p id="${s.key}-lead" class="clip lead" data-start="0" data-duration="${d}">${esc(s.lead)}</p>
    <div id="${s.key}-list" class="clip list" data-start="0" data-duration="${d}">
${rows}
    </div>
    <div class="figwrap" id="${s.key}-fig">
      <img id="${s.key}-img" class="clip" src="assets/figures/${s.fig}.svg" data-start="0" data-duration="${d}" alt="">
    </div>
    <div class="bar"><i id="${s.key}-prog"></i></div>
    <div class="foot">ANATOMY × HYPERFRAMES — MECHANICAL KEYBOARD</div>
    <div class="pg">${s.num} / 09</div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#${s.key}-img",{opacity:0,scale:.93,y:26},{opacity:1,scale:1,y:0,duration:1.05,ease:"power3.out"},0);
    tl.fromTo("#${s.key}-img",{rotation:-1.2},{rotation:0,duration:${d.toFixed(2)},ease:"none"},0);
    tl.fromTo("#${s.key}-spot",{opacity:0},{opacity:1,duration:1.1,ease:"power2.out"},0);
    tl.fromTo("#${s.key}-num",{opacity:0,y:-10},{opacity:1,y:0,duration:.5,ease:"power3.out"},.05);
    tl.fromTo("#${s.key}-en",{opacity:0},{opacity:1,duration:.5,ease:"power2.out"},.18);
    tl.fromTo("#${s.key}-rule",{height:0,opacity:0},{height:96,opacity:1,duration:.6,ease:"power3.out"},.24);
    tl.fromTo("#${s.key}-h1",{opacity:0,y:24},{opacity:1,y:0,duration:.7,ease:"power3.out"},.3);
    tl.fromTo("#${s.key}-lead",{opacity:0,y:16},{opacity:1,y:0,duration:.65,ease:"power3.out"},.55);
${rowsIn}
    tl.fromTo("#${s.key}-prog",{scaleX:0},{scaleX:1,duration:${d.toFixed(2)},ease:"none"},0);
    window.__timelines["${s.key}"] = tl;
  </script>
</template>
`;
}

mkdirSync(join(ROOT, "compositions"), { recursive: true });
for (const s of SCENES) writeFileSync(join(ROOT, "compositions", `${s.id}.html`), sceneHtml(s));

const hosts = SCENES.map(
  (s) => `      <div
        id="${s.key}"
        class="scene"
        data-composition-id="${s.key}"
        data-composition-src="compositions/${s.id}.html"
        data-start="${s.start}"
        data-duration="${s.len}"
        data-track-index="1"
        data-track-kind="graphics"
      ></div>`
).join("\n");

const audios = SCENES.map(
  (s) => `    <audio
      id="vo-${s.id}"
      src="assets/voice/${s.id}.mp3"
      data-start="${s.start}"
      data-duration="${s.voice}"
      data-track-index="2"
      data-volume="1"
    ></audio>`
).join("\n");

const index = `<!DOCTYPE html>
<html lang="zh-CN" data-resolution="landscape">
  <head>
    <meta charset="utf-8" />
    <title>机械键盘工作原理 — Anatomy × HyperFrames</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html,body{margin:0;padding:0;background:#05060a;width:1920px;height:1080px;overflow:hidden}
      .scene{position:absolute;inset:0;width:100%;height:100%}
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${TOTAL}"
      data-width="1920"
      data-height="1080"
    >
${hosts}
${audios}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
writeFileSync(join(ROOT, "index.html"), index);
console.log("scenes", SCENES.length, "total", TOTAL, "s");
for (const s of SCENES) console.log(s.id, s.start, "+", s.len, "(voice", s.voice + ")");
