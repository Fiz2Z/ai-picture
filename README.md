# AI 多模态应用

这是一个基于 OpenRouter API 的多模态 AI 应用，支持文本生成和图像理解功能。该应用采用 Vue 3 和 ShadcnUI 构建，支持响应式设计，确保在桌面端和移动端都有出色的用户体验。

## 🌟 主要特点

- **多模态支持**：集成 OpenRouter 的多模态模型，支持文本和图像输入
- **可扩展架构**：支持多渠道多模型，方便后续添加不同的 AI 模型
- **环境变量配置**：通过 Docker 环境变量进行配置，无需复杂的密钥管理
- **响应式设计**：完美适配桌面端和移动端设备
- **现代化UI**：基于 ShadcnUI 构建的现代化用户界面

## 🚀 功能亮点

### 多模态交互

- 支持纯文本输入进行对话
- 支持图像+文本输入进行图像理解
- 可调整的生成参数（温度、最大令牌数等）
- 实时显示 API 使用统计

### 模型管理

- 当前支持 Google Gemini 2.5 Flash Image Preview 模型
- 可扩展的模型注册系统，方便添加新模型
- 支持不同提供商的模型集成

## 🐳 Docker 部署

### 环境变量配置

创建 `.env` 文件并配置以下环境变量：

```bash
# OpenRouter API配置
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# 网站信息（用于OpenRouter排名）
VITE_SITE_URL=http://localhost:5173
VITE_SITE_NAME=AI Image Generator

# Supabase配置（如果需要）
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 构建和运行

```bash
# 构建 Docker 镜像
docker build -t ai-multimodal-app .

# 运行容器
docker run -d \
  --name ai-app \
  -p 80:80 \
  --env-file .env \
  ai-multimodal-app
```

### Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'
services:
  ai-app:
    build: .
    ports:
      - "80:80"
    env_file:
      - .env
    restart: unless-stopped
```

然后运行：

```bash
docker-compose up -d
```

## 🛠️ 本地开发

### 安装依赖

```bash
pnpm install
```

### 开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

## 🔧 添加新模型

要添加新的模型，请按以下步骤操作：

1. 在 `src/lib/models/` 下创建新的提供商目录（如 `anthropic/`）
2. 在该目录下创建模型定义文件
3. 在 `src/lib/models/registry.ts` 中注册新模型
4. 在 `src/services/` 中添加对应的 API 客户端
5. 更新 `src/services/generate-image.ts` 以支持新提供商

### 模型定义示例

```typescript
import type { Model } from "@/types/flux";

export const new_model: Model = {
  name: "新模型名称",
  id: "provider/model-id",
  description: "模型描述",
  provider: "provider_name",
  category: "模型分类",
  inputSchema: [
    // 定义输入参数
  ],
  outputSchema: [
    // 定义输出格式
  ]
};
```
- 密钥分组功能，便于组织管理
- 一键测试密钥可用性
- 当密钥余额不足时自动切换到下一个可用密钥

## 🛠️ 技术栈

- **前端框架**：Vue 3 + TypeScript
- **UI 组件**：ShadcnUI + Tailwind CSS
- **状态管理**：Vue Composition API
- **路由**：Vue Router
- **API 集成**：FAL.AI JavaScript SDK
- **数据存储**：Supabase + 本地存储
- **构建工具**：Vite
- **部署**：Vercel

## 📦 安装与使用

### 环境要求

- Node.js 18.0 或更高版本
- pnpm 8.0 或更高版本

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/yourusername/falai-app.git
   cd falai-app
   ```

2. 安装依赖
   ```bash
   pnpm install
   ```

3. 配置环境变量
   ```bash
   cp .env.example .env
   ```

   编辑 `.env` 文件，添加必要的 API 密钥和配置

4. 启动开发服务器
   ```bash
   pnpm dev
   ```

5. 构建生产版本
   ```bash
   pnpm build
   ```

## 🔑 API 密钥配置

应用需要 FAL.AI API 密钥才能正常工作。您可以通过以下方式配置密钥：

1. **本地开发环境变量**：在 `.env` 文件中设置 `VITE_FAL_API_KEYS`
2. **Vercel 部署环境变量**：在 Vercel 项目仓库的设置页面中，进入 "Environment Variables" 部分添加 `VITE_FAL_API_KEYS` 变量
3. **用户界面**：通过应用内的 API 密钥管理界面添加密钥

多个 API 密钥可以用逗号分隔：
```
VITE_FAL_API_KEYS=key1,key2,key3
```

> **重要提示：** 如果您在 Vercel 上部署应用，必须在 Vercel 项目仓库的设置页面中配置环境变量，而不是仅仅依赖于 `.env` 文件。这是因为在构建过程中，`.env` 文件中的变量可能不会被正确地应用到部署环境中。

## 📱 移动端支持

应用完全支持移动设备，提供了针对移动端优化的界面：

- 自适应布局，确保在各种屏幕尺寸上的良好显示
- 触摸友好的控件和交互
- 针对移动网络优化的图片加载策略

## 🤝 贡献

欢迎贡献代码、报告问题或提出改进建议！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解更多信息。

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [FAL.AI](https://fal.ai/) 提供强大的 AI 图像生成 API
- [ShadcnUI](https://ui.shadcn.com/) 提供美观实用的 UI 组件
- [Vue 团队](https://vuejs.org/) 开发了出色的前端框架
- 所有为本项目做出贡献的开发者
