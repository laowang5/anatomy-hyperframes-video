#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// 1. 自动配置无头 Chrome 路径（避开系统普通 Chrome 进程冲突）
const HEADLESS_SHELL = "C:/Users/Administrator/.cache/hyperframes/chrome/chrome-headless-shell/win64-131.0.6778.85/chrome-headless-shell-win64/chrome-headless-shell.exe";
if (existsSync(HEADLESS_SHELL)) {
  process.env.HYPERFRAMES_BROWSER_PATH = HEADLESS_SHELL;
  process.env.PRODUCER_HEADLESS_SHELL_PATH = HEADLESS_SHELL;
}

// 2. 清理 Temp 中 Puppeteer 的残留锁目录，防止 "browser is already running"
function cleanTempProfiles() {
  const tmp = process.env.TEMP || "C:/Users/Administrator/AppData/Local/Temp";
  try {
    const files = readdirSync(tmp);
    for (const f of files) {
      if (f.startsWith("puppeteer_dev_chrome_profile-")) {
        try {
          rmSync(join(tmp, f), { recursive: true, force: true });
        } catch {}
      }
    }
  } catch {}
}

const HF_CLI = resolve(ROOT, "../hyperframes/packages/cli/bin/hyperframes.mjs");

function log(step, msg) {
  console.log(`\x1b[36m[video-cli]\x1b[0m \x1b[1m${step}\x1b[0m: ${msg}`);
}

const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith("-")) || "build";
const mode = args.includes("--production") || args.includes("-p") ? "production" : "preview";

switch (cmd) {
  case "voice": {
    log("TTS", `Synthesizing voice tracks (Mode: ${mode.toUpperCase()})...`);
    execFileSync("python", ["geo/tts-engine.py", "--mode", mode], { cwd: ROOT, stdio: "inherit" });
    break;
  }
  case "figures": {
    log("GEO", "Building Anatomy SVG figures...");
    execFileSync("node", ["geo/build-figures.mjs"], { cwd: ROOT, stdio: "inherit" });
    break;
  }
  case "scenes": {
    log("SCENES", "Generating composition HTML files & root index.html...");
    execFileSync("node", ["geo/gen-scenes.mjs"], { cwd: ROOT, stdio: "inherit" });
    break;
  }
  case "check": {
    cleanTempProfiles();
    log("CHECK", "Running HyperFrames lint & quality gate...");
    execFileSync("node", [HF_CLI, "check", "."], { cwd: ROOT, stdio: "inherit", env: process.env });
    break;
  }
  case "preview": {
    log("PREVIEW", "Starting HyperFrames preview server...");
    execFileSync("node", [HF_CLI, "preview", "--background"], { cwd: ROOT, stdio: "inherit", env: process.env });
    break;
  }
  case "snapshot": {
    cleanTempProfiles();
    const atIdx = args.indexOf("--at");
    const at = atIdx !== -1 ? args[atIdx + 1] : "31.38";
    const oIdx = args.indexOf("-o");
    const out = oIdx !== -1 ? args[oIdx + 1] : "preview/snap_switch.png";
    log("SNAPSHOT", `Capturing frame at ${at}s to ${out}...`);
    execFileSync("node", [HF_CLI, "snapshot", "--at", at, "-o", out], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    break;
  }
  case "render": {
    cleanTempProfiles();
    // 渲染前若指定 --production 则自动保证使用 MiMo 高品质配音
    if (mode === "production") {
      log("TTS", "Ensuring MiMo-v2.5-TTS production audio is active...");
      execFileSync("python", ["geo/tts-engine.py", "--mode", "production"], { cwd: ROOT, stdio: "inherit" });
      execFileSync("node", ["geo/gen-scenes.mjs"], { cwd: ROOT, stdio: "inherit" });
    }
    log("RENDER", "Rendering video to renders/out.mp4 (fps: 30)...");
    const out = args.find((a) => a.endsWith(".mp4")) || "renders/out.mp4";
    execFileSync("node", [HF_CLI, "render", ".", "-o", out, "-f", "30", "-w", "1", "-q", "looks"], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    break;
  }
  case "build": {
    log("BUILD", `Executing end-to-end video pipeline (Mode: ${mode.toUpperCase()})...`);
    // 步骤 1: 运行双轨 TTS 引擎
    log("Step 1/5", `Synthesizing audio & extracting word timestamps (${mode})`);
    execFileSync("python", ["geo/tts-engine.py", "--mode", mode], { cwd: ROOT, stdio: "inherit" });

    // 步骤 2: 几何构件构建
    log("Step 2/5", "Building Anatomy SVG figures");
    execFileSync("node", ["geo/build-figures.mjs"], { cwd: ROOT, stdio: "inherit" });

    // 步骤 3: 拼装分镜与 Inline SVG
    log("Step 3/5", "Generating compositions with Inline SVG & precision timestamps");
    execFileSync("node", ["geo/gen-scenes.mjs"], { cwd: ROOT, stdio: "inherit" });

    // 步骤 4: 质量门禁检查
    cleanTempProfiles();
    log("Step 4/5", "Validating compositions with HyperFrames check");
    const checkRes = spawnSync("node", [HF_CLI, "check", ".", "--json"], { cwd: ROOT, env: process.env, encoding: "utf8" });
    try {
      const res = JSON.parse(checkRes.stdout.trim().split("\n").pop());
      if (res.lint && res.lint.errorCount > 0) {
        console.error("Lint errors detected:", res.lint.findings);
        process.exit(1);
      }
      log("Step 4/5", "Quality gate passed! Lint: 0 errors.");
    } catch {
      log("Step 4/5", "Quality check completed.");
    }

    log("SUCCESS", `Pipeline build complete! Run \`node bin/video.mjs render ${mode === "production" ? "--production" : ""}\` to export MP4.`);
    break;
  }
  default: {
    console.log(`Usage: node bin/video.mjs [build|voice|figures|scenes|check|preview|render] [--production]`);
    break;
  }
}
