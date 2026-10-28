#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  REPO_ROOT,
  PROJECTS_DIR,
  resolveChromePath,
  cleanTempProfiles,
  resolveHyperFramesCli,
  resolveProjectDir,
  listAvailableProjects,
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

// ── 0. Doctor 环境自检命令 ──
if (cmd === "doctor") {
  console.log(`\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  console.log(`  🩺 Anatomy-HyperFrames Video Environment Doctor`);
  console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`);

  function checkCommand(name, cmdStr, argsArr, versionRegex) {
    try {
      const res = spawnSync(cmdStr, argsArr, { encoding: "utf8" });
      if (res.status === 0 || res.stdout) {
        const out = (res.stdout || res.stderr || "").trim().split("\n")[0];
        const match = versionRegex ? out.match(versionRegex) : null;
        const ver = match ? match[0] : out;
        console.log(`  ✅ \x1b[32m${name.padEnd(18)}\x1b[0m: ${ver}`);
        return true;
      }
    } catch {}
    console.log(`  ❌ \x1b[31m${name.padEnd(18)}\x1b[0m: Not found in PATH`);
    return false;
  }

  checkCommand("Node.js", "node", ["-v"], /v\d+\.\d+\.\d+/);
  checkCommand("Python 3", "python", ["--version"], /\d+\.\d+\.\d+/);
  checkCommand("uv (Package Mgr)", "uv", ["--version"], /\d+\.\d+\.\d+/);
  checkCommand("FFmpeg", "ffmpeg", ["-version"], /ffmpeg version [^\s]+/);
  checkCommand("FFprobe", "ffprobe", ["-version"], /ffprobe version [^\s]+/);

  const hfCli = resolveHyperFramesCli();
  if (hfCli) {
    const isNpx = hfCli.bin.startsWith("npx");
    const hfLabel = isNpx ? "npx hyperframes (online fallback)" : hfCli.args[0] || hfCli.bin;
    console.log(`  ✅ \x1b[32m${"HyperFrames CLI".padEnd(18)}\x1b[0m: ${hfLabel}`);
  }

  if (chromePath && existsSync(chromePath)) {
    console.log(`  ✅ \x1b[32m${"Chrome Headless".padEnd(18)}\x1b[0m: ${chromePath}`);
  } else {
    console.log(`  ⚠️  \x1b[33m${"Chrome Headless".padEnd(18)}\x1b[0m: Auto-downloaded via HyperFrames upon first check/render`);
  }

  try {
    const pyCheck = spawnSync("python", ["-c", "import edge_tts, requests; print('OK')"], { encoding: "utf8" });
    if (pyCheck.status === 0 && (pyCheck.stdout || "").includes("OK")) {
      console.log(`  ✅ \x1b[32m${"Python Modules".padEnd(18)}\x1b[0m: edge-tts & requests ready`);
    } else {
      console.log(`  ❌ \x1b[31m${"Python Modules".padEnd(18)}\x1b[0m: Missing edge-tts or requests (Run: uv pip install -r requirements.txt)`);
    }
  } catch {
    console.log(`  ❌ \x1b[31m${"Python Modules".padEnd(18)}\x1b[0m: Python execution failed`);
  }

  console.log(`\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`);
  process.exit(0);
}

// TTS 语速：--rate=-5% 或 project.json 的 audio.rate；未指定时用 engine.py 默认值。
const rateIdx = args.findIndex((a) => a === "--rate" || a.startsWith("--rate="));
const rateArg =
  rateIdx === -1
    ? null
    : args[rateIdx].includes("=")
      ? args[rateIdx].split("=").slice(1).join("=")
      : args[rateIdx + 1] || null;

// 2. 解析项目沙箱名称（支持 --project <name> 或智能当前目录推导，拒绝隐式业务偏置）
const projIdx = args.findIndex((a) => a === "--project" || a === "-P");
let projName = projIdx !== -1 && args[projIdx + 1] ? args[projIdx + 1] : null;

if (!projName) {
  // 尝试从当前执行目录或其 project.json 中自动推断项目
  const cwd = process.cwd();
  const localProjectJson = join(cwd, "project.json");
  if (existsSync(localProjectJson)) {
    try {
      projName = JSON.parse(readFileSync(localProjectJson, "utf8"))?.id;
    } catch {}
  }
}

