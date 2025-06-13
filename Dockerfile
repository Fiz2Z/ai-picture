# 1. 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app

# 安装 pnpm
RUN npm i -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install

# 复制全部源码
COPY . .

# 以下新增，声明 ARG 并赋值给 ENV，便于 pnpm build 时可用
ARG VITE_FAL_API_KEYS
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_THIRD_PARTY_API_KEY

ENV VITE_FAL_API_KEYS=$VITE_FAL_API_KEYS
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_THIRD_PARTY_API_KEY=$VITE_THIRD_PARTY_API_KEY

# 构建生产文件
RUN pnpm build

# 2. 生产阶段：使用 nginx 服务器部署静态文件
FROM nginx:stable-alpine

# 清理默认 nginx 静态文件
RUN rm -rf /usr/share/nginx/html/*

# 复制打包产物到 nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 如果有自定义 nginx 配置可取消这行注释
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
