import sharp from "file:///G:/Workspace/imagetoprompt/node_modules/sharp/dist/index.mjs";
import { writeFileSync } from "node:fs";
import { sceneStack } from "./keyboard.mjs";

const W = Number(process.env.W ?? 1400);
const H = Number(process.env.H ?? 900);
const out = process.env.OUT ?? "../preview/explode.png";
const spread = Number(process.env.SPREAD ?? 1);
const bg = process.env.BG ?? "#08090b";

const t0 = Date.now();
const { svg } = sceneStack(W, H, { spread });
writeFileSync("../preview/explode.svg", svg);
console.log("svg", svg.length, Date.now() - t0, "ms");
const png = await sharp(Buffer.from(svg)).png().toBuffer();
await sharp({ create: { width: W, height: H, channels: 3, background: bg } })
  .composite([{ input: png }])
  .png({ compressionLevel: 6 })
  .toFile(out);
console.log("wrote", out, Date.now() - t0, "ms");
