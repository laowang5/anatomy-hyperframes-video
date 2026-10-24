# 技术架构与视频生成流程

> **文档定位**：`anatomy-hyperframes-video` 的架构说明与流水线拆解（Architecture & Pipeline）
> **读者**：接手本项目的工程师 / Agent
> **与另一份文档的关系**：`docs/多工作区沙箱升级.md` 记录的是"从单租户到多工作区"的**一次重构决策与验收**（历史）；本文描述的是**重构后的稳态架构**（现状），并在最后给出留档的隐患清单。
> **核对基线**：commit `0610708`，本文所有行号与该 commit 一致。

---

## 一、它是什么

一句话：**用 Anatomy 把机械结构画成等轴测爆炸图（静态 SVG），用 HyperFrames 把 HTML 逐帧渲染成视频（精确时间轴 + 配音 + 字幕）。**

这条流水线解决的核心问题不是"能不能画图"，而是**同一条流水线要能稳定产出第 N 部视频**，而不是每次重写一遍脚本。因此工程的真正主题是：**通用能力（core）与业务数据（projects/<name>）的物理分离**。

两条硬约束决定了整个设计：

1. **渲染必须可复现** —— HyperFrames 拿到的东西必须是**已经落盘的静态 HTML**，渲染期不再跑 python、不再算几何。
2. **每个视频必须互不污染** —— HyperFrames 会在项目根烧 `.hyperframes/` 缓存、按相对路径找资源；两套视频共用根目录必然串味。

对应两个决策：**编译期定稿** + **一个视频一个沙箱**。

---

## 二、仓库拓扑

```text
anatomy-hyperframes-video/
├── core/                                  ← 通用引擎（零业务逻辑）
│   ├── config.mjs                   (57)   Chrome 动态嗅探 / puppeteer 锁清理 / 路径解析
│   ├── tts/engine.py               (402)   双轨 TTS + 多音字解耦 + 字幕切分对齐
│   ├── generator/compiler.mjs      (290)   分镜 HTML 编译器 + 根时间轴组装
│   └── styles/lib.mjs              (238)   等轴测几何与材质库（frustum / matCss）
├── bin/video.mjs                   (169)   ★ 唯一编排入口，所有命令走 --project
├── projects/<name>/                        ← 视频沙箱（自闭环）
│   ├── project.json                        元数据：分辨率 / fps / 音色 / 主题
│   ├── script.json                         台词（旁白原文 + 音色）
│   ├── scenes.config.mjs                   分镜配置（画面文案 / 零件清单 / 图形引用）
│   ├── geo/                                该视频专属几何与装配代码
│   │   ├── lib.mjs                         re-export core/styles/lib.mjs
│   │   ├── figures.mjs                     零件图定义（键盘）
│   │   ├── build-figures.mjs               出图入口 → assets/figures/*.svg
│   │   └── gen-scenes.mjs                  手工调试用直调 compiler（10 行 shim）
│   ├── assets/
│   │   ├── figures/*.svg                   生成的矢量图（机器产物）
│   │   └── voice/                          TTS 音频 + words.json + timing.json + manifest.json
│   ├── compositions/*.html                 生成的分镜（机器产物）
│   ├── index.html                          生成的根时间轴（机器产物）
│   ├── preview/                            快照 / golden master
│   └── renders/*.mp4                       成片
├── docs/                                  架构与重构文档
└── skill/anatomy-hyperframes-workflow/    沉淀的可复用 skill（SKILL.md + 4 篇 reference + 9 个模板）
```

**当前两个租户**

| 项目 | 场景数 | 音频来源 | 成片 |
| :--- | :---: | :--- | :--- |
| `mechanical-keyboard` | 9（已全部出图出镜） | MiMo-v2.5-TTS（9/9） | `renders/mechanical_keyboard_anatomy.mp4`（17.7 MB） |
| `anc-headphones` | 2（配置 2 个，脚本 10 段台词） | Edge-TTS（2/2） | `renders/anc-headphones.mp4`（4.2 MB） |

