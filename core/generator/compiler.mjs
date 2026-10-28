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

function makeBaseCss(theme = {}) {
  const accent = theme.accent || "#ff7a45";
  const numColor = theme.accent || "#ff8a5c";
  const bg = theme.bg || "#05060a";
  return `
@font-face{font-family:"Microsoft YaHei";src:local("Microsoft YaHei"),local("Microsoft YaHei UI");font-weight:100 900}
@font-face{font-family:"YaHei";src:local("Microsoft YaHei"),local("Microsoft YaHei UI");font-weight:100 900}
#root{position:absolute;inset:0;overflow:hidden;background:${bg};
  font-family:"YaHei",sans-serif;color:#eef2f8}
.bg{position:absolute;inset:0;
  background:radial-gradient(120% 90% at 62% 44%,#161c25 0%,#0b0e13 52%,${bg} 100%)}
.grid{position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(120,150,190,.055) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(120,150,190,.055) 1px,transparent 1px);
  background-size:64px 64px;
  -webkit-mask-image:radial-gradient(75% 65% at 50% 50%,#000 30%,transparent 100%)}
.rule{position:absolute;left:96px;top:150px;width:2px;height:0;background:linear-gradient(180deg,${accent},rgba(0,0,0,0))}
.num{position:absolute;left:96px;top:92px;font-family:"JetBrains Mono",Consolas,monospace;
  font-size:15px;letter-spacing:.34em;color:${numColor};text-shadow:0 0 14px ${accent}44}
.en{position:absolute;left:96px;top:120px;font-family:"JetBrains Mono",Consolas,monospace;
  font-size:13px;letter-spacing:.42em;color:#8391a3}
.h1{position:absolute;left:94px;top:186px;width:560px;font-size:64px;line-height:1.22;
  font-weight:700;letter-spacing:.01em;color:#f4f7fb}
.lead{position:absolute;left:96px;top:392px;width:520px;font-size:25px;line-height:1.78;
  color:#9aa6b6;font-weight:400}
.list{position:absolute;left:96px;top:560px;width:520px}
.row{position:relative;height:52px;display:flex;align-items:center;gap:18px;
  border-bottom:1px solid rgba(120,150,190,.13)}
.row i{width:6px;height:6px;border-radius:50%;background:${accent};box-shadow:0 0 8px ${accent}88;flex:none}
.row b{font-size:23px;font-weight:500;color:#dbe3ee;letter-spacing:.02em}
.row span{font-family:"JetBrains Mono",Consolas,monospace;font-size:12px;letter-spacing:.1em;
  color:#8391a3;margin-left:auto;padding-right:4px}
.figwrap{position:absolute;right:36px;top:60px;width:1180px;height:960px}
.figwrap img{width:100%;height:100%;object-fit:contain}
.spot{position:absolute;right:80px;top:110px;width:1140px;height:830px;border-radius:50%;
  background:radial-gradient(circle,rgba(90,140,190,.20) 0%,rgba(90,140,190,.05) 46%,transparent 70%)}
.sub-dock{position:absolute;left:50%;bottom:52px;transform:translateX(-50%);z-index:90;
  width:1560px;height:190px;pointer-events:none}
.sub-line{position:absolute;left:0;right:0;bottom:0;display:block;
  font-size:38px;font-weight:600;letter-spacing:.03em;color:#f8fafc;line-height:1.34;
  text-shadow:0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.85);
  white-space:normal;text-align:center;text-wrap:balance}
.watermark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-22deg);z-index:85;
  width:100%;text-align:center;white-space:nowrap;
  font-family:"YaHei","Microsoft YaHei",sans-serif;font-style:italic;font-size:148px;
  font-weight:900;letter-spacing:.12em;color:rgba(238,242,248,.045);
  text-shadow:0 0 18px rgba(0,0,0,.22);pointer-events:none;user-select:none}
`;
}

function getWordTime(timings, sceneId, word, fallback) {
  const scene = timings[sceneId];
  if (!scene || !scene.words || !scene.words.length) return fallback;
  const match = scene.words.find((w) => w.text.includes(word));
  return match ? match.start : fallback;
}

