# AI 多模态应用

这是一个基于 OpenAI gpt-image-1 与 Google Gemini 2.5 Flash Image Preview 的图像生成应用，支持文本到图像生成以及图像编辑功能。项目采用 Vue 3 和 ShadcnUI 构建，提供响应式设计，在桌面端和移动端都具备良好的体验。

## 🌟 主要特点

- **图像生成与编辑**：集成 gpt-image-1 与 gemini-2.5-flash-image-preview，同步支持生成与局部编辑
- **可扩展架构**：模型注册系统方便接入更多图像模型
- **环境变量配置**：通过 Docker 环境变量进行配置，无需复杂的密钥管理
- **响应式设计**：完美适配桌面端和移动端设备
- **现代化UI**：基于 ShadcnUI 构建的现代化用户界面

## 🚀 功能亮点

### 图像交互

- 支持文本提示词生成高清图像
- 支持上传参考图像进行局部编辑
- 可调整生成尺寸、格式、背景等关键参数
- 生成结果支持对比查看与一键下载
- 一键无损放大现有图片，获取高清化结果

### 模型管理

- 当前支持 OpenAI gpt-image-1 与 Google Gemini 2.5 Flash Image Preview 模型
- 可扩展的模型注册系统，方便添加新的图像模型
- 统一的生成与编辑流程，便于扩展其它绘画能力

## 🐳 Docker 部署

### 环境变量配置

创建 `.env` 文件并配置以下环境变量：

```bash
# 图像 API 配置
VITE_IMAGE_API_URL=https://api.gpt.ge
VITE_IMAGE_API_KEY=your_image_api_key_here
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

## 🛠️ 技术栈

- **前端框架**：Vue 3 + TypeScript
- **UI 组件**：ShadcnUI + Tailwind CSS
- **状态管理**：Vue Composition API
- **路由**：Vue Router
- **API 集成**：OpenAI Images API (gpt-image-1)
- **数据存储**：本地存储
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

应用需要有效的图像 API 密钥才能正常工作。您可以通过以下方式配置密钥：

1. **本地开发环境变量**：在 `.env` 文件中设置 `VITE_IMAGE_API_KEY`
2. **生产部署环境变量**：在部署平台的环境变量设置中添加 `VITE_IMAGE_API_KEY`

示例：
```
VITE_IMAGE_API_KEY=sk-xxxxxxxxxxxxxxxx
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

- [OpenAI](https://platform.openai.com/) 提供先进的图像生成 API
- [ShadcnUI](https://ui.shadcn.com/) 提供美观实用的 UI 组件
- [Vue 团队](https://vuejs.org/) 开发了出色的前端框架
- 所有为本项目做出贡献的开发者
