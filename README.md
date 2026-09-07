# 复古音乐工作站

AI 音乐生成 Web 产品，界面为「80 年代复古 Windows 桌面」风格。
支持云端音乐服务与本地 ACE-Step 引擎；开发期可用 Mock 验证流程。具体服务由环境配置选择。


| 项目字段 | 说明 |
| --- | --- |
| 项目类型 | AI 音乐生成产品原型 |
| 目标用户 | 希望通过自然语言表达音乐创意的创作者 |
| 核心流程 | 描述创意 → 优化 Prompt → 生成任务 → 播放与管理作品 |
| 当前交付 | 前后端源码、界面预览、项目说明与测试代码 |

## 项目资料

- [界面预览](preview/landing-desktop.png)
- [项目概述](docs/项目概述_复古音乐工作站.md)
- [音乐提示词设计](docs/TTM音乐提示词优化器_System_Prompt.md)

本仓库保持私有。Mock 用于开发验证，不代表真实模型效果；未完成入口与版本边界以项目概述为准。

## 目录

- `backend/` 业务后端（FastAPI + SQLite + SSE）
- `frontend/` 前端（React + Vite + Tailwind）
- `docs/` 项目概述与音乐提示词设计

> 音乐引擎 ACE-Step 是第三方开源仓库（体积大、含模型），未提交进本仓库。需单独克隆到项目根目录（见下方「获取音乐引擎」）。

## 快速启动

### 0. 获取音乐引擎（ACE-Step，第三方仓库）

```bash
# 在项目根目录执行，克隆后得到 ace-step/ 目录
git clone https://github.com/ACE-Step/ACE-Step-1.5.git ace-step
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
