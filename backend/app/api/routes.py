import asyncio
import os
import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import select

from ..core.auth import GUEST, auth_required, issue_token, resolve_token, verify_code
from ..core.config import AUDIO_DIR
from ..core.db import get_session
from ..models import Job
from ..schemas import GenerateRequest, JobOut
from ..services.event import event_manager
from ..services.job_service import job_service
from ..services.llm_service import LLMService


def get_current_user(authorization: str = Header(default=""), token: str = Query(default="")) -> str:
    """从 Authorization 头或 ?token= 取 token 并解析用户；未登录返回 401。"""
    t = (authorization or "").replace("Bearer ", "").strip() or (token or "").strip()
    user = resolve_token(t)
    if not user:
        raise HTTPException(401, "未登录或邀请码无效")
    return user


# public：无需登录；router：需登录（自动按用户隔离数据）
public = APIRouter()
router = APIRouter(dependencies=[Depends(get_current_user)])


def job_to_out(job: Job) -> JobOut:
    return JobOut(
        id=job.id,
        status=job.status,
        title=job.title,
        prompt=job.prompt,
        lyrics=job.lyrics,
        tags=job.tags,
        seed=job.seed,
        duration_ms=job.duration_ms,
        audio_url=f"/api/v1/audio/{job.audio_filename}" if job.audio_filename else None,
        error_msg=job.error_msg,
        created_at=job.created_at,
        deleted_at=job.deleted_at,
        generation_time_seconds=job.generation_time_seconds,
    )


def get_owned_job(job_id: UUID, user: str) -> Job:
    with get_session() as s:
        job = s.get(Job, job_id)
        if not job or job.user_id != user:
            raise HTTPException(404, "任务不存在")
        return job


# ===== 公开接口 =====

@public.get("/health")
def health():
    return {"status": "ok"}


@public.get("/auth/status")
def auth_status():
    return {"auth_required": auth_required()}


@public.post("/auth/login")
def login(body: dict):
    code = (body or {}).get("code", "")
    if not auth_required():
        return {"token": "", "user": GUEST}
    user = verify_code(code)
    if not user:
        raise HTTPException(401, "邀请码无效")
    return {"token": issue_token(user), "user": user}


# ===== 需登录接口 =====

@router.post("/music/generate")
async def generate(req: GenerateRequest, user: str = Depends(get_current_user)):
    job = await job_service.submit(req, user)
    return {"job_id": str(job.id), "status": job.status.value}


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: UUID, user: str = Depends(get_current_user)):
    return job_to_out(get_owned_job(job_id, user))


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(user: str = Depends(get_current_user)):
    with get_session() as s:
        jobs = s.exec(
            select(Job).where(Job.user_id == user, Job.deleted_at.is_(None)).order_by(Job.created_at.desc())
        ).all()
        return [job_to_out(j) for j in jobs]


@router.patch("/jobs/{job_id}", response_model=JobOut)
def rename_job(job_id: UUID, body: dict, user: str = Depends(get_current_user)):
    title = (body or {}).get("title")
    if not title:
        raise HTTPException(400, "标题不能为空")
    with get_session() as s:
        job = get_owned_job(job_id, user)
        job.title = title
        s.add(job)
        s.commit()
        s.refresh(job)
        return job_to_out(job)


@router.post("/jobs/{job_id}/delete")
def soft_delete(job_id: UUID, user: str = Depends(get_current_user)):
    with get_session() as s:
        job = get_owned_job(job_id, user)
        job.deleted_at = datetime.now(timezone.utc)
        s.add(job)
        s.commit()
        return {"status": "deleted"}


@router.get("/trash", response_model=list[JobOut])
def list_trash(user: str = Depends(get_current_user)):
    with get_session() as s:
        jobs = s.exec(
            select(Job).where(Job.user_id == user, Job.deleted_at.is_not(None)).order_by(Job.deleted_at.desc())
        ).all()
        return [job_to_out(j) for j in jobs]


@router.post("/jobs/{job_id}/restore")
def restore_job(job_id: UUID, user: str = Depends(get_current_user)):
    with get_session() as s:
        job = get_owned_job(job_id, user)
        job.deleted_at = None
        s.add(job)
        s.commit()
        return {"status": "restored"}


@router.delete("/jobs/{job_id}")
def purge_job(job_id: UUID, user: str = Depends(get_current_user)):
    with get_session() as s:
        job = get_owned_job(job_id, user)
        if job.audio_filename:
            p = AUDIO_DIR / job.audio_filename
            if p.exists():
                p.unlink()
        s.delete(job)
        s.commit()
        return {"status": "purged"}


@router.get("/jobs/{job_id}/download")
def download(job_id: UUID, user: str = Depends(get_current_user)):
    job = get_owned_job(job_id, user)
    if not job.audio_filename:
        raise HTTPException(404, "音频不存在")
    p = AUDIO_DIR / job.audio_filename
    if not p.exists():
        raise HTTPException(404, "音频文件不存在")
    safe = re.sub(r"[^0-9A-Za-z_\-\u4e00-\u9fff ]", "", job.title or "未命名").strip() or "song"
    media = "audio/mpeg" if p.suffix == ".mp3" else "audio/wav"
    return FileResponse(str(p), media_type=media, filename=f"{safe}{p.suffix}")


@router.get("/audio/{filename}")
def audio(filename: str):
    if os.path.sep in filename or ".." in filename:
        raise HTTPException(400, "非法文件名")
    p = AUDIO_DIR / filename
    if not p.exists():
        raise HTTPException(404, "文件不存在")
    media = "audio/mpeg" if p.suffix == ".mp3" else "audio/wav"
    return FileResponse(str(p), media_type=media)


@router.post("/lyrics/enhance")
def enhance(body: dict):
    topic = (body or {}).get("topic", "")
    if not topic:
        raise HTTPException(400, "topic 不能为空")
    return LLMService.enhance(topic)


@router.get("/events")
async def events():
    async def gen():
        q = event_manager.subscribe()
        try:
            while True:
                try:
                    data = await asyncio.wait_for(q.get(), timeout=15)
                    yield data
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            event_manager.unsubscribe(q)

    return StreamingResponse(gen(), media_type="text/event-stream")
