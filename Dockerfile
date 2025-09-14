# 1. 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci --only=production=false

# 复制源码文件 (排除不必要的文件)
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.ts ./
COPY components.json ./

# 构建生产文件
RUN npm run build

# 2. 生产阶段：使用 nginx 服务器部署静态文件
FROM nginx:stable-alpine

# 安装必要工具
RUN apk add --no-cache curl

# 清理默认 nginx 静态文件
RUN rm -rf /usr/share/nginx/html/*

# 复制打包产物到 nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
