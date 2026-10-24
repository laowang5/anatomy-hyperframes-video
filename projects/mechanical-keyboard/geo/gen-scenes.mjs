import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projDir = resolve(__dirname, "..");
const compilerPath = resolve(projDir, "../../core/generator/compiler.mjs");

const { compileProject } = await import(pathToFileURL(compilerPath).href);
const res = await compileProject(projDir);
console.log(`[mechanical-keyboard] Generated ${res.scenesCount} scenes (${res.totalDuration}s)`);
