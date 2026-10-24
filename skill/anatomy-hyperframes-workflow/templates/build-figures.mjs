import { mkdirSync, writeFileSync } from "node:fs";
import { FIGS } from "./figures.mjs";

const dir = "G:/Workspace/kb-video/assets/figures";
mkdirSync(dir, { recursive: true });

const only = process.argv.slice(2);
for (const [name, fn] of Object.entries(FIGS)) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  const svg = fn();
  writeFileSync(`${dir}/${name}.svg`, svg);
  console.log(name.padEnd(8), String(svg.length).padStart(8), "B", Date.now() - t0, "ms");
}
