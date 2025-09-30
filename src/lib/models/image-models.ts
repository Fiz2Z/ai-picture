import type { Model } from '@/types/flux';

export const gpt_image_1: Model = {
  name: 'GPT Image 1',
  id: 'gpt-image-1',
  description: 'OpenAI gpt-image-1 模型，支持图片生成与编辑',
  provider: 'image-api',
  category: '绘画模型',
  inputSchema: [
    {
      key: 'prompt',
      type: 'string',
      required: true,
      description: '描述希望生成或编辑的图像内容',
    },
    {
      key: 'n',
      type: 'number',
      description: '一次生成的图片数量 (1-10)',
      default: 1,
      validation: {
        min: 1,
        max: 10,
      },
    },
    {
      key: 'size',
      type: 'enum',
      description: '生成的图片尺寸',
      default: 'auto',
      options: ['auto', '1024x1024', '1024x1536', '1536x1024'],
    },
    {
      key: 'output_format',
      type: 'enum',
      description: '输出格式 (默认 png)',
      default: 'png',
      options: ['png', 'jpeg', 'webp'],
    },
    {
      key: 'background',
      type: 'enum',
      description: '背景透明度 (png/webp 支持)',
      default: 'auto',
      options: ['auto', 'transparent', 'opaque'],
    },
    {
      key: 'output_compression',
      type: 'number',
      description: '输出压缩质量 (1-100)',
      validation: {
        min: 1,
        max: 100,
      },
    },
  ],
  outputSchema: [
    {
      key: 'images',
      type: 'array',
      description: '生成的图片数据',
    },
    {
      key: 'usage',
      type: 'object',
      description: 'API 调用计费信息',
    },
  ],
  meta: {
    generationParams: ['n', 'size', 'output_format', 'background', 'output_compression'],
    editParams: ['n', 'size', 'background'],
    maxUploadImages: 4,
    requiresPrompt: true,
  },
};

export const gemini_2_5_flash_image_preview: Model = {
  name: 'Gemini 2.5 Flash Image Preview',
  id: 'gemini-2.5-flash-image-preview',
  description: 'Google Gemini 2.5 Flash Image Preview (nano-banana) 模型',
  provider: 'image-api',
  category: '绘画模型',
  inputSchema: [
    {
      key: 'prompt',
      type: 'string',
      required: true,
      description: '描述希望生成或编辑的图像内容',
    },
  ],
  outputSchema: [
    {
      key: 'images',
      type: 'array',
      description: '生成的图片数据',
    },
    {
      key: 'usage',
      type: 'object',
      description: 'API 调用计费信息',
    },
  ],
  meta: {
    generationParams: [],
    editParams: [],
    maxUploadImages: 6,
    requiresPrompt: true,
  },
};

export const image_upscale: Model = {
  name: '图片高清化',
  id: 'image-upscale',
  description: '对已有图片进行无损放大与清晰化处理',
  provider: 'image-upscale',
  category: '绘画模型',
  inputSchema: [],
  outputSchema: [
    {
      key: 'images',
      type: 'array',
      description: '高清化后的图片数据',
    },
  ],
  meta: {
    generationParams: [],
    maxUploadImages: 1,
    requiresPrompt: false,
    requiresImage: true,
    hideParameters: true,
    hidePrompt: true,
  },
};