if (!projName) {
  const available = listAvailableProjects();
  console.error(`\x1b[31m[video-cli] Error: No project specified!\x1b[0m`);
  console.error(`Usage: node bin/video.mjs <command> --project <name>`);
  console.error(`Available projects: \x1b[36m${available.join(", ") || "(none)"}\x1b[0m\n`);
  process.exit(1);
}

// 获取沙箱物理路径
let PROJ_DIR;
try {
  PROJ_DIR = resolveProjectDir(projName);
} catch (err) {
  console.error(`\x1b[31m[video-cli] Error: ${err.message}\x1b[0m`);
  process.exit(1);
}

log("WORKSPACE", `Active project: \x1b[32m${projName}\x1b[0m (Path: ${PROJ_DIR})`);

// TTS 语速：命令行 --rate 优先，其次 project.json 的 audio.rate，否则交给 engine.py 默认值。
let ttsRate = [];
{
  let rate = rateArg;
  if (!rate) {
    try {
      const pj = join(PROJ_DIR, "project.json");
      if (existsSync(pj)) {
        const r = JSON.parse(readFileSync(pj, "utf8"))?.audio?.rate;
        if (r) rate = String(r);
      }
    } catch {}
  }
  if (rate) {
    ttsRate = ["--rate", rate];
    log("TTS", `Speech rate: ${rate}`);
  }
}

