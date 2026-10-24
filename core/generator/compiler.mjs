import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { matCss } from "../styles/lib.mjs";

const dur = (f) => {
  if (!existsSync(f)) return 0;
  return Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], {
      encoding: "utf8",
    }).trim()
  );
};

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
.sub-dock{position:absolute;left:50%;bottom:52px;transform:translateX(-50%);z-index:90;
  width:100%;max-width:1600px;display:flex;justify-content:center;align-items:center;pointer-events:none}
.sub-line{font-size:38px;font-weight:600;letter-spacing:.03em;color:#f8fafc;
  text-shadow:0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.85);
  white-space:nowrap;text-align:center}
`;

function getWordTime(timings, sceneId, word, fallback) {
  const scene = timings[sceneId];
  if (!scene || !scene.words || !scene.words.length) return fallback;
  const match = scene.words.find((w) => w.text.includes(word));
  return match ? match.start : fallback;
}

export async function compileProject(projectDir) {
  const dir = resolve(projectDir);
  const voiceDir = join(dir, "assets/voice");
  const figDir = join(dir, "assets/figures");
  const compDir = join(dir, "compositions");
  mkdirSync(compDir, { recursive: true });

  // 1. 加载场景配置与元数据
  const configFile = join(dir, "scenes.config.mjs");
  if (!existsSync(configFile)) {
    throw new Error(`scenes.config.mjs not found in ${dir}`);
  }
  const { SCENES } = await import(pathToFileURL(configFile).href);

  // 2. 加载时间戳元数据
  const timingFile = join(voiceDir, "timing.json");
  const timings = existsSync(timingFile) ? JSON.parse(readFileSync(timingFile, "utf8")) : {};

  for (const s of SCENES) s.key = "k" + s.id;

  const PAD = 1.05;
  let t = 0;
  for (const s of SCENES) {
    s.voice = dur(join(voiceDir, `${s.id}.mp3`));
    s.len = Number((s.voice + PAD).toFixed(2));
    s.start = Number(t.toFixed(2));
    t += s.len;
  }
  const TOTAL = Number(t.toFixed(2));

  // 3. 编译每个子场景 HTML
  for (const s of SCENES) {
    const d = s.len;
    const rows = (s.lines || [])
      .map(
        ([cn, en], i) => `      <div id="${s.key}-r${i}" class="clip row" data-start="0" data-duration="${d}">
        <i></i><b>${esc(cn)}</b><span>${esc(en)}</span>
      </div>`
      )
      .join("\n");

    const rowsIn = (s.lines || [])
      .map(
        ([, ,], i) =>
          `    tl.fromTo("#${s.key}-r${i}",{opacity:0,x:-18},{opacity:1,x:0,duration:.42,ease:"power3.out"},${(0.95 + i * 0.11).toFixed(2)});`
      )
      .join("\n");

    let figureMarkup = "";
    let figureAnim = "";

    if (s.isInline) {
      const svgPath = join(figDir, `${s.fig}.svg`);
      const rawSvg = existsSync(svgPath) ? readFileSync(svgPath, "utf8") : "";
      figureMarkup = rawSvg.replace(
        /<svg[^>]*>/,
        `<svg id="${s.key}-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1080" class="clip fig" data-start="0" data-duration="${d}" style="width:100%;height:100%;object-fit:contain;">`
      );

      const tTop = getWordTime(timings, s.id, "上", 2.2);
      const tStem = getWordTime(timings, s.id, "轴心", 2.9);
      const tSpring = getWordTime(timings, s.id, "弹簧", 3.8);
      const tLeaf = getWordTime(timings, s.id, "弹片", 4.8);
      const tBottom = getWordTime(timings, s.id, "下", 6.2);
      const tPress = getWordTime(timings, s.id, "按下", 7.6);
      const tContact = getWordTime(timings, s.id, "接触", 9.4);
      const tClose = getWordTime(timings, s.id, "闭合", 10.2);

      figureAnim = `
    tl.fromTo("#${s.key}-svg",{opacity:0,scale:.93,y:26},{opacity:1,scale:1,y:0,duration:1.05,ease:"power3.out"},0);
    tl.to("#${s.key}-svg #s-top .iso-edge", { stroke: "#ff7a45", strokeWidth: 1.6, duration: 0.2 }, ${tTop.toFixed(2)})
      .to("#${s.key}-svg #s-top .iso-edge", { stroke: "#5d6878", strokeWidth: 0.7, duration: 0.4 }, ${(tTop + 0.3).toFixed(2)});
    tl.to("#${s.key}-svg #s-stem .iso-edge", { stroke: "#ff7a45", strokeWidth: 1.8, duration: 0.2 }, ${tStem.toFixed(2)})
      .to("#${s.key}-svg #s-stem .iso-edge", { stroke: "#7b8595", strokeWidth: 0.7, duration: 0.4 }, ${(tStem + 0.3).toFixed(2)});
    tl.to("#${s.key}-svg #s-spring", { scaleY: 0.9, yoyo: true, repeat: 1, duration: 0.25, transformOrigin: "620px 680px" }, ${tSpring.toFixed(2)});
    tl.to("#${s.key}-svg #s-contact .iso-edge", { stroke: "#ff7a45", strokeWidth: 1.8, duration: 0.2 }, ${tLeaf.toFixed(2)})
      .to("#${s.key}-svg #s-contact .iso-edge", { stroke: "#e8a066", strokeWidth: 0.7, duration: 0.4 }, ${(tLeaf + 0.3).toFixed(2)});
    tl.to("#${s.key}-svg #s-bottom .iso-edge", { stroke: "#ff7a45", strokeWidth: 1.6, duration: 0.2 }, ${tBottom.toFixed(2)})
      .to("#${s.key}-svg #s-bottom .iso-edge", { stroke: "#7b8595", strokeWidth: 0.7, duration: 0.4 }, ${(tBottom + 0.3).toFixed(2)});
    tl.to("#${s.key}-svg #s-stem", { y: "+=30", duration: 0.32, ease: "power2.in" }, ${tPress.toFixed(2)});
    tl.to("#${s.key}-svg #s-spring", { scaleY: 0.78, y: "+=12", transformOrigin: "620px 680px", duration: 0.32, ease: "power2.in" }, ${tPress.toFixed(2)});
    tl.to("#${s.key}-svg #s-contact .iso-edge", { stroke: "#ff7a45", strokeWidth: 2.2, duration: 0.15 }, ${tContact.toFixed(2)});
    tl.to("#${s.key}-svg .tag", { fill: "#ff7a45", duration: 0.15 }, ${tContact.toFixed(2)});
    tl.to("#${s.key}-svg #s-stem", { y: 0, duration: 0.45, ease: "elastic.out(1, 0.4)" }, ${(tClose + 0.5).toFixed(2)});
    tl.to("#${s.key}-svg #s-spring", { scaleY: 1, y: 0, duration: 0.45, ease: "elastic.out(1, 0.4)" }, ${(tClose + 0.5).toFixed(2)});
    tl.to("#${s.key}-svg #s-contact .iso-edge", { stroke: "#e8a066", strokeWidth: 0.7, duration: 0.3 }, ${(tClose + 0.7).toFixed(2)});
    tl.to("#${s.key}-svg .tag", { fill: "#5ad2c0", duration: 0.3 }, ${(tClose + 0.7).toFixed(2)});
    tl.fromTo("#${s.key}-fig", { rotation: -0.6 }, { rotation: 0.4, duration: ${d.toFixed(2)}, ease: "sine.inOut" }, 0);
    `;
    } else {
      figureMarkup = `<img id="${s.key}-img" class="clip" src="assets/figures/${s.fig}.svg" data-start="0" data-duration="${d}" alt="">`;
      figureAnim = `
    tl.fromTo("#${s.key}-img",{opacity:0,scale:.93,y:26},{opacity:1,scale:1,y:0,duration:1.05,ease:"power3.out"},0);
    tl.fromTo("#${s.key}-img",{rotation:-1.2},{rotation:0,duration:${d.toFixed(2)},ease:"none"},0);
    `;
    }

    const sceneTiming = timings[s.id] || {};
    const sceneSubs = sceneTiming.subtitles || [];

    const subMarkup = sceneSubs.length > 0 ? `
    <div class="sub-dock" id="${s.key}-subdock">
      ${sceneSubs
        .map(
          (sub, i) =>
            `<span id="${s.key}-sub-${i}" class="sub-line" style="opacity:0;position:absolute;white-space:nowrap;">${esc(
              sub.text
            )}</span>`
        )
        .join("\n      ")}
    </div>` : "";

    const subAnim = sceneSubs
      .map((sub, i) => {
        const inT = sub.start.toFixed(2);
        const outT = sub.end.toFixed(2);
        return `    tl.fromTo("#${s.key}-sub-${i}", {opacity:0, y:8}, {opacity:1, y:0, duration:0.25, ease:"power2.out"}, ${inT})
      .to("#${s.key}-sub-${i}", {opacity:0, y:-6, duration:0.2, ease:"power2.in"}, ${outT});`;
      })
      .join("\n");

    const html = `<template>
  <style>${BASE_CSS}\n${matCss()}</style>
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
      ${figureMarkup}
    </div>
    ${subMarkup}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${figureAnim}
    tl.fromTo("#${s.key}-spot",{opacity:0},{opacity:1,duration:1.1,ease:"power2.out"},0);
    tl.fromTo("#${s.key}-num",{opacity:0,y:-10},{opacity:1,y:0,duration:.5,ease:"power3.out"},.05);
    tl.fromTo("#${s.key}-en",{opacity:0},{opacity:1,duration:.5,ease:"power2.out"},.18);
    tl.fromTo("#${s.key}-rule",{height:0,opacity:0},{height:96,opacity:1,duration:.6,ease:"power3.out"},.24);
    tl.fromTo("#${s.key}-h1",{opacity:0,y:24},{opacity:1,y:0,duration:.7,ease:"power3.out"},.3);
    tl.fromTo("#${s.key}-lead",{opacity:0,y:16},{opacity:1,y:0,duration:.65,ease:"power3.out"},.55);
${rowsIn}
${subAnim}
    window.__timelines["${s.key}"] = tl;
  </script>
</template>
`;
    writeFileSync(join(compDir, `${s.id}.html`), html, "utf8");
  }

  // 4. 组装根 index.html
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

  const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN" data-resolution="landscape">
  <head>
    <meta charset="utf-8" />
    <title>${esc(sTitle(dir))} — Anatomy × HyperFrames</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html,body{margin:0;padding:0;background:#05060a;width:1920px;height:1080px;overflow:hidden}
      .scene{position:absolute;inset:0;width:100%;height:100%}
    </style>
  </head>
  <body>
    <div
      id="root"
      data-root="true"
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
  writeFileSync(join(dir, "index.html"), indexHtml, "utf8");
  return { scenesCount: SCENES.length, totalDuration: TOTAL };
}

function sTitle(dir) {
  const pJson = join(dir, "project.json");
  if (existsSync(pJson)) {
    try {
      const j = JSON.parse(readFileSync(pJson, "utf8"));
      if (j.name) return j.name;
    } catch {}
  }
  return "Technical Explainer";
}
