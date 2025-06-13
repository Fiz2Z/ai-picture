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

# 如果你需要环境变量文件，请取消下一行的注释，并确保在构建镜像时准备好 .env 文件
# COPY .env .env

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

EXPOSE 9977

CMD ["nginx", "-g", "daemon off;"]
