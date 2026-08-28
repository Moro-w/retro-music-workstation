from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import public, router
from .core.config import ensure_dirs
from .core.db import init_db
from .services.job_service import job_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_dirs()
    init_db()
    await job_service.start()
    yield


app = FastAPI(title="复古音乐工作站 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": exc.status_code, "message": str(exc.detail)}})


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": {"code": 422, "message": "参数校验失败"}})


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": {"code": 500, "message": "服务器内部错误"}})


app.include_router(public, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")

# 前端静态资源（生产环境由后端同源托管；本地开发走 Vite，无需此目录）
STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="frontend")
