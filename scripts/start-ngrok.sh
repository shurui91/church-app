#!/bin/bash

# ngrok 启动脚本
# 使用方法: ./scripts/start-ngrok.sh [port]
# 如果不提供端口，默认使用 3000

PORT=${1:-3000}

echo "🚀 启动 ngrok (端口: $PORT)"
echo ""

# 检查 ngrok 是否已安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok 未安装"
    echo "请运行: brew install ngrok"
    exit 1
fi

# 检查是否需要配置 authtoken
if [ ! -f ~/.ngrok2/ngrok.yml ] && [ ! -f ~/Library/Application\ Support/ngrok/ngrok.yml ]; then
    echo "⚠️  首次使用 ngrok 需要配置 authtoken"
    echo ""
    echo "1. 注册/登录 ngrok: https://dashboard.ngrok.com/signup"
    echo "2. 获取 authtoken: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. 运行以下命令配置:"
    echo "   ngrok config add-authtoken YOUR_AUTHTOKEN"
    echo ""
    read -p "是否已配置 authtoken? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "请先配置 authtoken，然后重新运行此脚本"
        exit 1
    fi
fi

# 检查端口是否被占用
if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  警告: 端口 $PORT 上没有运行的服务"
    echo "   请确保后端服务器正在运行: cd server && npm run dev"
    echo ""
    read -p "继续启动 ngrok? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 启动 ngrok
echo "✅ 正在启动 ngrok..."
echo "📋 ngrok Web 界面: http://localhost:4040"
echo "🔗 获取公网 URL 后，请配置前端的 .env 文件:"
echo "   EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok.io"
echo ""
echo "按 Ctrl+C 停止 ngrok"
echo ""

ngrok http $PORT

