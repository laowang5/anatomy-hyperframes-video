import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "G:/Workspace/kb-video";
const OUT = join(ROOT, "assets/voice");
mkdirSync(OUT, { recursive: true });

const scenes = JSON.parse(readFileSync(join(ROOT, "geo/script.json"), "utf8"));
const probe = (file) => {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {
    encoding: "utf8",
  });
  return Number(out.trim());
};

let total = 0;
const rows = [];
for (const s of scenes) {
  const mp3 = join(OUT, `${s.id}.mp3`);
  if (!existsSync(mp3)) {
    execFileSync("python", ["-m", "edge_tts", "--voice", s.voice, "--text", s.text, "--rate=+8%", "--write-media", mp3], {
      stdio: "inherit",
    });
  }
  const d = probe(mp3);
  total += d;
  rows.push({ id: s.id, dur: Number(d.toFixed(3)), chars: s.text.length, bytes: statSync(mp3).size });
  console.log(s.id, d.toFixed(2) + "s", s.text.length + "字");
}
console.log("TOTAL", total.toFixed(2), "s");
console.log(JSON.stringify(rows, null, 1));
