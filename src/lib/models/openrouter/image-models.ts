import type { Model } from "@/types/flux";

export const gemini_2_5_flash_image: Model = {
  name: "Google Gemini 2.5 Flash Image Preview",
  id: "google/gemini-2.5-flash-image-preview",
  description: "Google最新的生成图片模型nano-banana",
  provider: "openrouter",
  inputSchema: [
    {
      key: "prompt",
      type: "string",
      required: true,
      description: "输入的提示词或问题"
    },
    {
      key: "image_url",
      type: "string",
      description: "图像URL（可选）"
    },
    {
      key: "max_tokens",
      type: "number",
      description: "最大令牌数",
      default: 1000
    },
    {
      key: "temperature",
      type: "number",
      description: "温度参数",
      default: 0.7
    }
  ],
  outputSchema: [
    {
      key: "content",
      type: "string",
      description: "生成的回复内容"
    },
    {
      key: "usage",
      type: "object",
      description: "API使用统计"
    }
  ],
  category: "多模态模型"
};