`projects/_template/` 只有 `project.json` / `scenes.config.mjs` / `script.json` 三个文件，没有 `geo/build-figures.mjs` —— 见第五节隐患 6。

---

## 三、七个技术要点

### 1. 编排器只是一个薄调度器

`bin/video.mjs` 169 行，全部职责是：解析 `--project` → 定位沙箱 → 起子进程。它**不含任何业务逻辑**，也不做 HTML 拼接。

启动时先做两件事（`bin/video.mjs:18-22`）：

```js
const chromePath = resolveChromePath();
if (chromePath) {
  process.env.HYPERFRAMES_BROWSER_PATH = chromePath;
  process.env.PRODUCER_HEADLESS_SHELL_PATH = chromePath;
}
const HF_CLI = resolveHyperFramesCli();
```

子命令全部通过 `execFileSync` 起外部进程，且**一律 `cwd: PROJ_DIR`**：

```js
execFileSync("node", [HF_CLI, "check", "."], { cwd: PROJ_DIR, stdio: "inherit", env: process.env });
```

这条 `cwd` 绑定是架构级约束，不是风格偏好 —— HyperFrames 用相对路径找 `assets/`、并把缓存写进当前目录的 `.hyperframes/`，`cwd` 一旦错位，资源与缓存就落到别的沙箱里去。

`core/config.mjs` 的三个函数各自对应一个踩过的坑：

| 函数 | 解决的问题 |
| :--- | :--- |
| `resolveChromePath()` | 曾把 Chrome 版本路径写死，缓存清理后全线崩。现在优先 `HYPERFRAMES_BROWSER_PATH`，否则扫 `~/.cache/hyperframes/chrome/chrome-headless-shell/<version>/`。 |
| `cleanTempProfiles()` | 清 `%TEMP%/puppeteer_dev_chrome_profile-*`，否则 Windows 上残留锁导致进程死等。`check`/`snapshot`/`render` 前都会调。 |
| `resolveProjectDir(name)` | 把 `--project` 映射为物理路径，不存在直接抛错（`--project` 打错不会静默回退）。 |

### 2. 双轨 TTS：能对齐的不好听，好听的对不齐

`core/tts/engine.py` 处理的是一对无法同时满足的需求：**词级时间戳只有 Edge-TTS 给得出，商业级音质只有 MiMo 给得出。**

| | preview | production |
| :--- | :--- | :--- |
| 引擎 | Edge-TTS `zh-CN-YunxiNeural`，`rate="+8%"` | MiMo-v2.5-TTS（`茉莉` / `苏打`） |
| 输出 | `.preview.mp3` | `.mimo.mp3` → ffmpeg 转 44.1kHz / 192k |
| 时间戳 | `boundary="WordBoundary"`，`chunk["offset"] / 10**7` 得秒级 word start/end | **没有**，靠比例拉伸 |
| 成本 | 零成本、秒级 | 需 `MIMO_API_KEY` |

关键在 `scale_timestamps(words, edge_dur, dst_dur)`（`core/tts/engine.py:164`）：拿 Edge 音轨上测得的词边界，**按整段时长比例整体缩放**到 MiMo 音轨上。MiMo 请求失败时优雅降级回 Edge（`final_source = "edge-tts (fallback)"`），保证流水线永不中断。

`timing.json` 的 `source` 字段记录了每段最终用了哪个引擎 —— 键盘项目 9 段全是 `mimo-v2.5-tts`，耳机项目当前 2 段是 `edge-tts`。

**多音字解耦**（`engine.py:21-46`）是这个文件里最巧的一处。中文 TTS 会把"弹片"念成武器弹药（dàn piàn），而机械键盘语境要念 tán piàn。解法是**音画解耦**：

