import sharp from "file:///G:/Workspace/imagetoprompt/node_modules/sharp/dist/index.mjs";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const dir = resolve(__dirname, "../assets/figures");
const previewDir = resolve(__dirname, "../preview");
mkdirSync(previewDir, { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : ["hero", "cap", "switch", "magnet", "plate", "pcb", "foam", "case", "stack"];
for (const n of names) {
  const svg = readFileSync(`${dir}/${n}.svg`, "utf8");
  const t0 = Date.now();
  await sharp(Buffer.from(svg)).resize(760).png().toFile(`${previewDir}/f-${n}.png`);
  console.log(n, Date.now() - t0, "ms");
}
