#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Anatomy × HyperFrames 双轨 TTS 引擎 (Dual-Track Audio Alignment Engine)
- 预览模式 (Preview/Draft): Edge-TTS + WordBoundary 词级时间戳提取 (快速/零成本/毫秒级对齐)
- 成片模式 (Production/Final): MiMo-v2.5-TTS 高保真商业级配音 + 弹性时间戳缩放映射
"""

import os
import sys
import json
import base64
import asyncio
import argparse
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_PATH = ROOT / "geo" / "script.json"
voice_dir = ROOT / "assets" / "voice"
timing_file = voice_dir / "timing.json"
manifest_file = voice_dir / "manifest.json"

# ── 中文多音字与机械键盘专有术语发音纠偏表（音画解耦：画面显示规范字，语音采用明确单音字）──
PRONUNCIATION_OVERRIDES = {
    "两片金属弹片": "两片金属谈片",
    "两片弹片": "两片谈片",
    "金属弹片": "金属谈片",
    "弹片": "谈片",
}

def to_phonetic_text(text: str) -> str:
    """将文本中的多音字替换为绝对正确的发音同音字"""
    for src, target in PRONUNCIATION_OVERRIDES.items():
        text = text.replace(src, target)
    return text

def restore_display_words(words: list) -> list:
    """将词级时间戳中的发音同音字还原为原展示词，保持声画元数据一致性"""
    reverse_map = {v: k for k, v in PRONUNCIATION_OVERRIDES.items()}
    # 补充单字映射
    reverse_map["谈"] = "弹"
    reverse_map["谈片"] = "弹片"
    for w in words:
        orig = w.get("text", "")
        for phon, disp in reverse_map.items():
            if phon in orig:
                w["text"] = orig.replace(phon, disp)
                break
    return words

# 尝试从 video-team/.env 或当前 .env 提取 MIMO_API_KEY
def resolve_mimo_key() -> str:
    key = os.environ.get("MIMO_API_KEY", "").strip()
    if key:
        return key
    candidate_envs = [
        ROOT / ".env",
        ROOT.parent / "video-team" / ".env",
        Path("G:/Workspace/video-team/.env"),
    ]
    for env_file in candidate_envs:
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("MIMO_API_KEY=") and not line.startswith("#"):
                    k = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if k:
                        return k
    return ""

def probe_duration(file_path: Path) -> float:
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        str(file_path)
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(res.stdout.strip())
    except Exception as e:
        print(f"⚠️ [Probe] 无法探测时长 {file_path}: {e}")
        return 0.0

# ── 1. Edge-TTS 合成与 WordBoundary 词级时间戳提取 ──
async def generate_edge_preview(text: str, out_path: Path, voice: str = "zh-CN-YunxiNeural"):
    import edge_tts
    out_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = out_path.with_suffix(".tmp.mp3")

    communicate = edge_tts.Communicate(text, voice, rate="+8%", boundary="WordBoundary")
    word_timestamps = []

    with open(temp_path, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start_s = round(chunk["offset"] / 10**7, 3)
                dur_s = round(chunk["duration"] / 10**7, 3)
                word_timestamps.append({
                    "text": chunk["text"],
                    "start": start_s,
                    "end": round(start_s + dur_s, 3)
                })

    if temp_path.exists() and temp_path.stat().st_size > 0:
        if out_path.exists():
            out_path.unlink()
        temp_path.replace(out_path)
        return word_timestamps
    raise RuntimeError("Edge-TTS 生成空音频")

# ── 2. MiMo-v2.5-TTS 高保真商业级配音合成 ──
async def generate_mimo_production(text: str, out_path: Path, voice: str = "茉莉", api_key: str = ""):
    from openai import OpenAI
    import numpy as np
    import soundfile as sf

    client = OpenAI(
        api_key=api_key,
        base_url="https://token-plan-cn.xiaomimimo.com/v1",
        timeout=40.0
    )

    def _call():
        completion = client.chat.completions.create(
            model="mimo-v2.5-tts",
            messages=[{"role": "assistant", "content": text}],
            audio={"format": "pcm16", "voice": voice},
            stream=True
        )
        chunks = []
        for chunk in completion:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            audio = getattr(delta, "audio", None)
            if audio is not None:
                audio_data = getattr(audio, "data", None) if not isinstance(audio, dict) else audio.get("data")
                if audio_data:
                    pcm_bytes = base64.b64decode(audio_data)
                    np_pcm = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                    chunks.append(np_pcm)
        if not chunks:
            raise RuntimeError("未收到 MiMo TTS 音频数据块")
        return np.concatenate(chunks)

    loop = asyncio.get_running_loop()
    collected = await asyncio.wait_for(loop.run_in_executor(None, _call), timeout=45.0)

    wav_tmp = out_path.with_suffix(".tmp.wav")
    sf.write(str(wav_tmp), collected, samplerate=24000)

    # ffmpeg 转成高保真 MP3 (44.1kHz, 192k)
    cmd = [
        "ffmpeg", "-y", "-i", str(wav_tmp),
        "-ar", "44100", "-ac", "1",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(out_path)
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    if wav_tmp.exists():
        wav_tmp.unlink()

# ── 3. 智能词级时间戳弹性拉伸对齐 ──
def scale_timestamps(words: list, src_dur: float, dst_dur: float) -> list:
    if not words or src_dur <= 0 or dst_dur <= 0:
        return words
    ratio = dst_dur / src_dur
    scaled = []
    for w in words:
        scaled.append({
            "text": w["text"],
            "start": round(w["start"] * ratio, 3),
            "end": round(w["end"] * ratio, 3)
        })
    return scaled

# ── 4. 智能字幕切分与毫秒级时间轴对齐 ──
import re

def split_sentences(text: str) -> list:
    """按标点符号与呼吸停顿智能切分短句，保证每句在 6~22 字最佳视觉体验"""
    delimiters = r'([。！？；])'
    parts = re.split(delimiters, text)
    sentences = []
    current = ""
    for p in parts:
        if not p:
            continue
        current += p
        if re.match(delimiters, p):
            sentences.append(current.strip())
            current = ""
    if current.strip():
        sentences.append(current.strip())
    
    final_sentences = []
    for s in sentences:
        if len(s) > 20 and "，" in s:
            subparts = s.split("，")
            buf = ""
            for i, sp in enumerate(subparts):
                comma = "，" if i < len(subparts) - 1 else ""
                if len(buf + sp + comma) <= 20 or not buf:
                    buf += sp + comma
                else:
                    final_sentences.append(buf.strip())
                    buf = sp + comma
            if buf.strip():
                final_sentences.append(buf.strip())
        else:
            final_sentences.append(s)
    return [s for s in final_sentences if s]

def align_subtitles(sentences: list, words: list, total_dur: float) -> list:
    """将短句与词级时间戳进行精准首尾锚定，构建字幕时间区间"""
    if not sentences:
        return []
    
    subtitles = []
    char_timeline = []
    for w in words:
        w_text = w.get("text", "")
        start = w.get("start", 0.0)
        end = w.get("end", 0.0)
        dur = max(0.01, end - start)
        for i, c in enumerate(w_text):
            c_start = start + dur * (i / len(w_text))
            c_end = start + dur * ((i + 1) / len(w_text))
            char_timeline.append({"char": c, "start": c_start, "end": c_end})
            
    # 若无时间戳，按字符数比例分配
    if not char_timeline:
        total_chars = sum(len(s) for s in sentences)
        curr = 0.15
        avail = max(1.0, total_dur - 0.3)
        for s in sentences:
            span = round((len(s) / total_chars) * avail, 2)
            subtitles.append({"text": s, "start": round(curr, 2), "end": round(curr + span, 2)})
            curr += span
        return subtitles

    curr_idx = 0
    last_end = 0.1
    for s in sentences:
        s_clean = re.sub(r'[，。！？；：、\s]', '', s)
        matched = []
        for c in s_clean:
            search_idx = curr_idx
            while search_idx < len(char_timeline):
                if char_timeline[search_idx]["char"] == c:
                    matched.append(char_timeline[search_idx])
                    curr_idx = search_idx + 1
                    break
                search_idx += 1
        
        if matched:
            s_start = max(last_end, round(matched[0]["start"], 2))
            s_end = round(matched[-1]["end"], 2)
            if s_end <= s_start:
                s_end = round(s_start + 1.2, 2)
        else:
            s_start = round(last_end, 2)
            s_end = round(s_start + 1.5, 2)
            
        last_end = s_end
        subtitles.append({
            "text": s,
            "start": s_start,
            "end": min(round(total_dur, 2), s_end)
        })
    return subtitles

# ── 主执行流程 ──
async def main():
    parser = argparse.ArgumentParser(description="Dual-Track TTS Engine (Edge-TTS & MiMo-TTS)")
    parser.add_argument("--mode", choices=["preview", "production", "auto"], default="preview",
                        help="TTS模式: preview(Edge-TTS词级对齐), production(MiMo最终渲染), auto(有Key走MiMo无Key走Edge)")
    parser.add_argument("--project-dir", default=None, help="目标项目沙箱路径")
    parser.add_argument("--force", action="store_true", help="强制重新合成，忽略已存在的文件缓存")
    args = parser.parse_args()

    proj_dir = Path(args.project_dir).resolve() if args.project_dir else ROOT
    script_file = proj_dir / "script.json"
    if not script_file.exists():
        script_file = proj_dir / "geo" / "script.json"
    voice_dir = proj_dir / "assets" / "voice"
    timing_file = voice_dir / "timing.json"
    manifest_file = voice_dir / "manifest.json"

    voice_dir.mkdir(parents=True, exist_ok=True)
    scenes = json.loads(script_file.read_text(encoding="utf-8"))

    mimo_key = resolve_mimo_key()
    mode = args.mode
    if mode == "auto":
        mode = "production" if mimo_key else "preview"

    print(f"\n{'━'*60}")
    print(f"  🎙️ 双轨音频对齐引擎 (Dual-Track TTS Engine)")
    print(f"  🔧 执行模式: {'⚡ [Preview] Edge-TTS 快速预览' if mode == 'preview' else '🌟 [Production] MiMo-v2.5-TTS 高保真商业渲染'}")
    if mode == "production":
        print(f"  🔑 MiMo 授权: {'已就绪 (' + mimo_key[:6] + '...' + mimo_key[-4:] + ')' if mimo_key else '❌ 未找到 MIMO_API_KEY，将优雅降级'}")
    print(f"{'━'*60}\n")

    timing_data = {}
    manifest_data = []
    total_duration = 0.0

    for idx, s in enumerate(scenes, start=1):
        sid = s["id"]
        text = s["text"]
        phonetic_text = to_phonetic_text(text)
        edge_voice = s.get("voice", "zh-CN-YunxiNeural")
        
        target_mp3 = voice_dir / f"{sid}.mp3"
        preview_mp3 = voice_dir / f"{sid}.preview.mp3"
        mimo_mp3 = voice_dir / f"{sid}.mimo.mp3"

        # 1. 始终保证具备 Edge-TTS 基础音频与词级时间戳基准
        words_cache = voice_dir / f"{sid}.words.json"
        words = []
        if words_cache.exists() and not args.force:
            try:
                words = json.loads(words_cache.read_text(encoding="utf-8"))
            except Exception:
                words = []

        if not words or args.force or not preview_mp3.exists():
            print(f"[{idx}/{len(scenes)}] 正在提取 Edge-TTS 词级时间戳: {sid}...")
            words = await generate_edge_preview(phonetic_text, preview_mp3, voice=edge_voice)
            words = restore_display_words(words)
            words_cache.write_text(json.dumps(words, indent=2, ensure_ascii=False), encoding="utf-8")
        else:
            print(f"[{idx}/{len(scenes)}] 复用已有 Edge-TTS 时间戳缓存: {sid} ({len(words)} 词)")

        edge_dur = probe_duration(preview_mp3)

        # 2. 如果是 production 模式且有 MiMo Key
        final_mp3 = preview_mp3
        final_dur = edge_dur
        final_source = "edge-tts"

        if mode == "production" and mimo_key:
            try:
                if args.force or not mimo_mp3.exists():
                    print(f"  └─ 🚀 正在请求 MiMo-v2.5-TTS 高保真配音 (已应用多音字纠偏)...")
                    await generate_mimo_production(phonetic_text, mimo_mp3, voice="茉莉", api_key=mimo_key)
                final_dur = probe_duration(mimo_mp3)
                final_mp3 = mimo_mp3
                final_source = "mimo-v2.5-tts"
                # 按真实时长弹性缩放词级时间戳
                words = scale_timestamps(words, edge_dur, final_dur)
                print(f"  └─ ✅ MiMo 配音完成 ({final_dur:.2f}s, 缩放比率: {final_dur/edge_dur:.2f})")
            except Exception as e:
                print(f"  └─ ⚠️ MiMo 合成失败，优雅降级为 Edge-TTS: {e}")
                final_mp3 = preview_mp3
                final_dur = edge_dur
                final_source = "edge-tts (fallback)"
        else:
            print(f"  └─ ⚡ 采用 Edge-TTS 预览音频 ({edge_dur:.2f}s)")

        # 同步拷贝到 target_mp3 供全工程直接消费
        import shutil
        shutil.copyfile(final_mp3, target_mp3)

        # 3. 智能短句字幕切分与时间轴对齐
        sentences = split_sentences(text)
        subtitles = align_subtitles(sentences, words, final_dur)

        total_duration += final_dur
        timing_data[sid] = {
            "source": final_source,
            "duration": round(final_dur, 3),
            "words": words,
            "subtitles": subtitles
        }
        manifest_data.append({
            "id": sid,
            "duration": round(final_dur, 3),
            "chars": len(text),
            "source": final_source
        })

    # 保存元数据与词级时间戳表
    timing_file.write_text(json.dumps(timing_data, indent=2, ensure_ascii=False), encoding="utf-8")
    manifest_file.write_text(json.dumps(manifest_data, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\n{'━'*60}")
    print(f"  ✅ 音频全量生成完毕！")
    print(f"  📊 总场景数: {len(scenes)} | 总音频时长: {total_duration:.2f}s")
    print(f"  📄 词级时间戳已导出: {timing_file.relative_to(ROOT)}")
    print(f"  📄 音频清单已更新: {manifest_file.relative_to(ROOT)}")
    print(f"{'━'*60}\n")

if __name__ == "__main__":
    asyncio.run(main())
