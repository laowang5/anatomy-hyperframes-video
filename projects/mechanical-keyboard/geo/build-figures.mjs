import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIGS } from "./figures.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const dir = resolve(__dirname, "../assets/figures");
mkdirSync(dir, { recursive: true });

const only = process.argv.slice(2);
for (const [name, fn] of Object.entries(FIGS)) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  const svg = fn();
  writeFileSync(`${dir}/${name}.svg`, svg);
  console.log(name.padEnd(8), String(svg.length).padStart(8), "B", Date.now() - t0, "ms");
}
