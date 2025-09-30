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
      key: 'size',
      type: 'enum',
      description: '生成的图片尺寸',
      default: 'auto',
      options: ['auto', '1024x1024', '1024x1536', '1536x1024'],
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
    generationParams: ['size'],
    editParams: ['size'],
    generationDefaults: {
      n: 1,
      output_format: 'png',
      background: 'auto',
      quality: 'high',
    },
    editDefaults: {
      n: 1,
      output_format: 'png',
      background: 'auto',
      quality: 'high',
    },
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

export const seedream_4_0: Model = {
  name: '即梦 4.0',
  id: 'doubao-seedream-4-0-250828',
  description: '火山引擎即梦 AI 4.0 模型，支持高清文本生图与多尺寸输出',
  provider: 'image-api',
  category: '绘画模型',
  inputSchema: [
    {
      key: 'prompt',
      type: 'string',
      required: true,
      description: '用于生成或编辑图像的提示词，支持中英文，建议不超过300字',
    },
    {
      key: 'size_tier',
      type: 'enum',
      description: '分辨率档位',
      options: ['1k', '2k', '4k'],
    },
    {
      key: 'size',
      type: 'enum',
      description: '常用长宽比尺寸',
      options: [
        '2048x2048',
        '2304x1728',
        '1728x2304',
        '2560x1440',
        '1440x2560',
        '2496x1664',
        '1664x2496',
        '3024x1296'
      ],
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
    generationParams: ['size_tier', 'size'],
    editParams: ['size_tier', 'size'],
    generationDefaults: {
      response_format: 'b64_json',
      watermark: false,
      size: '2048x2048',
    },
    editDefaults: {
      response_format: 'b64_json',
      watermark: false,
      size: '2048x2048',
    },
    maxUploadImages: 10,
    requiresPrompt: true,
  },
};

export const flux_kontext_max: Model = {
  name: 'Flux Kontext Max',
  id: 'flux-kontext-max',
  description: 'Flux Kontext Max 模型，支持高质量图片生成与编辑，兼容 Flux 系列接口',
  provider: 'image-api',
  category: '绘画模型',
  inputSchema: [
    {
      key: 'prompt',
      type: 'string',
      required: true,
      description: '用于生成或编辑图像的提示词，建议不超过 1000 字符',
    },
    {
      key: 'size',
      type: 'enum',
      description: '图片比例设置，支持常见横纵比',
      default: '1:1',
      options: ['1:1', '3:4', '4:3', '9:16', '16:9', '9:21', '21:9'],
    },
    {
      key: 'output_format',
      type: 'enum',
      description: '图片输出格式',
      default: 'png',
      options: ['png', 'jpeg'],
    },
    {
      key: 'prompt_upsampling',
      type: 'boolean',
      description: '开启后自动优化提示词',
      default: true,
    },
    {
      key: 'safety_tolerance',
      type: 'number',
      description: '审核容忍度（0-6，数值越大越宽松）',
      default: 6,
      validation: {
        min: 0,
        max: 6,
      },
    },
    {
      key: 'seed',
      type: 'string',
      description: '随机种子，留空则由系统随机生成',
    },
  ],
  outputSchema: [
    {
      key: 'images',
      type: 'array',
      description: '生成或编辑后的图片数据',
    },
    {
      key: 'usage',
      type: 'object',
      description: 'API 调用计费信息',
    },
  ],
  meta: {
    generationParams: ['size', 'output_format', 'prompt_upsampling', 'safety_tolerance', 'seed'],
    editParams: ['size', 'output_format', 'prompt_upsampling', 'safety_tolerance', 'seed'],
    generationDefaults: {
      size: '1:1',
      output_format: 'png',
      prompt_upsampling: true,
      safety_tolerance: 6,
      response_format: 'url',
    },
    editDefaults: {
      size: '1:1',
      output_format: 'png',
      prompt_upsampling: true,
      safety_tolerance: 6,
      response_format: 'url',
    },
    maxUploadImages: 4,
    requiresPrompt: true,
  },
};

export const qwen_image: Model = {
  name: 'Qwen Image',
  id: 'qwen-image',
  description: '阿里通义千问 qwen-image 模型，擅长中文海报生成与编辑',
  provider: 'image-api',
  category: '绘画模型',
  inputSchema: [
    {
      key: 'prompt',
      type: 'string',
      required: true,
      description: '生成图像的提示词，支持中英文，建议不超过 800 字符',
    },
    {
      key: 'size',
      type: 'enum',
      description: '推荐尺寸，qwen-image 支持以下分辨率',
      default: '1328x1328',
      options: [
        '1328x1328',
        '1472x1140',
        '1140x1472',
        '1664x928',
        '928x1664'
      ],
    },
    {
      key: 'negative_prompt',
      type: 'string',
      description: '反向提示词，可用于控制不希望出现的元素',
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
    generationParams: ['size', 'negative_prompt'],
    editParams: ['negative_prompt'],
    generationDefaults: {
      n: 1,
      size: '1328x1328',
      response_format: 'b64_json',
      prompt_upsampling: true,
    },
    editDefaults: {
      n: 1,
      response_format: 'b64_json',
    },
    maxUploadImages: 1,
    requiresPrompt: true,
    editModelId: 'qwen-image-edit',
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

export const imageModels: Model[] = [
  gpt_image_1,
  gemini_2_5_flash_image_preview,
  seedream_4_0,
  flux_kontext_max,
  qwen_image,
  image_upscale,
];
