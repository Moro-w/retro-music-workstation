"""邀请码登录与鉴权。

- INVITE_CODES 为空（本地开发）：放行，所有请求视为 guest。
- INVITE_CODES 非空（线上）：必须携带有效 token，token 由邀请码换取。
"""

import hashlib
import secrets
import time

from .config import INVITE_CODES

GUEST = "guest"
_TOKEN_TTL = 7 * 24 * 3600  # 7 天
_TOKENS: dict[str, tuple[str, float]] = {}


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


def issue_token(user_id: str) -> str:
    token = secrets.token_urlsafe(24)
    _TOKENS[token] = (user_id, time.time() + _TOKEN_TTL)
    return token


def resolve_token(token: str) -> str | None:
    if not auth_required():
        return GUEST
    token = (token or "").strip()
    rec = _TOKENS.get(token)
    if not rec:
        return None
    user_id, exp = rec
    if time.time() > exp:
        _TOKENS.pop(token, None)
        return None
    return user_id
