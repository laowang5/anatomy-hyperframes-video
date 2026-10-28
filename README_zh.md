# Anatomy × HyperFrames 视频生成引擎

<p align="center">
  <b>代码驱动的工业工程解剖与等轴测（Isometric）视频合成引擎</b><br>
  <sub>将工程解构台本，通过纯代码、矢量几何着色器与毫秒级声学对齐，自动化渲染为 1080P 高清工业级解说视频。</sub>
</p>

<p align="center">
  <a href="README.md">English</a> •
  <b>简体中文</b>
</p>

<p align="center">
  <a href="#-为什么需要这个引擎">核心背景</a> •
  <a href="#-基石生态hyperframes--anatomy">基石生态</a> •
  <a href="#-样例成片效果演示">成片演示</a> •
  <a href="#-核心特性">核心特性</a> •
  <a href="#%EF%B8%8F-架构拓扑">架构拓扑</a> •
  <a href="#-快速上手">快速上手</a> •
  <a href="#-cli-完整命令参考">CLI 参考</a> •
  <a href="#%EF%B8%8F-环境配置与商业配音对接">环境配置</a> •
  <a href="THIRD_PARTY_NOTICES.md">开源致谢</a> •
  <a href="LICENSE">开源协议</a>
</p>

---

## 🌟 为什么需要这个引擎？

传统的动态图形设计与三维工程拆解视频（依托 Blender、Cinema 4D 或 After Effects）在制作硬核工业科普与产品解构时，存在一个致命的工程痛点：**极其脆弱的后期迭代成本**。

只要台本文案调整了两个字，或是配音语速快了半秒，工程师与动画师就必须在数十个图层、成百上千个手动打下的关键帧轨道中进行手动拉伸和重新对齐，牵一发而动全身。

**Anatomy-HyperFrames** 采用**编译器驱动的声明式视频管线（Compiler-Driven Video Synthesis Pipeline）**，从根本上解决了这个难题：

1. **台本即单一事实源（Single Source of Truth）**：只需在 `script.json` 中书写工程讲解台本。
2. **声学驱动时间轴弹性推演**：引擎自动调度语音合成，提取词级（WordBoundary）毫秒级时间戳，全自动推导每个分镜的时长、字幕区间与动效触发节拍。
3. **纯代码矢量几何与 GSAP 穿透**：基于等轴测投影算法（Isometric Projection）与高精度 SVG 构件，GSAP 穿透 DOM 树直接控制零件位移、气压形变、爆炸解体与光晕流动。
4. **确定性 Headless 渲染流水线**：基于 Chrome Headless 进行逐帧物理离屏渲染，内置 WCAG AA 对比度审计、防车轮频闪混叠（Stroboscopic Aliasing）与运动安全门禁。

---

## 🧩 基石生态：HyperFrames × Anatomy

本项目深度融合并构建于两个卓越的开源项目之上：

