import { existsSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = resolve(__dirname, "..");
export const PROJECTS_DIR = resolve(REPO_ROOT, "projects");

// 1. 动态嗅探无头 Chrome 路径（支持 Windows / macOS / Linux 跨平台自适应）
export function resolveChromePath() {
  if (process.env.HYPERFRAMES_BROWSER_PATH && existsSync(process.env.HYPERFRAMES_BROWSER_PATH)) {
    return process.env.HYPERFRAMES_BROWSER_PATH;
  }

  const platform = os.platform();
  const arch = os.arch();
  let subDir = "chrome-headless-shell-win64";
  let binName = "chrome-headless-shell.exe";

  if (platform === "darwin") {
    subDir = arch === "arm64" ? "chrome-headless-shell-mac-arm64" : "chrome-headless-shell-mac-x64";
    binName = "chrome-headless-shell";
  } else if (platform === "linux") {
    subDir = "chrome-headless-shell-linux64";
    binName = "chrome-headless-shell";
  }

  const baseCache = join(os.homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
  if (existsSync(baseCache)) {
    try {
      const versions = readdirSync(baseCache);
      for (const v of versions) {
        const candidate = join(baseCache, v, subDir, binName);
        if (existsSync(candidate)) return candidate;
      }
    } catch {}
  }
  return null;
}

// 2. 清理 Temp 中 Puppeteer 的残留锁目录，防止 "browser is already running" 冲突
export function cleanTempProfiles() {
  const tmp = process.env.TEMP || os.tmpdir();
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

// 3. 解析 HyperFrames CLI 运行载体（支持环境变量、本地 node_modules、工作区源码与 npx 兜底）
export function resolveHyperFramesCli() {
  // 1. 优先使用用户通过环境变量显式指定的 CLI 路径
  if (process.env.HYPERFRAMES_CLI_PATH && existsSync(process.env.HYPERFRAMES_CLI_PATH)) {
    return { bin: "node", args: [process.env.HYPERFRAMES_CLI_PATH] };
  }
  // 2. 检查本地安装的 @hyperframes/cli
  const localPkg = resolve(REPO_ROOT, "node_modules/@hyperframes/cli/bin/hyperframes.mjs");
  if (existsSync(localPkg)) {
    return { bin: "node", args: [localPkg] };
  }
  // 3. 检查同级工作区开发源码
  const siblingCli = resolve(REPO_ROOT, "../hyperframes/packages/cli/bin/hyperframes.mjs");
  if (existsSync(siblingCli)) {
    return { bin: "node", args: [siblingCli] };
  }
  // 4. 开源外部环境自动回退至 npx
  const isWin = process.platform === "win32";
  return { bin: isWin ? "npx.cmd" : "npx", args: ["hyperframes"] };
}

// 4. 获取所有合法项目名称列表
export function listAvailableProjects() {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(PROJECTS_DIR, d.name, "project.json")))
    .map((d) => d.name);
}

// 5. 解析指定项目目录（显式入参，严格拒绝隐式默认业务偏置）
export function resolveProjectDir(projectName) {
  if (!projectName) {
    throw new Error(`[config] Project name must be specified via --project <name> or -P <name>`);
  }
  const p = resolve(PROJECTS_DIR, projectName);
  if (!existsSync(p)) {
    throw new Error(`Project directory not found: ${p}`);
  }
  return p;
}
