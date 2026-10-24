import { existsSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = resolve(__dirname, "..");
export const PROJECTS_DIR = resolve(REPO_ROOT, "projects");

// 1. 动态嗅探无头 Chrome 路径（避免版本号钉死）
export function resolveChromePath() {
  if (process.env.HYPERFRAMES_BROWSER_PATH && existsSync(process.env.HYPERFRAMES_BROWSER_PATH)) {
    return process.env.HYPERFRAMES_BROWSER_PATH;
  }

  const baseCache = join(os.homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
  if (existsSync(baseCache)) {
    try {
      const versions = readdirSync(baseCache);
      for (const v of versions) {
        const candidate = join(baseCache, v, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
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

// 3. 解析 HyperFrames CLI 路径
export function resolveHyperFramesCli() {
  const localCli = resolve(REPO_ROOT, "../hyperframes/packages/cli/bin/hyperframes.mjs");
  if (existsSync(localCli)) return localCli;
  return "hyperframes";
}

// 4. 解析指定项目目录（默认 mechanical-keyboard）
export function resolveProjectDir(projectName = "mechanical-keyboard") {
  const p = resolve(PROJECTS_DIR, projectName);
  if (!existsSync(p)) {
    throw new Error(`Project directory not found: ${p}`);
  }
  return p;
}