1. **[HyperFrames](https://github.com/hyperframes/hyperframes)**（*“Write HTML. Render video. Built for agents.”*）：
   - **底层视频渲染宿主**：负责执行 Headless Chrome 离屏逐帧渲染、毫秒级时间轴同步、实时开发预览（Studio）以及输出 1080P MP4 视频。
   - **运行时要求**：需具备 `@hyperframes/cli` 运行环境（支持全局安装、本地安装或 `npx` 自动调用）。
2. **[Anatomy](https://github.com/wheresryan22/anatomy)**（*“Explain an idea by building it as a real, working object.”*）：
   - **等轴测工程几何体系**：提供了参数化三维多面体投影算法、面法线光照着色与机械装配分层逻辑。
   - **开箱即用支持**：核心三维等轴测算子已内置于本项目的 `vendor/anatomy-kit`，无需额外安装即可直接运行 `geo/build-figures.mjs` 构建复杂工程图纸；配合 AI Agent 时亦可通过 `npx skills add wheresryan22/anatomy` 获得原生技能支持。

---

## 🎬 样例成片效果演示

本项目自带全套 9 分镜客制化机械键盘结构拆解旗舰示例，以下为引擎由纯代码与矢量 SVG 自动化生成的 1080P 成片（**可在网页直接点击播放**）：

https://github.com/user-attachments/assets/edd718c8-c0b7-4a1f-b5f8-50cfa9c46c7a

> 💡 *成片特性：等轴测机械键盘逐层爆炸、轴体下压触发动效、磁轴霍尔效应传感器、消音棉与底壳声画毫秒级对齐。*

---

## ⚡ 核心特性

- 📐 **参数化等轴测几何装配（Vector Isometric Assemblies）**：内置三维空间投影矩阵、深度分层（Z-indexing）、光照阴影材质着色器与视锥体裁剪算法。
- 🎙️ **双轨弹性声学对齐引擎（Dual-Track Audio Alignment）**：
  - **预览模式（Preview）**：集成 Edge-TTS（`zh-CN-YunxiNeural`），毫秒级提取词边界（WordBoundary）时间戳，实现零 Token 成本的极速开发对齐。
  - **成片模式（Production）**：标准化对接 OpenAI 兼容的高保真商业语音大模型，基于时长比率（`prodDur / edgeDur`）弹性伸缩全局关键帧时间轴。
- 🗣️ **声画解耦多音字纠偏系统（Heteronym Phonetic Decoupling）**：支持项目级发音词典（`project.json` / `pronunciation.json`）。多音字发音修正只作用于音频流，字幕与画面标注始终保留严谨工程标准字（例如 `弹片` 语音自动矫正为 `tán piàn`，字幕依然显示 `弹片 LEAF`）。
- 🔒 **物理沙箱多工作区隔离（Physical Sandbox Isolation）**：`projects/<name>` 每个视频工程完全闭环独立；`.gitignore` 采用白名单沙箱策略，本地的商业或个人工程完全不被 Git 追踪，绝无意外泄露风险。
- 🛡️ **多维品质门禁审计（Multi-Axis Quality Gates）**：自动化语法 Lint、动态执行断言、WCAG AA 4.5:1 文字对比度检测、防频闪混叠与运动安全检查。
- 🎬 **全自动多平台封面合成引擎**：自动输出适合移动端信息流的 4:3 黄金安全区封面与 16:9 动态毛玻璃羽化翼（Blurred Wings）壁纸，并支持将封面注入 MP4 容器首帧。

---

## 🏗️ 架构拓扑

```text
anatomy-hyperframes-video/
├── core/                                 # 🌟 核心通用引擎 (领域中立)
│   ├── config.mjs                        # 动态 Chrome 寻址器与 Windows 临时锁清理器
│   ├── tts/engine.py                     # 双轨声学对齐与多音字纠偏引擎
│   ├── generator/compiler.mjs            # 声明式分镜编译器与主时间轴生成器
│   └── styles/lib.mjs                    # 等轴测着色器材质库与视锥算法
├── bin/
│   └── video.mjs                         # 🌟 统一主 CLI 调度入口 (pnpm video / node bin/video.mjs)
├── vendor/
│   └── anatomy-kit/                      # 内嵌等轴测投影几何包
├── projects/                             # 🌟 工作区沙箱 (沙箱物理隔离)
│   ├── _template/                        # 官方标准可复现工程起步模板
│   └── mechanical-keyboard/              # 官方旗舰样例：9分镜客制化机械键盘结构拆解
├── package.json                          # Node.js 工程配置与 CLI 软链接
├── pyproject.toml / requirements.txt     # Python 音频对齐核心依赖
└── .env.example                          # 生产环境配置模板
```

---

## 🚀 快速上手

### 1. 前置环境与依赖安装

运行本项目前，请确保系统中已具备以下工具：

1. **基础工具链**：
   - **Node.js** ≥ 18.0.0
   - **Python** ≥ 3.10
   - **FFmpeg & FFprobe**（已配置进系统环境变量 PATH）
   - **uv**（推荐的现代化 Python 包管理器，环境变量已就绪）或标准 `pip`

2. **视频渲染基石 HyperFrames CLI**：
   本项目依赖 `@hyperframes/cli` 进行逐帧离屏渲染。推荐全局安装或项目本地安装：
   ```bash
   # 全局安装 HyperFrames CLI (推荐)
   npm install -g hyperframes
   
   # 或在首次运行时让引擎通过 npx 自动调用（免全局安装）
   ```
   > 💡 **无头 Chrome 提示**：首次执行 `node bin/video.mjs check` 或 `render` 时，HyperFrames 会全自动下载匹配版本的 `chrome-headless-shell`，无需手动配置。若网络受限，也可通过环境变量 `HYPERFRAMES_BROWSER_PATH` 指向本地现有的 Chrome 无头可执行文件。

3. **工程解剖几何体系 Anatomy**：
   - 核心三维等轴测多面体投影与光照算子已**预置集成**于本项目的 [`vendor/anatomy-kit`](vendor/anatomy-kit)，无需额外安装即可开箱使用。
   - 若在 Cursor / Claude Code / Antigravity 等 AI Agent 环境中深度协同，可按需添加官方 skill：`npx skills add wheresryan22/anatomy`。

---

### 2. 克隆项目与环境自检

```bash
git clone https://github.com/laowang5/anatomy-hyperframes-video.git
cd anatomy-hyperframes-video

# 安装 Python 声学处理依赖
uv pip install -r requirements.txt
# (或使用标准 pip: pip install -r requirements.txt)

# 执行系统环境全量诊断
node bin/video.mjs doctor
```

自检通过时终端输出：
```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🩺 Anatomy-HyperFrames Video Environment Doctor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Node.js           : v24.13.0
  ✅ Python 3          : 3.14.6
  ✅ uv (Package Mgr)  : 0.12.17
  ✅ FFmpeg            : ffmpeg version 9.0.1
  ✅ FFprobe           : ffprobe version 9.0.1
  ✅ HyperFrames CLI   : @hyperframes/cli ready
  ✅ Chrome Headless   : .../chrome-headless-shell.exe
  ✅ Python Modules    : edge-tts & requests ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 3. 30 秒构建与渲染你的第一个视频

以起步模板 `_template` 为例：

```bash
# 步骤 1: 生成语音音频、编译分镜并运行品质门禁检查
node bin/video.mjs build --project _template

# 步骤 2: 渲染为 1080P 60FPS/30FPS 高清 MP4 视频
node bin/video.mjs render --project _template
```

渲染产物将保存在：
`projects/_template/renders/_template.mp4`

---

## 📖 CLI 完整命令参考

主 CLI 调度器可通过 `node bin/video.mjs <command>` 或配置好的 `pnpm video <command>` 调用：

| 命令 | 运行示例 | 作用与管线说明 |
| :--- | :--- | :--- |
| `doctor` | `node bin/video.mjs doctor` | 审计系统 FFmpeg、Node、Python 及 Headless Chrome 状态。 |
| `build` | `node bin/video.mjs build -P <name>` | 运行全量管线：语音合成 → 矢量零件图 → HTML编译 → 门禁审计。 |
| `voice` | `node bin/video.mjs voice -P <name> [--production]` | 仅生成语音音频并提取毫秒级词边界时间戳。 |
| `figures` | `node bin/video.mjs figures -P <name>` | 运行 `geo/build-figures.mjs` 构建等轴测 3D 矢量 SVG 零件。 |
| `scenes` | `node bin/video.mjs scenes -P <name>` | 编译独立分镜并在根目录构建动态时间轴 `index.html`。 |
| `check` | `node bin/video.mjs check -P <name>` | 执行 HyperFrames 质量门禁（语法检查、运行时断言、色彩对比度）。 |
| `preview` | `node bin/video.mjs preview -P <name>` | 启动后台持久化 Studio 预览调试服务器。 |
| `snapshot` | `node bin/video.mjs snapshot -P <name> --at 1.5` | 在指定秒数抓取单帧渲染快照用于画面验收。 |
| `render` | `node bin/video.mjs render -P <name> [--production]` | 逐帧离屏渲染输出 1080P 工业级 MP4 视频文件。 |

> 💡 **上下文智能感知**：如果你的终端已经处于某个项目的目录中（例如在 `projects/mechanical-keyboard` 内），执行所有命令均可**省略 `--project` 参数**，CLI 会自动根据当前工作目录推导工程上下文！

---

## 🛠️ 创建一个全新的视频工程

1. **复制标准骨架**：
   ```bash
   cp -r projects/_template projects/my-product
   ```
2. **修改工程元数据**（`projects/my-product/project.json`）：
   ```json
   {
     "id": "my-product",
     "name": "My Product Anatomy",
     "resolution": "landscape",
     "width": 1920,
     "height": 1080,
     "fps": 30
   }
   ```
3. **书写讲解台本**（`projects/my-product/script.json`）：
   ```json
   [
     {
       "id": "01-intro",
       "text": "这是一台极其精密的高性能工程设备，内部蕴含着非同寻常的力学构造。"
     }
   ]
   ```
4. **配置分镜与动效**（`projects/my-product/scenes.config.mjs`）。
5. **一键生成视频**：
   ```bash
   node bin/video.mjs build --project my-product
   node bin/video.mjs render --project my-product
   ```

---

## ⚙️ 环境配置与商业配音对接

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

```ini
# [可选] 高保真商业级 TTS 语音配置 (兼容 OpenAI Audio / Chat Completion 规范)
# 若留空，引擎自动无感使用免费、零成本的 Edge-TTS
TTS_API_KEY=your-api-key
TTS_BASE_URL=https://api.your-provider.com/v1
TTS_MODEL=your-tts-model
TTS_VOICE=茉莉
TTS_TEMPO=1.0

# [可选] 显式指定 Headless Chrome 绝对路径 (留空时引擎将自动从本地缓存智能寻址)
# HYPERFRAMES_BROWSER_PATH=
```

- 在需要产出广播级成片音质时，只需在 CLI 中添加 `--production`（例如 `node bin/video.mjs render --project mechanical-keyboard --production`），引擎将全自动调用商业模型，并将词级时间戳进行弹性微调对齐。

---

## 📄 开源协议与致谢

- **开源协议**：本项目基于 [MIT 许可证](LICENSE) 发布。
- **第三方开源致谢**：详细依赖说明与第三方库协议声明详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
