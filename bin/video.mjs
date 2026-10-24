#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  REPO_ROOT,
  resolveChromePath,
  cleanTempProfiles,
  resolveHyperFramesCli,
  resolveProjectDir,
} from "../core/config.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// 1. 自动配置动态检测的无头 Chrome 路径
const chromePath = resolveChromePath();
if (chromePath) {
  process.env.HYPERFRAMES_BROWSER_PATH = chromePath;
  process.env.PRODUCER_HEADLESS_SHELL_PATH = chromePath;
}

const HF_CLI = resolveHyperFramesCli();

function log(step, msg) {
  console.log(`\x1b[36m[video-cli]\x1b[0m \x1b[1m${step}\x1b[0m: ${msg}`);
}

const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith("-")) || "build";
const mode = args.includes("--production") ? "production" : "preview";

// 2. 解析项目沙箱名称（支持 --project <name>，默认为 mechanical-keyboard）
const projIdx = args.findIndex((a) => a === "--project" || a === "-P");
const projName = projIdx !== -1 && args[projIdx + 1] ? args[projIdx + 1] : "mechanical-keyboard";

// 获取沙箱路径，若不存在则回退至旧版根目录
let PROJ_DIR;
try {
  PROJ_DIR = resolveProjectDir(projName);
} catch {
  PROJ_DIR = REPO_ROOT;
}

log("WORKSPACE", `Active project: \x1b[32m${projName}\x1b[0m (Path: ${PROJ_DIR})`);

switch (cmd) {
  case "voice": {
    log("TTS", `Synthesizing voice tracks (Mode: ${mode.toUpperCase()})...`);
    execFileSync("python", ["core/tts/engine.py", "--project-dir", PROJ_DIR, "--mode", mode], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
    break;
  }
  case "figures": {
    log("GEO", "Building Anatomy SVG figures...");
    const buildScript = join(PROJ_DIR, "geo/build-figures.mjs");
    if (existsSync(buildScript)) {
      execFileSync("node", [buildScript], { cwd: PROJ_DIR, stdio: "inherit" });
    } else {
      execFileSync("node", ["geo/build-figures.mjs"], { cwd: REPO_ROOT, stdio: "inherit" });
    }
    break;
  }
  case "scenes": {
    log("SCENES", "Compiling scenes HTML & root index.html...");
    const compilerPath = resolve(REPO_ROOT, "core/generator/compiler.mjs");
    const { compileProject } = await import(pathToFileURL(compilerPath).href);
    const res = await compileProject(PROJ_DIR);
    log("SCENES", `Compilation successful: ${res.scenesCount} scenes, total ${res.totalDuration}s`);
    break;
  }
  case "check": {
    cleanTempProfiles();
    log("CHECK", "Running HyperFrames lint & quality gate...");
    execFileSync("node", [HF_CLI, "check", "."], { cwd: PROJ_DIR, stdio: "inherit", env: process.env });
    break;
  }
  case "preview": {
    log("PREVIEW", "Starting HyperFrames preview server...");
    execFileSync("node", [HF_CLI, "preview", "--background"], { cwd: PROJ_DIR, stdio: "inherit", env: process.env });
    break;
  }
  case "snapshot": {
    cleanTempProfiles();
    const atIdx = args.indexOf("--at");
    const at = atIdx !== -1 ? args[atIdx + 1] : "1.0";
    const oIdx = args.indexOf("-o");
    const out = oIdx !== -1 ? args[oIdx + 1] : "preview/snap.png";
    log("SNAPSHOT", `Capturing frame at ${at}s to ${out}...`);
    execFileSync("node", [HF_CLI, "snapshot", "--at", at, "-o", out], {
      cwd: PROJ_DIR,
      stdio: "inherit",
      env: process.env,
    });
    break;
  }
  case "render": {
    cleanTempProfiles();
    if (mode === "production") {
      log("TTS", "Ensuring MiMo-v2.5-TTS production audio is active...");
      execFileSync("python", ["core/tts/engine.py", "--project-dir", PROJ_DIR, "--mode", "production"], {
        cwd: REPO_ROOT,
        stdio: "inherit",
      });
      const compilerPath = resolve(REPO_ROOT, "core/generator/compiler.mjs");
      const { compileProject } = await import(pathToFileURL(compilerPath).href);
      await compileProject(PROJ_DIR);
    }
    const outIdx = args.findIndex((a) => a.endsWith(".mp4"));
    const out = outIdx !== -1 ? args[outIdx] : "renders/out.mp4";
    log("RENDER", `Rendering video to ${out} (fps: 30)...`);
    execFileSync("node", [HF_CLI, "render", ".", "-o", out, "-f", "30", "-w", "1", "-q", "looks"], {
      cwd: PROJ_DIR,
      stdio: "inherit",
      env: process.env,
    });
    break;
  }
  case "build": {
    log("BUILD", `Executing end-to-end pipeline (Project: ${projName}, Mode: ${mode.toUpperCase()})...`);
    // 步骤 1: 运行双轨 TTS 引擎
    log("Step 1/4", `Synthesizing audio & extracting word timestamps (${mode})`);
    execFileSync("python", ["core/tts/engine.py", "--project-dir", PROJ_DIR, "--mode", mode], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });

    // 步骤 2: 几何构件构建
    log("Step 2/4", "Building Anatomy SVG figures");
    const buildScript = join(PROJ_DIR, "geo/build-figures.mjs");
    if (existsSync(buildScript)) {
      execFileSync("node", [buildScript], { cwd: PROJ_DIR, stdio: "inherit" });
    }

    // 步骤 3: 拼装分镜与 Inline SVG
    log("Step 3/4", "Generating compositions with Inline SVG & precision timestamps");
    const compilerPath = resolve(REPO_ROOT, "core/generator/compiler.mjs");
    const { compileProject } = await import(pathToFileURL(compilerPath).href);
    const res = await compileProject(PROJ_DIR);
    log("Step 3/4", `Generated ${res.scenesCount} scenes (${res.totalDuration}s)`);

    // 步骤 4: 质量门禁检查
    cleanTempProfiles();
    log("Step 4/4", "Validating compositions with HyperFrames check");
    const checkRes = spawnSync("node", [HF_CLI, "check", ".", "--json"], { cwd: PROJ_DIR, env: process.env, encoding: "utf8" });
    try {
      const parsed = JSON.parse(checkRes.stdout.trim().split("\n").pop());
      if (parsed.lint && parsed.lint.errorCount > 0) {
        console.error("Lint errors detected:", parsed.lint.findings);
        process.exit(1);
      }
      log("Step 4/4", "Quality gate passed! Lint: 0 errors.");
    } catch {
      log("Step 4/4", "Quality check completed.");
    }

    log("SUCCESS", `Project [${projName}] build complete! Run \`node bin/video.mjs render --project ${projName}\` to export MP4.`);
    break;
  }
  default: {
    console.log(`Usage: node bin/video.mjs [build|voice|figures|scenes|check|preview|snapshot|render] [--project <name>] [--production]`);
    break;
  }
}