```python
PRONUNCIATION_OVERRIDES = {
    "两片金属弹片": "两片金属谈片",
    "两片弹片": "两片谈片",
    "金属弹片": "金属谈片",
    "弹片": "谈片",
}
```

- `to_phonetic_text()`：送进 TTS 的是同音字"谈片"，发音 100% 正确；
- `restore_display_words()`：词边界缓存 `.words.json` 落盘前**再换回规范字**，保证字幕与时间轴元数据里出现的是"弹片"。

> **约束**：新增术语纠偏必须同时改这两张表，否则 `words.json` 里会留下"谈片"这种错字脏数据。

### 3. 字幕：从字级时间戳反推句子区间

`align_subtitles()`（`engine.py:214`）不使用固定间隔拍字幕。真实做法：

1. `split_sentences()` 按 `。！？；` 切句，再用 `，` 把超 20 字的长句拆短；
2. 把每个 word 按字符均分成时间片，拼成 `char_timeline`（每字一个 `start/end`）；
3. 对每句，从 `curr_idx` 起在 `char_timeline` 里**顺序前向匹配**每个字，取首字 start、末字 end；
4. `s_start = max(last_end, first.start)` —— 强制句子不重叠，避免字幕打架；
5. 无时间戳时退化成按字符数比例分配。

于是字幕的起落点直接锚在真实发音上，而不是"每秒换一张"。

### 4. Anatomy 等轴测：为什么自写 `frustum` 而不直接用 `extrude`

`core/styles/lib.mjs:1` 引入 Anatomy 的 kit：

```js
import * as K from "../../../anatomy/kit/iso-kit.mjs";
```

自写 `frustum(bottom, top, z0, z1, P)` 的唯一理由是：kit 的 `extrude()` 只支持**等截面**棱柱，而键帽是上小下大的锥台、外壳有倒角收口。`frustum` 接受两个尺寸不同的环，其余光照与描边逻辑完全照抄 kit 的规则：

- 法线 `counter ? [dy/L, -dx/L] : [-dy/L, dx/L]`，`facing = n·v > 1e-9`；
- 光照 `l = [-sinA, cosA]`，`lit = (n·l + 1) / 2`，`shade = clamp(floor(lit*4), 0, 3)`；
- 可见面进 `buckets[shade]`，被遮挡面进 `back`（供透明外壳之类的双层效果）；
- `fill` 用 `convexHull([...tp, ...bp])` 兜底，`top` 用 `orient(tp)`。

`area / orient / runsOf / convexHull` 是抄来的，因为这些在 kit 里**没有导出**（已实测：`tenth`/`thousandth`/`oriented`/`convexHull`/`runsOf`/`signedArea` 全部 `false`，只有 `extrude` 等是 `true`）。

`matCss()` 生成 `.m-<material>` 材质规则，有三个不写就崩的细节：

1. **每个材质要带 `[data-lit]` / `[data-seamless]` 属性变体** —— kit 的 `.iso-solid[data-lit]>.iso-fill` 特异性是 0,3,0，普通 `.m-x .iso-fill`（0,2,0）压不住；
2. **必须补 4 条基础规则**：`.iso-line / .iso-edge / .iso-crease { fill: none; stroke-linecap: round; ... }`。漏掉 `fill:none`，所有描边路径会被默认填黑，整张图变成一团黑块 —— 这是本项目最出名的一次 bug；
3. **CSS 自定义属性 `var()` 在 SVG 光栅化链路里不可靠**，涉及离线预览/DOM 注入时需要把变量静态展开成字面值。

### 5. 编译器：把"渲染期的不确定性"全部前移到编译期

`compileProject(projectDir)`（`core/generator/compiler.mjs:63`）是整条流水线的心脏。它做四件事：

**(a) 时长全靠实测，不靠估算**

```js
const PAD = 1.05;
for (const s of SCENES) {
  s.voice = dur(join(voiceDir, `${s.id}.mp3`));   // ffprobe 实测
  s.len = Number((s.voice + PAD).toFixed(2));
  s.start = Number(t.toFixed(2));
  t += s.len;
}
```