function compileHighlights(svgId, highlights, timings, sceneId) {
  if (!highlights || !highlights.length) return "";
  const lines = [];
  for (const hl of highlights) {
    const target = `#${svgId} ${hl.part}`;
    const tAt = hl.at ? getWordTime(timings, sceneId, hl.at, hl.t || 0) : (hl.t || 0);
    const tStart = Number((tAt + (hl.delay || 0)).toFixed(2));
    if (hl.fx === "flash") {
      const dur = hl.duration || 0.2;
      lines.push(`tl.to("${target}", { stroke: "${hl.stroke || '#ff7a45'}", strokeWidth: ${hl.width || 1.8}, duration: ${dur} }, ${tStart})`);
      if (hl.baseStroke) {
        lines.push(`  .to("${target}", { stroke: "${hl.baseStroke}", strokeWidth: ${hl.baseWidth || 0.7}, duration: 0.4 }, ${(tStart + dur + 0.1).toFixed(2)});`);
      }
    } else if (hl.fx === "squash") {
      lines.push(`tl.to("${target}", { scaleY: ${hl.scaleY || 0.9}, yoyo: true, repeat: ${hl.repeat ?? 1}, duration: ${hl.duration || 0.25}, transformOrigin: "${hl.origin || 'center center'}" }, ${tStart});`);
    } else if (hl.fx === "press") {
      lines.push(`tl.to("${target}", { y: "+=${hl.dy || 30}", duration: ${hl.duration || 0.32}, ease: "power2.in" }, ${tStart});`);
    } else if (hl.fx === "pressSpring") {
      lines.push(`tl.to("${target}", { scaleY: ${hl.scaleY || 0.78}, y: "+=${hl.dy || 12}", transformOrigin: "${hl.origin || 'center center'}", duration: ${hl.duration || 0.32}, ease: "power2.in" }, ${tStart});`);
    } else if (hl.fx === "release") {
      lines.push(`tl.to("${target}", { y: 0, duration: ${hl.duration || 0.45}, ease: "elastic.out(1, 0.4)" }, ${tStart});`);
    } else if (hl.fx === "releaseSpring") {
      lines.push(`tl.to("${target}", { scaleY: 1, y: 0, transformOrigin: "${hl.origin || 'center center'}", duration: ${hl.duration || 0.45}, ease: "elastic.out(1, 0.4)" }, ${tStart});`);
    } else if (hl.fx === "color") {
      const vars = {};
      if (hl.stroke) vars.stroke = hl.stroke;
      if (hl.width) vars.strokeWidth = hl.width;
      if (hl.fill) vars.fill = hl.fill;
      if (hl.duration) vars.duration = hl.duration;
      lines.push(`tl.to("${target}", ${JSON.stringify(vars)}, ${tStart});`);
    }
  }
  return lines.join("\n    ");
}

