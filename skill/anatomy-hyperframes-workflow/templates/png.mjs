import sharp from "file:///G:/Workspace/imagetoprompt/node_modules/sharp/dist/index.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const dir = "G:/Workspace/kb-video/assets/figures";
mkdirSync("G:/Workspace/kb-video/preview", { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : ["hero", "cap", "switch", "magnet", "plate", "pcb", "foam", "case", "stack"];
for (const n of names) {
  const svg = readFileSync(`${dir}/${n}.svg`, "utf8");
  const t0 = Date.now();
  await sharp(Buffer.from(svg)).resize(760).png().toFile(`G:/Workspace/kb-video/preview/f-${n}.png`);
  console.log(n, Date.now() - t0, "ms");
}