改台词 → 重跑 voice → `scenes` 自动重排时间轴。**任何地方都不该出现手写的 `data-start` 秒数。**

**(b) 两条图形分支：内联 vs 引用**

- `s.isInline`（如机械轴那一幕）：读 `assets/figures/<fig>.svg` **原文内联**，把根 `<svg>` 改写成带 `id="k04-svg" class="clip fig" data-start data-duration` 的节点。这样 GSAP 能直接操作图内部的零件（`#s-stem`、`#s-spring`、`#s-contact`）。
- 非 inline：`<img src="assets/figures/<fig>.svg">`，只做整体淡入和微旋转。

> **硬约束**：`<img src="*.svg">` 是独立文档树，GSAP 永远动不了里面的零件。**任何需要"拆开/推动/高亮某个零件"的场景必须走 `isInline`。**

**(c) 台词驱动动画（音画同源）**

```js
const tStem = getWordTime(timings, s.id, "轴心", 2.9);
...
tl.to("#${s.key}-svg #s-stem .iso-edge", { stroke: "#ff7a45", strokeWidth: 1.8, duration: 0.2 }, ${tStem.toFixed(2)})
```

`getWordTime()` 从 `timing.json` 查该词的真实发音起点，第二个参数是**没查到时使用的兜底秒数**。动画因此不是"到第 3 秒就动"，而是"说到'轴心'就动"。

**(d) 三个层级的 timeline 各自独立**

- **子场景 timeline**：`window.__timelines["k<id>"] = tl`（`compiler.mjs:214`）
- 根：`window.__timelines["main"] = gsap.timeline({ paused: true })`（`compiler.mjs:272`），**空的**
- 绝不要把子场景 timeline `add()` 进根 timeline —— 会引发时钟错位。

同时根节点必须带 `data-root="true"`（`compiler.mjs:260`）：

```html
<div id="root" data-root="true" data-composition-id="main" data-start="0" data-duration="${TOTAL}" ...>
```

运行时 `Hs()` 优先选 `[data-composition-id][data-root="true"]`，frameCapture 也读 `[data-composition-id][data-root]`；两边选根不一致就报 **Composition has zero duration**。

**(e) 字幕样式：38px 无框**

`BASE_CSS`（`compiler.mjs:49-53`）里 `.sub-dock` 定死 38px / weight 600 / `#f8fafc` / 双层暗影 / `bottom:52px` 居中 / `pointer-events:none`，无进度条、无页码 —— 这是画面留白的硬标准。

### 6. 检查：三层门禁，但只有一层真正卡住

| 层 | 实现 | 是否阻断 |
| :--- | :--- | :--- |
| lint + runtime + layout + motion + contrast | `hyperframes check` | `bin/video.mjs:150-160` 只解析 `parsed.lint.errorCount`，**runtime / layout / contrast 的 error 只打印不阻断** |
| 视觉逐帧比对 | `preview/` 下的 golden master 关键帧 | **没有自动化脚本**，靠人/Agent 目视 |
| 版本控制 | git 原子提交 + `pre-multworkspace` tag | 靠流程自律 |

`check` 的真实输出可从 `.hyperframes/artifacts/checks/*.json` 取到，一个真实样本：

```json
{"ok":true,"browserSkipped":false,
 "lint":{"errorCount":0,"warningCount":0,"filesScanned":10},
 "runtime":{"errorCount":0,"findings":[{"code":"console_warning",
   "message":"[hyperframes] the runtime has no web-font gate; composition scripts run without waiting for fonts"}]},
 "layout":{"ok":true,"totalIssueCount":1},
 "contrast":{"ok":true,"checked":60}}
```