export async function compileProject(projectDir) {
  const dir = resolve(projectDir);
  const customCompiler = join(dir, "custom-compiler.mjs");
  if (existsSync(customCompiler)) {
    const { compileProject: customCompile } = await import(pathToFileURL(customCompiler).href);
    return await customCompile(projectDir);
  }

  const voiceDir = join(dir, "assets/voice");
  const figDir = join(dir, "assets/figures");
  const compDir = join(dir, "compositions");
  mkdirSync(compDir, { recursive: true });

  // 1. 加载场景配置与元数据
  const projJsonFile = join(dir, "project.json");
  const projMeta = existsSync(projJsonFile) ? JSON.parse(readFileSync(projJsonFile, "utf8")) : {};
  const watermarkText = projMeta.watermark ? String(projMeta.watermark).trim() : "";

  const configFile = join(dir, "scenes.config.mjs");
  if (!existsSync(configFile)) {
    throw new Error(`scenes.config.mjs not found in ${dir}`);
  }
  const { SCENES } = await import(pathToFileURL(configFile).href);

  // 1.1 校验 script.json 与 scenes.config.mjs ID 是否对齐
  const scriptFile = join(dir, "script.json");
  if (!existsSync(scriptFile)) {
    throw new Error(`script.json not found in ${dir}`);
  }
  const scriptData = JSON.parse(readFileSync(scriptFile, "utf8"));
  const scriptIds = new Set(scriptData.map((s) => s.id));
  for (const s of SCENES) {
    if (!scriptIds.has(s.id)) {
      throw new Error(
        `[compileProject] Scene ID "${s.id}" in scenes.config.mjs is missing from script.json! Available IDs: ${[...scriptIds].join(", ")}`
      );
    }
  }

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
        <i></i><b>${esc(cn)}</b><span data-layout-ignore="true">${esc(en)}</span>
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

      const customFx = compileHighlights(`${s.key}-svg`, s.highlights, timings, s.id);
      figureAnim = `
    tl.fromTo("#${s.key}-svg",{opacity:0,scale:.93,y:26},{opacity:1,scale:1,y:0,duration:1.05,ease:"power3.out"},0);
    ${customFx}
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
            `<span id="${s.key}-sub-${i}" class="sub-line" style="opacity:0;">${esc(
              sub.text
            )}</span>`
        )
        .join("\n      ")}
    </div>` : "";

    const subAnim = sceneSubs
      .map((sub, i) => {
        const dur = Math.max(0.3, sub.end - sub.start);
        const inDur = Math.min(0.25, Number((dur * 0.3).toFixed(2)));
        const outDur = Math.min(0.2, Number((dur * 0.25).toFixed(2)));
        const inT = Number(sub.start.toFixed(2));
        const outT = Math.max(Number((inT + inDur + 0.05).toFixed(2)), Number((sub.end - outDur).toFixed(2)));
        return `    tl.fromTo("#${s.key}-sub-${i}", {opacity:0, y:8}, {opacity:1, y:0, duration:${inDur}, ease:"power2.out", overwrite:"auto"}, ${inT})
      .to("#${s.key}-sub-${i}", {opacity:0, y:-6, duration:${outDur}, ease:"power2.in", overwrite:"auto"}, ${outT});`;
      })
      .join("\n");

    const baseCss = makeBaseCss(projMeta.theme);
    const html = `<template>
  <style>${baseCss}\n${matCss()}</style>
  <div id="root" data-composition-id="${s.key}" data-width="1920" data-height="1080">
    <div class="bg"></div>
    <div class="grid"></div>
    <div class="spot" id="${s.key}-spot"></div>
    ${watermarkText ? `<div class="watermark" data-layout-ignore="true"><i>${esc(watermarkText)}</i></div>` : ""}
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

  // 额外音轨：BGM + 音效（来自 project.json 的 audio 字段）。
  // HyperFrames 引擎的 audioStage 会自动把根 index.html 里所有 <audio> 混成成品音轨，
  // 所以这里只需把元素写进去，不需要自己调用 ffmpeg 混音。
  const audioCfg = (() => {
    const p = join(dir, "project.json");
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, "utf8")).audio || null;
    } catch {
      return null;
    }
  })();

  const audioEl = (a) => {
    const attrs = [
      `id="${esc(a.id)}"`,
      `src="${esc(a.src)}"`,
      `data-start="${a.start ?? 0}"`,
      `data-duration="${a.duration ?? TOTAL}"`,
      `data-track-index="${a.trackIndex ?? 3}"`,
      `data-volume="${a.volume ?? 1}"`,
    ];
    if (a.fadeIn) attrs.push(`data-fade-in="${a.fadeIn}"`);
    if (a.fadeOut) attrs.push(`data-fade-out="${a.fadeOut}"`);
    if (a.automation) {
      const json = JSON.stringify(a.automation).replace(/'/g, "&#39;");
      attrs.push(`data-automation='${json}'`);
    }
    return `    <audio\n      ${attrs.join("\n      ")}\n    ></audio>`;
  };

  const extraAudios = [];
  if (audioCfg?.bgm) extraAudios.push(audioEl({ id: "bgm", trackIndex: 3, ...audioCfg.bgm }));
  for (const s of audioCfg?.sfx || []) {
    extraAudios.push(audioEl({ trackIndex: 3, volume: 0.12, ...s }));
  }
  const extraBlock = extraAudios.length ? "\n" + extraAudios.join("\n") : "";

  const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN" data-resolution="landscape">
  <head>
    <meta charset="utf-8" />
    <title>${esc(sTitle(dir))} — Anatomy × HyperFrames</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face{font-family:"Microsoft YaHei";src:local("Microsoft YaHei"),local("Microsoft YaHei UI");font-weight:100 900}
      @font-face{font-family:"YaHei";src:local("Microsoft YaHei"),local("Microsoft YaHei UI");font-weight:100 900}
      html,body{margin:0;padding:0;background:${projMeta.theme?.bg || "#05060a"};width:1920px;height:1080px;overflow:hidden}
      .scene{position:absolute;inset:0;width:100%;height:100%}
      .watermark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-22deg);z-index:85;
        width:100%;text-align:center;white-space:nowrap;
        font-family:"Microsoft YaHei","YaHei",sans-serif;font-style:italic;font-size:148px;
        font-weight:900;letter-spacing:.12em;color:rgba(238,242,248,.045);
        text-shadow:0 0 18px rgba(0,0,0,.22);pointer-events:none;user-select:none}
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
${audios}${extraBlock}
      ${watermarkText ? `<div class="watermark" data-layout-ignore="true"><i>${esc(watermarkText)}</i></div>` : ""}
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
