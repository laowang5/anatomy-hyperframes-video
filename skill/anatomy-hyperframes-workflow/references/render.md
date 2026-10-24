# Render: browser, CLI, and the flags that matter

## Getting a browser

HyperFrames needs a headless Chrome. The CLI looks for it in a specific order; the environment variable it actually honours is:

```
HYPERFRAMES_BROWSER_PATH     # or PRODUCER_HEADLESS_SHELL_PATH
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` is **not** read by the CLI — setting it changes nothing and costs you twenty minutes.

### Automatic Dynamic Resolution (`core/config.mjs`)
Never hardcode specific version numbers in scripts. Use dynamic sniffing:
```javascript
export function resolveChromePath() {
  if (process.env.HYPERFRAMES_BROWSER_PATH && existsSync(process.env.HYPERFRAMES_BROWSER_PATH)) {
    return process.env.HYPERFRAMES_BROWSER_PATH;
  }
  const baseCache = "C:/Users/Administrator/.cache/hyperframes/chrome/chrome-headless-shell";
  if (existsSync(baseCache)) {
    for (const v of readdirSync(baseCache)) {
      const candidate = join(baseCache, v, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}
```

### Multi-Workspace Sandbox Execution Protocol
When invoking HyperFrames on a project sandbox (`projects/<name>`), **always set the child process working directory to the project directory**:
```javascript
execFileSync("node", [HF_CLI, "render", ".", "-o", outFile, "-f", "30", "-w", "1", "-q", "looks"], {
  cwd: projectDir,
  env: { ...process.env, HYPERFRAMES_BROWSER_PATH: resolveChromePath() },
  stdio: "inherit"
});
```
This guarantees HyperFrames resolves relative assets, fonts, and compositions strictly inside `projects/<name>` with zero root pollution.

## Running the CLI

**Use the built binary, not the source.** Running the CLI with `bun` crashes on this repo:

```
$ bun packages/cli/src/cli.ts check . --json
panic(main thread): index out of bounds: index 92228, len 49147
oh no: Bun has crashed. This indicates a bug in Bun, not your code.
```

Bun 1.3.11's bug, not the project's. Build it once:

```
cd <hyperframes checkout>
bun run --filter @hyperframes/cli build
```

`build:copy` may time out waiting on the studio bundle — **ignore that**, `dist/cli.js` and `dist/runtimeVersion.js` are already written and the CLI works. Then:

```
node <hyperframes>/packages/cli/bin/hyperframes.mjs <command> <dir>
```

## check

```
node .../bin/hyperframes.mjs check . --json
```

Reports lint errors and warnings. Every error gets a `Fix:` line — read it. Common ones:

| Code | Meaning |
| --- | --- |
| `font_family_without_font_face` | Chinese font not declared with `@font-face` |
| `audio_file_without_element` | an `<audio>` without an `id` |
| `check_runtime_failure` | the browser could not start — see above |

`check` also runs runtime verification in a browser session. If it reports `browserSkipped: true` with `Protocol error (Target.setDiscoverTargets): Target closed`, the browser path is still wrong.

## render

```
node .../bin/hyperframes.mjs render . -o renders/out.mp4 -f 30 -w 1 -q looks
```

| Flag | Values / default |
| --- | --- |
| `-o` | output path |
| `-f` / `--fps` | `30` |
| `-q` / `--quality` | `draft` \| `looks` (CRF 16, default) \| `delivery` \| `standard` \| `high` |
| `--resolution` | `landscape` (1920×1080) \| `landscape-4k` \| `portrait` \| `square` |
| `--format` | `mp4` \| `webm` \| `mov` \| `gif` \| `png-sequence` \| `hls` |
| `-w` / `--workers` | `1` — keep it at 1; more workers each launch a browser |
| `--no-browser-gpu` | software rasterization |
| `--best-effort` | default true; allows missing media |
| `--player-ready-timeout` | `45000` ms |
| `--protocol-timeout` | `300000` ms |

**There is no `--frames` or `--duration` flag.** To shorten a render, either drop the fps, or trim the root `data-duration`. Both attempts fail with `Unknown flag: --frames`.

### Expected timeline

A 103-second 1920×1080 single-worker render takes about **5 minutes**: ~4 m 30 s capturing and encoding concurrently, ~3 s assembling. Progress logs `@hf-progress {"code":"capture","done":N,"total":M,"pct":P}` — if `done` stops advancing, the page has hung.

The trace phases, in order: `file_server → capture_calibration → worker_resolution → capture_strategy → capture_streaming → assemble → pipeline`.

## Verifying the render

```
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,nb_frames -of default=noprint_wrappers=1 out.mp4
```

Check `nb_frames` equals `duration × fps`. A short file means frames were dropped.

Then **extract a still at every scene's midpoint and read them**:

```
for t in 2 18 30 42 52 62 72 80 90 98; do
  ffmpeg -v error -ss $t -i out.mp4 -frames:v 1 -y preview/v$t.png
done
```

Nine stills is enough to catch a text overlap, a figure that never animated in, or a scene whose art is off-centre. Do not deliver a video you have only probed.

## The zero-duration failure

The most expensive failure mode, and the diagnostic message is misleading:

```
✗ Composition has zero duration
```

`buildZeroDurationDiagnostic` offers hints — `window.__player was never set`, `No GSAP timeline registered`, `Fix: add data-duration="<seconds>" to your root` — but the real cause here is usually none of those.

The runtime (`packages/core/dist/generated/runtime-inline.js`, function `Hs()`) selects the root element as:

```
let c = document.querySelector('[data-composition-id][data-root="true"]');
if (c instanceof HTMLElement) return c;
let m = Array.from(document.querySelectorAll("[data-composition-id]"));
return m.find(h => !h.parentElement?.closest("[data-composition-id]")) ?? m[0] ?? null;
```

while the frame capturer (`packages/engine/dist/services/frameCapture.js`) reads `document.querySelector("[data-composition-id]")` and takes its `data-duration`. **The two disagree about which element is the root**, and `querySelector` returns the first match in document order — which, in a root whose children are all `data-composition-id` scene hosts, is a scene host, not the root.

The fix is one attribute:

```
<div id="root" data-root="true" data-composition-id="main" data-duration="103.53" ...>
```

Without `data-root="true"` the runtime may pick the root while the capturer reads a child, the durations disagree, and every render reports zero duration.

## Known CLI crash

```
panic(main thread): index out of bounds: index 92228, len 49147
```

A Bun runtime bug when running the CLI from source. Use the built `bin/hyperframes.mjs` under node. It is not a problem with your project.