注意那个 `console_warning`：**运行时不等字体加载**就执行 composition 脚本。中文字体（`@font-face` 走 `local("Microsoft YaHei")`）如果没就绪，首帧文字可能闪一下或度量偏移。

另一个值得警惕的样本（同项目另一份 artifact）：

```json
{"ok":false,"browserSkipped":true,
 "runtime":{"errorCount":1,"findings":[{"code":"check_runtime_failure",
   "message":"Missing browser script motion-signature.browser.js"}]}}
```

`browserSkipped:true` 时 runtime 检查根本没有真正执行 —— **看到 `ok:false` 且 `browserSkipped:true`，要先去修浏览器，而不是去修 HTML。**

### 7. 多租户验收：`anc-headphones` 的真实意义

`docs/多工作区沙箱升级.md` 的 Step 4 用耳机项目做了第二租户实测，验收标准是"两套视频并存独立渲染成功，0 交叉污染"。这个验收是正确的架构验证方式 —— 单租户重构永远看不出隔离是否真的成立。

需要补充一条**状态说明**：耳机项目的 `scenes.config.mjs` 只有 2 个分镜（`01-intro` / `02-anti-wave`），而它的 `script.json` 有 10 段台词（`01-hook` … `10-outro-symphony`）。因为 `compileProject` 用 `scenes.config.mjs` 作为时间轴真源（缺失的音频 `dur()` 返回 0），当前成片只覆盖了前 2 段。**它是隔离性验证的成果，不是内容完整的成片。**

---

## 四、视频生成流程

### 总览

```mermaid
graph TD
    A["script.json<br/>旁白原文"] --> B["voice<br/>TTS + *.words.json + timing.json"]
    B --> C["figures<br/>geo/build-figures.mjs → assets/figures/*.svg"]
    C --> D["scenes<br/>compileProject → compositions/*.html + index.html"]
    D --> E["check<br/>lint / runtime / layout / contrast"]
    E --> F["render<br/>HyperFrames → renders/&lt;name&gt;.mp4"]
    S["scenes.config.mjs<br/>分镜配置（画面文案）"] --> D
    G["geo/figures.mjs<br/>零件几何定义"] --> C
```

注意 **`script.json` 和 `scenes.config.mjs` 是两份平行的配置**：前者管"说什么"，后者管"画什么、写什么字"。它们靠 `id` 对齐，但**没有交叉校验**（见隐患 3）。

### 命令

```bash
# 端到端（voice → figures → scenes → check）
node bin/video.mjs build --project mechanical-keyboard [--production]

# 分步
node bin/video.mjs voice    --project <name> [--production]
node bin/video.mjs figures  --project <name>
node bin/video.mjs scenes   --project <name>
node bin/video.mjs check    --project <name>
node bin/video.mjs snapshot --project <name> --at 1.0
node bin/video.mjs render   --project <name> --production
```

`package.json` 的 `npm run build|check|render|figures|scenes` 都是 `bin/video.mjs` 的转发，**均未带 `--project`，会落到默认 `mechanical-keyboard`**。多项目场景请直接调 `node bin/video.mjs`。

### 关键参数与行为

- `render` 固定 `-f 30 -w 1 -q looks`（`bin/video.mjs:117`）；
- `--production` 的 render 会**先重跑 TTS 生产音轨并重新编译**（`bin/video.mjs:104-113`）—— 因为 MiMo 与 Edge 时长不同，时间轴必须重算。跳过这步会得到"画面与声音对不上的成片"；
- 渲染前自动 `cleanTempProfiles()`，避免 Windows 上 puppeteer 锁死；
- HyperFrames 走本地仓库 CLI：`resolveHyperFramesCli()` 优先 `<repo>/../hyperframes/packages/cli/bin/hyperframes.mjs`，找不到才回退 `hyperframes` 命令（`core/config.mjs:44`）；
- 浏览器路径只认 `HYPERFRAMES_BROWSER_PATH`（`bin/video.mjs` 已自动注入）。**设 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 无效** —— 这是曾经踩过的坑。

