import asyncio
import time
import uuid

from ..core.config import AUDIO_DIR, MUSIC_PROVIDER
from ..core.db import get_session
from ..models import Job, JobStatus
from ..schemas import GenerateRequest
from .event import event_manager
from .llm_service import LLMService
from .music_provider import get_provider, MockMusicProvider


class JobService:
    def __init__(self) -> None:
        self.queue: asyncio.Queue = asyncio.Queue()
        self._started = False

    async def start(self) -> None:
        if self._started:
            return
        self._started = True
        asyncio.create_task(self._worker())

    async def submit(self, req: GenerateRequest, user_id: str) -> Job:
        job = Job(
            user_id=user_id,
            prompt=req.prompt,
            lyrics=req.lyrics,
            tags=req.tags,
            seed=req.seed,
            duration_ms=req.duration_ms,
            title=req.title,
        )
        with get_session() as s:
            s.add(job)
            s.commit()
            s.refresh(job)
        await self.queue.put((str(job.id), bool(req.mock)))
        event_manager.publish("job_queued", {"job_id": str(job.id), "position": self.queue.qsize()})
        return job

    async def _worker(self) -> None:
        while True:
            job_id, use_mock = await self.queue.get()
            await self._process(job_id, use_mock)

    async def _process(self, job_id: str, use_mock: bool = False) -> None:
        with get_session() as s:
            job = s.get(Job, uuid.UUID(job_id))
            if not job:
                return
            job.status = JobStatus.PROCESSING
            s.add(job)
            s.commit()
            prompt, lyrics, tags = job.prompt, job.lyrics, job.tags
            seed, duration_ms = job.seed, job.duration_ms
        event_manager.publish("job_update", {"job_id": job_id, "status": "processing"})

        provider = MockMusicProvider() if use_mock else get_provider(MUSIC_PROVIDER)
        filename = f"song_{job_id}.{provider.audio_ext}"
        output_path = str(AUDIO_DIR / filename)
        start = time.time()

        def cb(p: int, msg: str) -> None:
            event_manager.publish("job_progress", {"job_id": job_id, "progress": p, "msg": msg})

        try:
            # 严格按《TTM 音乐提示词优化器 System Prompt》把用户输入改写成英文音乐 Prompt
            event_manager.publish("job_progress", {"job_id": job_id, "progress": 2, "msg": "正在优化音乐描述…"})
            optimized_prompt = await asyncio.to_thread(LLMService.optimize_music_prompt, prompt, tags or "")

            await asyncio.to_thread(provider.generate, optimized_prompt, lyrics, None, duration_ms / 1000, seed, output_path, cb)

            title = None
            with get_session() as s:
                job = s.get(Job, uuid.UUID(job_id))
                if job:
                    if not job.title:
                        title = LLMService.title(lyrics or prompt)
                        job.title = title
                    job.status = JobStatus.COMPLETED
                    job.audio_filename = filename
                    job.generation_time_seconds = round(time.time() - start, 1)
                    s.add(job)
                    s.commit()
            event_manager.publish("job_update", {
                "job_id": job_id, "status": "completed", "title": title,
                "audio_url": f"/api/v1/audio/{filename}",
            })
            event_manager.publish("job_progress", {"job_id": job_id, "progress": 100, "msg": "完成"})
        except Exception as e:
            with get_session() as s:
                job = s.get(Job, uuid.UUID(job_id))
                if job:
                    job.status = JobStatus.FAILED
                    job.error_msg = str(e)
                    s.add(job)
                    s.commit()
            event_manager.publish("job_update", {"job_id": job_id, "status": "failed", "error": str(e)})


job_service = JobService()
