import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const dur = (f) => {
  if (!existsSync(f)) return 0;
  return Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], {
      encoding: "utf8",
    }).trim()
  );
};

const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * 动态加载分镜布局插槽 (Layout Slot Resolver)
 * 1. 优先加载项目沙箱专属 layout.mjs
 * 2. 其次根据 project.json / scenes.config.mjs 中的 layout 字段加载内置模板
 * 3. 默认回退至 core/generator/layouts/standard.mjs
 */
async function resolveLayout(projectDir, projMeta, configModule) {
  const localLayout = join(projectDir, "layout.mjs");
  if (existsSync(localLayout)) {
    return await import(pathToFileURL(localLayout).href);
  }
  const localGeoLayout = join(projectDir, "geo", "layout.mjs");
  if (existsSync(localGeoLayout)) {
    return await import(pathToFileURL(localGeoLayout).href);
  }

  const layoutName = projMeta.layout || configModule.layout || "standard";
  const builtInLayout = join(__dirname, "layouts", `${layoutName}.mjs`);
  if (existsSync(builtInLayout)) {
    return await import(pathToFileURL(builtInLayout).href);
  }

  return await import(pathToFileURL(join(__dirname, "layouts", "standard.mjs")).href);
}

export async function compileProject(projectDir) {
  const dir = resolve(projectDir);

  // 向后兼容历史 custom-compiler.mjs（若存在则使用，但建议迁移至 layout.mjs）
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
  const configModule = await import(pathToFileURL(configFile).href);
  const { SCENES } = configModule;

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

  for (const s of SCENES) {
    s.key = "k" + s.id;
  }

  // 3. 计算时间轴
  const PAD = 1.05;
  let t = 0;
  for (const s of SCENES) {
    s.voice = dur(join(voiceDir, `${s.id}.mp3`));
    s.len = Number((s.voice + PAD).toFixed(2));
    s.start = Number(t.toFixed(2));
    t += s.len;
  }
  const TOTAL = Number(t.toFixed(2));

  // 4. 解析并装配布局插槽
  const layout = await resolveLayout(dir, projMeta, configModule);
  const layoutCss = layout.makeCss ? layout.makeCss(projMeta.theme || {}, projMeta) : "";

  // 5. 编译各分镜子页面
  for (const s of SCENES) {
    const d = s.len;
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

    const sceneBody = layout.renderSceneBody({
      scene: s,
      duration: d,
      projMeta,
      timings,
      figDir,
      watermarkText,
      projectDir: dir,
    });

    const sceneTimeline = layout.renderTimeline ? layout.renderTimeline({
      scene: s,
      duration: d,
      timings,
      sceneKey: s.key,
      projectDir: dir,
    }) : "";

    const html = `<template>
  <style>
${layoutCss}
  </style>
  <div id="root" data-composition-id="${s.key}" data-width="1920" data-height="1080">
${sceneBody}
${subMarkup}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
${sceneTimeline}
${subAnim}
    window.__timelines["${s.key}"] = tl;
  </script>
</template>
`;
    writeFileSync(join(compDir, `${s.id}.html`), html, "utf8");
  }

  // 6. 组装根 index.html
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
    if (a.loop) attrs.push('data-loop="true"');
    return `    <audio ${attrs.join(" ")}></audio>`;
  };

  const extraAudios = [];
  if (audioCfg) {
    if (audioCfg.bgm) {
      extraAudios.push(
        audioEl({
          id: "bgm",
          src: audioCfg.bgm.src,
          start: audioCfg.bgm.start ?? 0,
          duration: audioCfg.bgm.duration ?? TOTAL,
          volume: audioCfg.bgm.volume ?? 0.15,
          loop: audioCfg.bgm.loop ?? true,
          trackIndex: 3,
        })
      );
    }
    if (Array.isArray(audioCfg.sfx)) {
      audioCfg.sfx.forEach((s, i) => {
        extraAudios.push(
          audioEl({
            id: s.id || `sfx-${i}`,
            src: s.src,
            start: s.start ?? 0,
            duration: s.duration,
            volume: s.volume ?? 0.6,
            loop: false,
            trackIndex: 4 + i,
          })
        );
      });
    }
  }
  const extraBlock = extraAudios.length > 0 ? "\n" + extraAudios.join("\n") : "";

  const rootHtml = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${esc(projMeta.name || "Video Timeline")}</title>
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
      data-fps="30"
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

  writeFileSync(join(dir, "index.html"), rootHtml, "utf8");
  return { scenesCount: SCENES.length, totalDuration: TOTAL };
}