switch (cmd) {
  case "voice": {
    log("TTS", `Synthesizing voice tracks (Mode: ${mode.toUpperCase()})...`);
    execFileSync("python", ["core/tts/engine.py", "--project-dir", PROJ_DIR, "--mode", mode, ...ttsRate], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
    break;
  }
  case "figures": {
    log("GEO", "Building Anatomy SVG figures...");
    const buildScript = join(PROJ_DIR, "geo", "build-figures.mjs");
    if (!existsSync(buildScript)) {
      log("GEO", `No geo/build-figures.mjs found in project [${projName}], skipping vector build.`);
      break;
    }
    execFileSync("node", [buildScript], { cwd: PROJ_DIR, stdio: "inherit" });
    break;
  }
  case "scenes": {
    log("SCENES", "Compiling scenes HTML & root index.html...");
    const customCompiler = join(PROJ_DIR, "custom-compiler.mjs");
    const compilerPath = existsSync(customCompiler) ? customCompiler : resolve(REPO_ROOT, "core/generator/compiler.mjs");
    const { compileProject } = await import(pathToFileURL(compilerPath).href);
    const res = await compileProject(PROJ_DIR);
    log("SCENES", `Compilation successful: ${res.scenesCount} scenes, total ${res.totalDuration}s`);
    break;
  }
  case "check": {
    cleanTempProfiles();
    log("CHECK", "Running HyperFrames lint & quality gate...");
    execFileSync(HF_CLI.bin, [...HF_CLI.args, "check", "."], { cwd: PROJ_DIR, stdio: "inherit", env: process.env });
    break;
  }
  case "preview": {
    log("PREVIEW", "Starting HyperFrames preview server...");
    execFileSync(HF_CLI.bin, [...HF_CLI.args, "preview", "--background"], { cwd: PROJ_DIR, stdio: "inherit", env: process.env });
    break;
  }
  case "snapshot": {
    cleanTempProfiles();
    mkdirSync(join(PROJ_DIR, "preview"), { recursive: true });
    const atIdx = args.indexOf("--at");
    const at = atIdx !== -1 ? args[atIdx + 1] : "1.0";
    const oIdx = args.indexOf("-o");
    const out = oIdx !== -1 ? args[oIdx + 1] : "preview/snap.png";
    log("SNAPSHOT", `Capturing frame at ${at}s to ${out}...`);
    execFileSync(HF_CLI.bin, [...HF_CLI.args, "snapshot", "--at", at, "-o", out], {
      cwd: PROJ_DIR,
      stdio: "inherit",
      env: process.env,
    });
    break;
  }
  case "render": {
    cleanTempProfiles();
    mkdirSync(join(PROJ_DIR, "renders"), { recursive: true });
    if (mode === "production") {
      log("TTS", "Ensuring high-fidelity production audio is active...");
      execFileSync("python", ["core/tts/engine.py", "--project-dir", PROJ_DIR, "--mode", "production", ...ttsRate], {
        cwd: REPO_ROOT,
        stdio: "inherit",
      });
      const customCompiler = join(PROJ_DIR, "custom-compiler.mjs");
      const compilerPath = existsSync(customCompiler) ? customCompiler : resolve(REPO_ROOT, "core/generator/compiler.mjs");
      if (existsSync(customCompiler)) {
        log("COMPILE", "Using project-specific custom compiler...");
      }
      const { compileProject } = await import(pathToFileURL(compilerPath).href);
      await compileProject(PROJ_DIR);
    }
    const outIdx = args.findIndex((a) => a.endsWith(".mp4"));
    const out = outIdx !== -1 ? args[outIdx] : `renders/${projName}.mp4`;
    const fullOut = resolve(PROJ_DIR, out);
    if (existsSync(fullOut)) {
      try { rmSync(fullOut, { force: true }); } catch {}
    }
    log("RENDER", `Rendering video to ${out} (fps: 30)...`);
    execFileSync(HF_CLI.bin, [...HF_CLI.args, "render", ".", "-o", out, "-f", "30", "-w", "1", "-q", "looks"], {
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
    execFileSync("python", ["core/tts/engine.py", "--project-dir", PROJ_DIR, "--mode", mode, ...ttsRate], {
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
    const customCompiler = join(PROJ_DIR, "custom-compiler.mjs");
    const compilerPath = existsSync(customCompiler) ? customCompiler : resolve(REPO_ROOT, "core/generator/compiler.mjs");
    if (existsSync(customCompiler)) {
      log("COMPILE", "Using project-specific custom compiler...");
    }
    const { compileProject } = await import(pathToFileURL(compilerPath).href);
    const res = await compileProject(PROJ_DIR);
    log("Step 3/4", `Generated ${res.scenesCount} scenes (${res.totalDuration}s)`);

    // 步骤 4: 质量门禁检查
    cleanTempProfiles();
    log("Step 4/4", "Validating compositions with HyperFrames check");
    const checkRes = spawnSync(HF_CLI.bin, [...HF_CLI.args, "check", ".", "--json"], { cwd: PROJ_DIR, env: process.env, encoding: "utf8" });
    if (checkRes.status !== 0) {
      console.error(checkRes.stdout || checkRes.stderr);
      console.error(`[video-cli] Quality gate check failed with exit code ${checkRes.status}`);
      process.exit(1);
    }
    let parsed = null;
    try {
      // HyperFrames 的 --json 输出是多行 pretty-print，且前面可能混有日志行：
      // 从第一个 "{" 开始截取，再按括号配平找到对象结尾。
      const raw = checkRes.stdout || "";
      const start = raw.indexOf("{");
      if (start === -1) throw new Error("no JSON object in check output");
      let depth = 0;
      let inStr = false;
      let esc = false;
      let end = -1;
      for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === "\\") esc = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) {
          end = i + 1;
          break;
        }
      }
      if (end === -1) throw new Error("unbalanced JSON in check output");
      parsed = JSON.parse(raw.slice(start, end));
    } catch (e) {
      console.error("[video-cli] Failed to parse JSON output from check:\n", checkRes.stdout);
      process.exit(1);
    }
    if (parsed) {
      const errors = [];
      if (parsed.lint && parsed.lint.errorCount > 0) errors.push(`Lint: ${parsed.lint.errorCount} error(s)`);
      if (parsed.runtime && parsed.runtime.errorCount > 0) errors.push(`Runtime: ${parsed.runtime.errorCount} error(s)`);
      if (parsed.contrast && parsed.contrast.errorCount > 0) errors.push(`Contrast: ${parsed.contrast.errorCount} error(s)`);
      if (parsed.motion && parsed.motion.errorCount > 0) errors.push(`Motion: ${parsed.motion.errorCount} error(s)`);
      if (parsed.layout && parsed.layout.errorCount > 0) errors.push(`Layout: ${parsed.layout.errorCount} error(s)`);
      if (errors.length > 0) {
        console.error(`[video-cli] Quality gate rejected project [${projName}]:`, errors.join(", "));
        process.exit(1);
      }
      log("Step 4/4", "Quality gate passed! 0 errors in lint, runtime, contrast & motion.");
    }

    log("SUCCESS", `Project [${projName}] build complete! Run \`node bin/video.mjs render --project ${projName}\` to export MP4.`);
    break;
  }
  default: {
    console.log(`Usage: node bin/video.mjs [build|voice|figures|scenes|check|preview|snapshot|render] [--project <name>] [--production]`);
    break;
  }
}
