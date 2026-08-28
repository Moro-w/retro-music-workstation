import json
import math
import random
import struct
import time
import wave
from abc import ABC, abstractmethod

import httpx

from ..core.config import ENGINE_BASE_URL, FAL_API_KEY, FAL_MUSIC_MODEL, MUSIC_API_BASE_URL, MUSIC_API_KEY


class MusicProvider(ABC):
    name = "base"
    audio_ext = "wav"

    @abstractmethod
    def generate(self, prompt, lyrics, tags, duration_sec, seed, output_path, progress_cb=None) -> None:
        """生成音频写入 output_path；失败抛异常。progress_cb(percent:int, msg:str)"""


class MockMusicProvider(MusicProvider):
    """开发期兜底：用标准库合成真实可播放的 WAV（种子可复现）。"""

    name = "mock"
    audio_ext = "wav"
    SAMPLE_RATE = 22050

    def generate(self, prompt, lyrics, tags, duration_sec, seed, output_path, progress_cb=None) -> None:
        rnd = random.Random(seed if seed is not None else 0)
        dur = max(5, min(int(duration_sec), 60))
        total = dur * self.SAMPLE_RATE
        scale = [196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0]
        bass = [scale[0] / 2, scale[3] / 2, scale[4] / 2, scale[5] / 2]
        note_len = self.SAMPLE_RATE // 2
        n_notes = max(1, total // note_len)
        frames = bytearray()
        for i in range(n_notes):
            if progress_cb:
                progress_cb(int((i + 1) / n_notes * 90), f"合成中 {i + 1}/{n_notes} 小节")
            freq = scale[rnd.randrange(len(scale))]
            bfreq = bass[rnd.randrange(len(bass))]
            for j in range(note_len):
                t = j / self.SAMPLE_RATE
                env = math.exp(-2.5 * (j / note_len))
                v = math.sin(2 * math.pi * freq * t) * 0.5 + math.sin(2 * math.pi * freq * 1.5 * t) * 0.2
                b = math.sin(2 * math.pi * bfreq * t) * 0.3
                s = int((v + b) * env * 12000)
                frames += struct.pack("<h", max(-32767, min(32767, s)))
        with wave.open(output_path, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(self.SAMPLE_RATE)
            w.writeframes(bytes(frames))
        if progress_cb:
            progress_cb(100, "完成")


class AceStepMusicProvider(MusicProvider):
    """真实引擎：调用本地 ACE-Step REST API（8001）。"""

    name = "acestep"
    audio_ext = "mp3"

    def __init__(self, base_url: str = ENGINE_BASE_URL) -> None:
        self.base_url = base_url.rstrip("/")

    def _post(self, path: str, payload: dict, timeout: float = 60) -> dict:
        r = httpx.post(f"{self.base_url}{path}", json=payload, timeout=timeout)
        r.raise_for_status()
        data = r.json()
        if data.get("code") not in (200, None):
            raise RuntimeError(f"引擎错误: {data.get('error') or data.get('code')}")
        return data

    def generate(self, prompt, lyrics, tags, duration_sec, seed, output_path, progress_cb=None) -> None:
        full_prompt = " ".join(x for x in [tags, prompt] if x and str(x).strip()).strip() or "pop music"
        payload = {
            "prompt": full_prompt,
            "lyrics": lyrics or "",
            "audio_duration": max(10, min(int(duration_sec), 600)),
            "audio_format": "mp3",
            "thinking": False,  # 第一阶段纯 DiT 模式
            "inference_steps": 8,
            "use_random_seed": seed is None,
            "seed": seed if seed is not None else -1,
            "vocal_language": "zh",
        }
        data = self._post("/release_task", payload, timeout=1800)
        task_id = data["data"]["task_id"]
        if progress_cb:
            progress_cb(5, "已提交引擎")

        while True:
            res = self._post("/query_result", {"task_id_list": [task_id]}, timeout=30)
            item = res["data"][0]
            status = item["status"]
            if status == 1:
                result = json.loads(item["result"])[0]
                file_url = result["file"]
                with httpx.stream("GET", f"{self.base_url}{file_url}", timeout=120) as r:
                    r.raise_for_status()
                    with open(output_path, "wb") as f:
                        for chunk in r.iter_bytes():
                            f.write(chunk)
                if progress_cb:
                    progress_cb(100, "完成")
                return
            if status == 2:
                raise RuntimeError("引擎生成失败")
            if progress_cb:
                progress_cb(50, "引擎生成中…")
            time.sleep(2)


class Cloud302MusicProvider(MusicProvider):
    """云 API：302.AI 音乐生成（封装 Suno/Udio，按次付费）。"""

    name = "cloud302"
    audio_ext = "mp3"

    def __init__(self, base_url: str = MUSIC_API_BASE_URL, api_key: str = MUSIC_API_KEY) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def generate(self, prompt, lyrics, tags, duration_sec, seed, output_path, progress_cb=None) -> None:
        headers = {"Authorization": f"Bearer {self.api_key}", "Lang": "cn"}
        concept = (prompt or "").strip()
        lyrics_text = (lyrics or "").strip()
        tags_text = (tags or "").strip()
        has_lyrics = bool(lyrics_text)

        # 风格标签：把「用户风格 + 概念」合并，概念不再被丢弃（Suno 用 tags 理解风格/情绪）
        style_parts = [p for p in (tags_text, concept) if p]
        style_tags = ", ".join(style_parts)

        # 主 prompt：有歌词用歌词；无歌词用概念作为纯音乐描述
        main_prompt = lyrics_text if has_lyrics else (concept or "一首歌")

        payload = {
            "prompt": main_prompt,
            "tags": style_tags,
            "title": concept[:80] or "未命名",
            "make_instrumental": not has_lyrics,
            "mv": "chirp-v3-5",
        }
        r = httpx.post(f"{self.base_url}/suno/submit/music", json=payload, headers=headers, timeout=60)
        r.raise_for_status()
        data = r.json()
        task_id = data.get("data")
        if not task_id:
            raise RuntimeError(f"302 未返回任务ID: {data.get('message') or data.get('msg') or data}")
        if progress_cb:
            progress_cb(5, "已提交 302.AI (Suno)")

        deadline = time.time() + 600
        while time.time() < deadline:
            r2 = httpx.get(f"{self.base_url}/suno/fetch/{task_id}", headers=headers, timeout=60)
            r2.raise_for_status()
            res = r2.json()
            items = (res.get("data") or {}).get("data") or []
            audio_url = (items[0] or {}).get("audio_url") if items else None
            if audio_url:
                # file.302.ai 的直链有时需要携带 API 鉴权头，否则 403
                with httpx.stream("GET", audio_url, headers=headers, timeout=120) as ar:
                    ar.raise_for_status()
                    with open(output_path, "wb") as f:
                        for chunk in ar.iter_bytes():
                            f.write(chunk)
                if progress_cb:
                    progress_cb(100, "完成")
                return
            if progress_cb:
                raw = res.get("progress")
                if raw is None and isinstance(res.get("data"), dict):
                    raw = res["data"].get("progress")
                try:
                    pct = int(str(raw or "50").replace("%", "").replace("％", ""))
                except Exception:
                    pct = 50
                progress_cb(min(90, pct), "Suno 生成中…")
            time.sleep(3)
        raise RuntimeError("302 生成超时（10分钟未完成）")


class FalAiMusicProvider(MusicProvider):
    """云 API：fal.ai 的 CassetteAI music-generator（按次付费，输出 WAV）。"""

    name = "falai"
    audio_ext = "wav"
    BASE_URL = "https://queue.fal.run"

    def __init__(self, model: str = FAL_MUSIC_MODEL, api_key: str = FAL_API_KEY) -> None:
        self.model = model
        self.api_key = api_key

    def _headers(self) -> dict:
        return {"Authorization": f"Key {self.api_key}", "Content-Type": "application/json"}

    def generate(self, prompt, lyrics, tags, duration_sec, seed, output_path, progress_cb=None) -> None:
        # CassetteAI 是纯文本→音乐模型（无歌词人声），把风格标签与概念合并进 prompt
        parts = [p for p in (tags, prompt) if p and str(p).strip()]
        full_prompt = ", ".join(parts).strip() or "pop music"
        duration = max(10, min(int(duration_sec), 180))

        payload = {"prompt": full_prompt, "duration": duration}
        r = httpx.post(f"{self.BASE_URL}/{self.model}", json=payload, headers=self._headers(), timeout=60)
        r.raise_for_status()
        data = r.json()
        status_url = data.get("status_url")
        if not status_url:
            raise RuntimeError(f"fal.ai 未返回 status_url: {data}")
        if progress_cb:
            progress_cb(5, "已提交 CassetteAI")

        deadline = time.time() + 600
        while time.time() < deadline:
            r2 = httpx.get(status_url, headers=self._headers(), timeout=30)
            r2.raise_for_status()
            res = r2.json()
            status = res.get("status")
            if status == "COMPLETED":
                result_url = res.get("response_url")
                r3 = httpx.get(result_url, headers=self._headers(), timeout=30)
                r3.raise_for_status()
                audio_url = (r3.json().get("audio_file") or {}).get("url")
                if not audio_url:
                    raise RuntimeError(f"fal.ai 结果缺少音频: {r3.json()}")
                # fal.media 直链需携带鉴权头
                with httpx.stream("GET", audio_url, headers=self._headers(), timeout=180) as ar:
                    ar.raise_for_status()
                    with open(output_path, "wb") as f:
                        for chunk in ar.iter_bytes():
                            f.write(chunk)
                if progress_cb:
                    progress_cb(100, "完成")
                return
            if status in ("FAILED", "CANCELLED", "CANCELLATION_REQUESTED"):
                raise RuntimeError(f"fal.ai 生成失败: {status}")
            if progress_cb:
                progress_cb(50, "CassetteAI 生成中…")
            time.sleep(2)
        raise RuntimeError("fal.ai 生成超时（10 分钟未完成）")


def get_provider(name: str = "auto") -> MusicProvider:
    if name == "mock":
        return MockMusicProvider()
    if name == "acestep":
        return AceStepMusicProvider()
    if name == "cloud302":
        if not MUSIC_API_KEY:
            raise RuntimeError("缺少 MUSIC_API_KEY，请先在 backend/.env 配置 302.AI 的 Key")
        return Cloud302MusicProvider()
    if name == "falai":
        if not FAL_API_KEY:
            raise RuntimeError("缺少 FAL_API_KEY，请先在 backend/.env 配置 fal.ai 的 Key")
        return FalAiMusicProvider()
    # auto：优先云 API（配了 Key）> 本地引擎 > mock
    if FAL_API_KEY:
        return FalAiMusicProvider()
    if MUSIC_API_KEY:
        return Cloud302MusicProvider()
    for probe in ("/health", "/v1/models"):
        try:
            httpx.get(f"{ENGINE_BASE_URL}{probe}", timeout=2).raise_for_status()
            return AceStepMusicProvider()
        except Exception:
            continue
    return MockMusicProvider()
