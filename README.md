# 复古音乐工作站

AI 音乐生成 Web 产品，界面为「80 年代复古 Windows 桌面」风格。
音乐引擎使用开源模型 **ACE-Step 1.5**（MIT，本机 Apple Silicon 走 MLX 运行），开发期可用 mock 兜底。

## 目录

- `backend/` 业务后端（FastAPI + SQLite + SSE）
- `frontend/` 前端（React + Vite + Tailwind）
- `docs/` 技术适配声明 + 阶段技术开发文档

> 音乐引擎 ACE-Step 是第三方开源仓库（体积大、含模型），未提交进本仓库。需单独克隆到项目根目录（见下方「获取音乐引擎」）。

## 快速启动

### 0. 获取音乐引擎（ACE-Step，第三方仓库）

```bash
# 在项目根目录执行，克隆后得到 ace-step/ 目录
git clone https://github.com/ace-step/ace-step.git ace-step
cd ace-step && ./install_uv.sh   # 按需装依赖（首次耗时较长）
```

### 1. 启动音乐引擎（首次会自动装依赖 + 下模型，耗时较长）

```bash
./run_engine.sh        # 后台安装并启动，日志在 logs/engine.log
```

### 2. 启动后端（端口 8080）

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

### 3. 启动前端（端口 5173，已代理 /api 到 8080）

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173

## 测试

```bash
cd backend
source .venv/bin/activate
pytest
```

## 环境变量

见 `.env.example`。密钥只放 `backend/.env`（已 gitignore）。
