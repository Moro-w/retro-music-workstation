import asyncio
import os
import time

import pytest
from fastapi.testclient import TestClient

os.environ["MUSIC_PROVIDER"] = "mock"
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/test.db")
os.environ.setdefault("AUDIO_DIR", "./data/test_audio")

from app.main import app  # noqa: E402
from app.services.job_service import job_service  # noqa: E402


@pytest.fixture(autouse=True)
def reset_worker():
    job_service._started = False
    job_service.queue = asyncio.Queue()
    yield


def test_health_and_validation():
    with TestClient(app) as c:
        assert c.get("/api/v1/health").status_code == 200
        # 缺少 prompt 应返回统一错误结构
        r = c.post("/api/v1/music/generate", json={"duration_ms": 30000})
        assert r.status_code == 422
        assert "error" in r.json()
        # 未知任务
        assert c.get("/api/v1/jobs/00000000-0000-0000-0000-000000000000").status_code == 404


def test_generate_full_chain():
    with TestClient(app) as c:
        r = c.post("/api/v1/music/generate", json={"prompt": "夏夜海边", "tags": "Pop", "duration_ms": 10000})
        assert r.status_code == 200
        job_id = r.json()["job_id"]

        job = None
        for _ in range(60):
            job = c.get(f"/api/v1/jobs/{job_id}").json()
            if job["status"] in ("completed", "failed"):
                break
            time.sleep(0.2)
        assert job["status"] == "completed", f"job failed: {job.get('error_msg')}"
        assert job["audio_url"]

        # 播放
        assert c.get(job["audio_url"]).status_code == 200
        # 下载
        assert c.get(f"/api/v1/jobs/{job_id}/download").status_code == 200

        # 软删除 -> 回收站 -> 还原 -> 彻底删除
        assert c.post(f"/api/v1/jobs/{job_id}/delete").status_code == 200
        assert len(c.get("/api/v1/jobs").json()) == 0
        assert len(c.get("/api/v1/trash").json()) == 1
        assert c.post(f"/api/v1/jobs/{job_id}/restore").status_code == 200
        assert len(c.get("/api/v1/jobs").json()) == 1
        assert c.delete(f"/api/v1/jobs/{job_id}").status_code == 200
        assert len(c.get("/api/v1/jobs").json()) == 0