### 新建一部视频的正确姿势

1. `cp -r projects/_template projects/<new-name>`；
2. 填 `project.json`（分辨率/音色/主题）、`script.json`（台词）、`scenes.config.mjs`（分镜）；
3. **补 `geo/build-figures.mjs` + `geo/figures.mjs`**（模板里没有，见隐患 6）；
4. `node bin/video.mjs build --project <new-name>` → `check` → `render`；
5. 用 `snapshot` 抓几帧目检，再把合格帧存进 `preview/` 作 golden master。

---

## 五、隐患与改进建议

以下问题按"是否阻断换机器/扩容"排序，均可独立施工。

### P0 — 架构性

**1. `core/styles/lib.mjs:1` 跨仓库硬依赖**

```js
import * as K from "../../../anatomy/kit/iso-kit.mjs";
```

整个仓库的绘图能力建立在**同级的 `anatomy/` 目录存在**这一前提上。换机器、CI、或 anatomy 上游改动都会直接断掉。

→ 建议：把 kit 做成 vendored 副本（`vendor/anatomy-kit/`）并在文件头记录 pin 的 commit；或在 `package.json` 用 `file:` / npm 依赖固定版本。

**2. 跨仓库相对路径导入还会绕过 `cwd` 沙箱约束**

`core/generator/compiler.mjs:5` 是 `import { matCss } from "../styles/lib.mjs"`（**静态导入**），而 `bin/video.mjs` 用**动态 `import()`** 载入 compiler。两者解析基准不同（`__dirname` vs `cwd`），一旦有人把 compiler 挪位置或复用到别处，静态那行会先炸。建议统一成相对于 `REPO_ROOT` 的解析。

### P1 — 正确性

**3. `script.json` 与 `scenes.config.mjs` 的 id 不对齐且无校验**

`mechanical-keyboard` 两边 id 完全一致（9/9）；但 `anc-headphones` 的 script 是 `01-hook / 02-versus-pnc / … / 10-outro-symphony`，scenes 是 `01-intro / 02-anti-wave` —— **一个都对不上**。`compileProject` 只按 scenes 遍历，`dur()` 对不存在的 mp3 返回 0，于是静默产出一条 2 场景短片，**没有任何报错**。

→ 建议：在 `compileProject` 开头加断言 —— scenes 里每个 `id` 必须能在 `script.json` 找到，否则 `throw`。

**4. `--production` 无 Key 时静默降级**

`engine.py:343` 只有在 `mode == "production" and mimo_key` 时才走 MiMo。没有 Key 时 `mode == "production"` 却悄悄用 Edge 音轨，最终 `final_source` 记为 `"edge-tts"`。批量生产时很容易误以为拿到的是商业级音频。

→ 建议：`production` 模式下无 Key 直接 fail，或至少在 CLI 层打印醒目警告。

**5. `innerHTML` 与 `null` 系失败的 `catch` 吞错**

`bin/video.mjs:151-160`：

```js
try {
  const parsed = JSON.parse(checkRes.stdout.trim().split("\n").pop());
  if (parsed.lint && parsed.lint.errorCount > 0) { ...process.exit(1); }
  log("Step 4/4", "Quality gate passed! Lint: 0 errors.");
} catch {
  log("Step 4/4", "Quality check completed.");   // ← 真·检查失败也走这里
}
```

JSON 解析失败、`checkRes` 非 0 退出、runtime/layout/contrast 有 error 全部落进这个沉默分支。**门禁名义上存在，实际上只拦 lint。**

→ 建议：分别判断 `checkRes.status`、`parsed.ok`、以及各子检查的 `errorCount`，非 0 一律 `exit 1`；`catch` 里输出原始 stdout/stderr。

### P2 — 工程卫生

**6. `projects/_template` 不可直接跑**

