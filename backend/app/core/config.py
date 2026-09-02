import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
PROJECT_DIR = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


# 运行环境
ENV = _env("ENV", "dev")  # dev | prod
# 邀请码（逗号分隔）；非空时开启登录鉴权
INVITE_CODES = _env("INVITE_CODES", "")
# 登录 token 签名密钥（可选）；不设置则用 INVITE_CODES 派生，二者任一稳定即可
INVITE_SECRET = _env("INVITE_SECRET", "")

# 数据库与资产
DATABASE_URL = _env("DATABASE_URL", f"sqlite:///{PROJECT_DIR / 'data' / 'app.db'}")
AUDIO_DIR = Path(_env("AUDIO_DIR", str(PROJECT_DIR / "data" / "audio")))

# 音乐引擎（ACE-Step，本地端口 8001）
ENGINE_BASE_URL = _env("ENGINE_BASE_URL", "http://localhost:8001")
MUSIC_PROVIDER = _env("MUSIC_PROVIDER", "auto")  # auto | mock | acestep | cloud302

# 云音乐 API（302.AI，封装 Suno/Udio，按次付费）
MUSIC_API_BASE_URL = _env("MUSIC_API_BASE_URL", "https://api.302.ai")
MUSIC_API_KEY = _env("MUSIC_API_KEY", "")

# 云音乐 API（fal.ai 的 CassetteAI music-generator，按次付费）
FAL_API_KEY = _env("FAL_API_KEY", "")
FAL_MUSIC_MODEL = _env("FAL_MUSIC_MODEL", "cassetteai/music-generator")

# LLM（OpenAI 兼容接口，如火山方舟/OpenRouter）
LLM_API_BASE_URL = _env("LLM_API_BASE_URL", "")
LLM_API_KEY = _env("LLM_API_KEY", "")
LLM_MODEL = _env("LLM_MODEL", "")


def ensure_dirs() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    # 本地开发默认数据目录；线上（只读文件系统）可能不存在，忽略即可
    try:
        (PROJECT_DIR / "data").mkdir(parents=True, exist_ok=True)
    except OSError:
        pass
