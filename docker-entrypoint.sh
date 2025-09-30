#!/bin/sh
set -e

echo "🚀 启动 AI Picture 应用..."

# 替换配置文件中的环境变量
echo "📝 配置运行时环境变量..."

# 创建实际的配置文件
cat > /usr/share/nginx/html/config.js << EOF
// 运行时配置文件
window.APP_CONFIG = {
  VITE_IMAGE_API_URL: '${VITE_IMAGE_API_URL:-https://api.gpt.ge}',
  VITE_IMAGE_API_KEY: '${VITE_IMAGE_API_KEY:-}'
};
EOF

echo "✅ 环境变量配置完成:"
echo "   - IMAGE_API_URL: ${VITE_IMAGE_API_URL:-https://api.gpt.ge}"
echo "   - IMAGE_API_KEY: ${VITE_IMAGE_API_KEY:+已设置}"

# 启动nginx
echo "🌐 启动 Nginx 服务器..."
exec nginx -g "daemon off;"