模板只有 3 个文件，没有 `geo/build-figures.mjs`。`bin/video.mjs:134-138` 用 `existsSync` 判断，文件不在就**静默跳过出图**，后续 `scenes` 会引用不存在的 SVG（`existsSync` 为 false → 空字符串 → 画面缺图，不报错）。

→ 建议：模板补一份最小 `geo/figures.mjs` + `build-figures.mjs`（画一个方块即可），并在 `build` 里对缺失 `build-figures.mjs` 报警而非静默跳过。

**7. `geo/gen-scenes.mjs` / `geo/lib.mjs` 是历史 shim**

各项目里的 `gen-scenes.mjs`（10 行）和 `lib.mjs`（2 行 re-export）是重构前遗留的手工入口，与 `bin/video.mjs scenes` 功能重复。留着两套入口容易让人调错。

→ 建议：删掉 `gen-scenes.mjs`，保留 `lib.mjs` 作为项目内统一导入别名（有实际价值）。

**8. 机器产物与二进制入了 git**

已提交的包括：`compositions/*.html`（9+2 个）、`index.html`、`assets/figures/*.svg`、`assets/voice/*.mp3`、`renders/*.mp4`（17.7 MB + 4.2 MB）、`preview/**.png`。

其中 `renders/*.mp4` 最值得商榷：`.gitignore` 里写了 `renders/*.mp4`，但这两个文件是**先前已 `git add` 过**所以仍被跟踪（`.gitignore` 对已跟踪文件无效）。

→ 建议：`git rm --cached` 掉 mp4 与 `assets/voice/*.mp3`（音频可用脚本重生）；`compositions/` 和 `figures/` 视是否需要"冻结产物"决定，若保留则应在 CI 里校验"重新生成 == 已提交"。

**9. `core/config.mjs:15` 写死用户名**

```js
const baseCache = "C:/Users/Administrator/.cache/hyperframes/chrome/chrome-headless-shell";
```

它要解决的正是"路径写死"问题，却留了个写死的 home 目录。

→ 建议：`join(os.homedir(), ".cache/hyperframes/chrome/chrome-headless-shell")`。

**10. `compiler.mjs` 里写死了键盘专属词表**

`compiler.mjs:122-129` 把 `"上" / "轴心" / "弹簧" / "弹片" / "下" / "按下" / "接触" / "闭合"` 和对应的 `#s-stem`、`#s-spring` 选择器硬编码在通用引擎里。第二个项目（耳机）根本用不上这套。

→ 建议：下沉到 `scenes.config.mjs` 的声明式配置，例如：

```js
highlights: [
  { part: "#s-stem", at: "轴心", fx: "flash" },
  { part: "#s-spring", at: "弹簧", fx: "squash" },
]
```

`compiler` 只负责把 `fx` 展开成 GSAP 调用。

---

## 六、一句话总结

**这套工程的价值在于把视频生产从"手写时间轴"变成了"编译一台机器"**：台词进去，时长、图形、动画、字幕全部推导出来，人只需要审图。它现在最大的两个待办是 **把 anatomy kit 收进仓库（P0-1）** 和 **让质量门禁真的会拦（P1-3/5）** —— 前者决定它能不能离开这台机器，后者决定它能不能在无人值守时可信。

---

## 附录：核对基线

| 项 | 值 |
| :--- | :--- |
| commit | `0610708` |
| 代码规模 | 引擎 1,156 行（`core/` 987 + `bin/` 169）、项目侧 `geo/` 816 行 |
| 已跟踪文件 | 172 个 |
| 键盘项目 | 9 场景 / 音频合计 96.16s / 9 张 SVG（最大 `hero.svg` 478 KB） |
| 耳机项目 | 2 场景 / 音频合计 13.49s / 2 张 SVG |
| 最近一次 check | `lint 0 error / 0 warning`、`contrast 用色对 60 组通过`、`layout 1 处 issue`、`runtime 0 error（1 条 console_warning）` |
