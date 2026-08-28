import json

import httpx

from ..core.config import LLM_API_BASE_URL, LLM_API_KEY, LLM_MODEL
from .prompts.ttm_optimizer import TTM_SYSTEM_PROMPT


class LLMService:
    @staticmethod
    def _configured() -> bool:
        return bool(LLM_API_BASE_URL and LLM_API_KEY and LLM_MODEL)

    @staticmethod
    def _chat(messages: list[dict], temperature: float = 0.7) -> str:
        headers = {"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": LLM_MODEL, "messages": messages, "temperature": temperature}
        r = httpx.post(f"{LLM_API_BASE_URL.rstrip('/')}/chat/completions", headers=headers, json=payload, timeout=60)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]

    @staticmethod
    def optimize_music_prompt(concept: str, tags: str = "") -> str:
        """严格按照《TTM 音乐提示词优化器 System Prompt》改写用户输入为英文音乐 Prompt。"""
        user_input = f"用户描述：{concept.strip()}"
        if tags and tags.strip():
            user_input += f"\n风格要求：{tags.strip()}"
        fallback = (concept or "").strip()
        if not LLMService._configured():
            # 无 Key 兜底：原样返回（mock 引擎忽略 prompt，真实引擎仍可尝试）
            return fallback
        try:
            raw = LLMService._chat(
                [
                    {"role": "system", "content": TTM_SYSTEM_PROMPT},
                    {"role": "user", "content": user_input},
                ],
                temperature=0.7,
            ).strip()
            # 宽容清理：去掉可能的 ``` 代码块包裹、首尾引号
            raw = raw.replace("```", "").strip().strip('"').strip()
            return raw or fallback
        except Exception:
            return fallback

    @staticmethod
    def enhance(topic: str) -> dict:
        if not LLMService._configured():
            return {"topic": topic, "tags": "Pop, 抒情, 慢节奏"}
        prompt = (
            f"把「{topic}」扩展成一个更有画面感的音乐概念，并给出 3-5 个风格标签。"
            '只输出 JSON：{{"topic":"...","tags":"..."}}，不要多余文字。'
        )
        try:
            raw = LLMService._chat([{"role": "user", "content": prompt}]).strip()
            if raw.startswith("```"):
                raw = raw.replace("```json", "").replace("```", "").strip()
            return json.loads(raw)
        except Exception:
            return {"topic": topic, "tags": "Pop"}

    @staticmethod
    def title(context: str) -> str:
        for line in (context or "").split("\n"):
            line = line.strip()
            if line and not line.startswith("[") and not line.startswith("("):
                return line[:12]
        if LLMService._configured():
            try:
                prompt = f"给这段内容起一个 2-8 字的歌名，只输出歌名：{context[:300]}"
                return LLMService._chat([{"role": "user", "content": prompt}]).strip().replace('"', "")[:20]
            except Exception:
                pass
        return "未命名"
