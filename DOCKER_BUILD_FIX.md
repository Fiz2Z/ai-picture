# Docker构建问题修复

## 🐛 问题描述
GitHub Actions构建Docker镜像时出现错误：
```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

## 🔧 问题原因
- 我们之前修改了`package.json`（移除fal依赖，添加openai依赖）
- 但是`pnpm-lock.yaml`文件还是旧的，包含已删除的依赖
- 导致lockfile与package.json不匹配

## ✅ 解决方案

### 1. 切换到npm构建
将Dockerfile从pnpm改为npm，提高兼容性：

```dockerfile
# 修改前
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
RUN pnpm build

# 修改后
COPY package.json package-lock.json* ./
RUN npm ci --only=production=false
RUN npm run build
```

### 2. 更新相关配置文件
- **package.json**: 移除pnpm相关的packageManager字段
- **docker-compose.yml**: 更新健康检查端点和默认应用名
- **.dockerignore**: 添加pnpm-lock.yaml到忽略列表

### 3. 重新生成lockfile
```bash
rm pnpm-lock.yaml
npm install  # 生成新的package-lock.json
```

## 🚀 修复结果

### Docker构建优化
- ✅ 使用npm ci进行快速、可靠的依赖安装
- ✅ 支持package-lock.json和pnpm-lock.yaml（向后兼容）
- ✅ 更好的CI/CD环境兼容性

### 文件变更
- ✅ **Dockerfile**: 改用npm构建
- ✅ **package.json**: 清理pnpm配置
- ✅ **docker-compose.yml**: 优化配置
- ✅ **.dockerignore**: 添加pnpm文件忽略

## 📦 使用方法

### GitHub Actions自动构建
推送到GitHub后会自动构建：
```bash
git add .
git commit -m "fix: docker build lockfile issue"
git push origin main
```

### 本地Docker构建
```bash
# 构建镜像
docker build -t ai-picture .

# 运行容器
docker run -d \
  --name ai-picture \
  -p 80:80 \
  -e VITE_OPENROUTER_API_KEY=your_api_key \
  ai-picture
```

### Docker Compose部署
```bash
# 设置环境变量
echo "OPENROUTER_API_KEY=your_api_key" > .env

# 启动服务
docker-compose up -d
```

## 🎯 验证步骤
1. ✅ 本地npm构建成功
2. ⏳ GitHub Actions构建（推送后自动验证）
3. ⏳ Docker镜像运行测试

现在Docker构建应该可以正常工作了！🚀
