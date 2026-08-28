from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .models import JobStatus


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    lyrics: Optional[str] = None
    tags: Optional[str] = None
    duration_ms: int = Field(45000, ge=10000, le=60000)
    seed: Optional[int] = None
    title: Optional[str] = None
    mock: bool = False  # True=免费测试(mock 合成)，False=真实生成(付费)


class JobOut(BaseModel):
    id: UUID
    status: JobStatus
    title: Optional[str] = None
    prompt: str
    lyrics: Optional[str] = None
    tags: Optional[str] = None
    seed: Optional[int] = None
    duration_ms: int
    audio_url: Optional[str] = None
    error_msg: Optional[str] = None
    created_at: datetime
    deleted_at: Optional[datetime] = None
    generation_time_seconds: Optional[float] = None
