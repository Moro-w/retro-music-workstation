"""邀请码登录与鉴权。

- INVITE_CODES 为空（本地开发）：放行，所有请求视为 guest。
- INVITE_CODES 非空（线上）：必须携带有效 token，token 由邀请码换取。

token 采用 HMAC 签名的无状态令牌（user_id.expiry.signature），
不依赖进程内存，serverless 冷启动 / 多实例 / 重新部署后依然有效。
"""

import hashlib
import hmac
import os
import time

from .config import INVITE_CODES, INVITE_SECRET

GUEST = "guest"
_TOKEN_TTL = 7 * 24 * 3600  # 7 天

_sign_secret: str | None = None


def _secret() -> str:
    """签名密钥：优先环境变量 INVITE_SECRET，否则用 INVITE_CODES 派生。

    只要这两者之一稳定不变，已签发的 token 就能持续通过校验。
    """
    global _sign_secret
    if _sign_secret is None:
        _sign_secret = (INVITE_SECRET or "").strip() or (INVITE_CODES or "").strip()
        if not _sign_secret:
            # 兜底：进程内随机密钥（仅本地未开邀请码时才会走到，且不会真正签发）
            _sign_secret = os.environ.get("INVITE_SECRET") or "dev-insecure-secret"
    return _sign_secret


def auth_required() -> bool:
    return bool(INVITE_CODES.strip())


def _user_id(code: str) -> str:
    return hashlib.sha256(f"invite:{code}".encode()).hexdigest()[:16]


def _valid_codes() -> list[str]:
    return [c.strip() for c in INVITE_CODES.split(",") if c.strip()]


def verify_code(code: str) -> str | None:
    code = (code or "").strip()
    if code in _valid_codes():
        return _user_id(code)
    return None


def _sign(payload: str) -> str:
    return hmac.new(_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()


def issue_token(user_id: str) -> str:
    exp = int(time.time() + _TOKEN_TTL)
    payload = f"{user_id}.{exp}"
    return f"{payload}.{_sign(payload)}"


def resolve_token(token: str) -> str | None:
    if not auth_required():
        return GUEST
    token = (token or "").strip()
    parts = token.split(".")
    if len(parts) != 3:
        return None
    user_id, exp_str, sig = parts
    if not user_id or not exp_str:
        return None
    if not hmac.compare_digest(_sign(f"{user_id}.{exp_str}"), sig):
        return None
    try:
        exp = int(exp_str)
    except ValueError:
        return None
    if time.time() > exp:
        return None
    return user_id
