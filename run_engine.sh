#!/bin/bash
# 后台安装依赖并启动 ACE-Step 引擎 API（端口 8001）
cd "$(dirname "$0")/ace-step" || exit 1

# 国内加速：Python 包走清华源
export UV_DEFAULT_INDEX="${UV_DEFAULT_INDEX:-https://pypi.tuna.tsinghua.edu.cn/simple}"
# 指定 Python 3.11
export UV_PYTHON="${UV_PYTHON:-/Users/moro/.local/bin/python3.11}"
# MLX 后端（Apple Silicon 加速）
export ACESTEP_LM_BACKEND=mlx

echo "[$(date)] === 步骤1: uv sync 安装依赖（耗时最长）==="
uv sync --frozen || uv sync
echo "[$(date)] === 依赖安装完成，退出码 $? ==="

echo "[$(date)] === 步骤2: 启动引擎 API（首次自动下载模型 ~4.7GB）==="
exec uv run acestep-api --host 0.0.0.0 --port 8001 --download-source modelscope
