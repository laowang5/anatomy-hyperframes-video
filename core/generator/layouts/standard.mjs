import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { matCss } from "../../styles/lib.mjs";

const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function makeCss(theme = {}) {
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
.watermark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-22deg);z-index:85;
  width:100%;text-align:center;white-space:nowrap;
  font-family:"YaHei","Microsoft YaHei",sans-serif;font-style:italic;font-size:148px;
  font-weight:900;letter-spacing:.12em;color:rgba(238,242,248,.045);
  text-shadow:0 0 18px rgba(0,0,0,.22);pointer-events:none;user-select:none}
.sub-dock{position:absolute;left:50%;bottom:52px;transform:translateX(-50%);z-index:90;
  width:1560px;height:190px;pointer-events:none}
.sub-line{position:absolute;left:0;right:0;bottom:0;display:block;
  font-size:38px;font-weight:600;letter-spacing:.03em;color:#f8fafc;line-height:1.34;
  text-shadow:0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.85);
  white-space:normal;text-align:center;text-wrap:balance}
${matCss()}
`;
}

function getWordTime(timings, sceneId, word, fallback) {
  const scene = timings[sceneId];
  if (!scene || !scene.words || !scene.words.length) return fallback;
  const match = scene.words.find((w) => w.text.includes(word));
  return match ? match.start : fallback;
}

export function compileHighlights(svgId, highlights, timings, sceneId) {
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

export function renderSceneBody({ scene: s, duration: d, watermarkText, figDir }) {
  const rows = (s.rows || [])
    .map(
      (r, i) => `      <div class="clip row" id="${s.key}-r${i}" data-start="0" data-duration="${d}">
        <i></i><b>${esc(r[0])}</b><span>${esc(r[1])}</span>
      </div>`
    )
    .join("\n");

  let figureMarkup = "";
  if (s.isInline) {
    const rawSvg = readFileSync(join(figDir, `${s.fig}.svg`), "utf8");
    figureMarkup = rawSvg.replace(
      /<svg\b[^>]*>/i,
      `<svg id="${s.key}-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1080" class="clip fig" data-start="0" data-duration="${d}" style="width:100%;height:100%;object-fit:contain;">`
    );
  } else {
    figureMarkup = `<img id="${s.key}-img" class="clip" src="assets/figures/${s.fig}.svg" data-start="0" data-duration="${d}" alt="">`;
  }

  return `
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
    </div>`;
}

export function renderTimeline({ scene: s, duration: d, timings }) {
  const rowsIn = (s.rows || [])
    .map((_, i) => `    tl.fromTo("#${s.key}-r${i}",{opacity:0,x:-14},{opacity:1,x:0,duration:.45,ease:"power2.out"},${(0.72 + i * 0.1).toFixed(2)});`)
    .join("\n");

  let figureAnim = "";
  if (s.isInline) {
    const hlAnim = compileHighlights(`${s.key}-svg`, s.highlights, timings, s.id);
    figureAnim = `
    tl.fromTo("#${s.key}-svg",{opacity:0,scale:.93,y:26},{opacity:1,scale:1,y:0,duration:1.05,ease:"power3.out"},0);
    tl.fromTo("#${s.key}-svg",{rotation:-1.2},{rotation:0,duration:${d.toFixed(2)},ease:"none"},0);
    ${hlAnim}`;
  } else {
    figureAnim = `
    tl.fromTo("#${s.key}-img",{opacity:0,scale:.93,y:26},{opacity:1,scale:1,y:0,duration:1.05,ease:"power3.out"},0);
    tl.fromTo("#${s.key}-img",{rotation:-1.2},{rotation:0,duration:${d.toFixed(2)},ease:"none"},0);
    `;
  }

  return `
    ${figureAnim}
    tl.fromTo("#${s.key}-spot",{opacity:0},{opacity:1,duration:1.1,ease:"power2.out"},0);
    tl.fromTo("#${s.key}-num",{opacity:0,y:-10},{opacity:1,y:0,duration:.5,ease:"power3.out"},.05);
    tl.fromTo("#${s.key}-en",{opacity:0},{opacity:1,duration:.5,ease:"power2.out"},.18);
    tl.fromTo("#${s.key}-rule",{height:0,opacity:0},{height:96,opacity:1,duration:.6,ease:"power3.out"},.24);
    tl.fromTo("#${s.key}-h1",{opacity:0,y:24},{opacity:1,y:0,duration:.7,ease:"power3.out"},.3);
    tl.fromTo("#${s.key}-lead",{opacity:0,y:16},{opacity:1,y:0,duration:.65,ease:"power3.out"},.55);
${rowsIn}`;
}
