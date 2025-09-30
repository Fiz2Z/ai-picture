import axios from 'axios';
import { ENV } from '@/utils/env';

const getConfig = () => {
  const baseURL = ENV.IMAGE_API_URL();
  if (!baseURL) {
    throw new Error('未配置图像 API 地址');
  }

  const apiKey = ENV.IMAGE_API_KEY();
  if (!apiKey) {
    throw new Error('未配置图像 API 密钥');
  }

  return {
    baseURL: baseURL.replace(/\/$/, ''),
    apiKey,
  };
};

export interface ImageGenerationRequest {
  prompt: string;
  n?: number;
  size?: string;
  output_format?: 'png' | 'jpeg' | 'webp';
  background?: 'transparent' | 'opaque' | 'auto';
  output_compression?: number;
  response_format?: 'url' | 'b64_json';
  watermark?: boolean;
  seed?: number;
  prompt_upsampling?: boolean;
  safety_tolerance?: number;
}

export interface ImageGenerationItem {
  b64_json?: string;
  url?: string;
}

export interface ImageUsage {
  input_tokens: number;
  input_tokens_details?: {
    image_tokens: number;
    text_tokens: number;
  };
  output_tokens: number;
  total_tokens: number;
}

export interface ImageGenerationResponse {
  created: number;
  data: ImageGenerationItem[];
  usage?: ImageUsage;
}

export interface ImageEditResponse {
  created: number;
  data: Array<{ url?: string; b64_json?: string }>;
  usage?: ImageUsage;
}

const cleanPayload = <T extends object>(payload: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(([, value]) => value !== undefined && value !== null)
  ) as Partial<T>;
};

export async function callImageGenerate(
  modelId: string,
  payload: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const { baseURL, apiKey } = getConfig();

  const response = await axios.post<ImageGenerationResponse>(
    `${baseURL}/v1/images/generations`,
    {
      model: modelId,
      ...cleanPayload(payload),
      prompt: payload.prompt,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

export interface ImageEditRequestOptions {
  modelId: string;
  prompt: string;
  images: File[];
  mask?: File;
  n?: number;
  size?: string;
  background?: 'auto' | 'transparent' | 'opaque';
  response_format?: 'url' | 'b64_json';
  watermark?: boolean;
  output_format?: 'png' | 'jpeg';
  seed?: number;
  prompt_upsampling?: boolean;
  safety_tolerance?: number;
}

export async function callImageEdit(
  options: ImageEditRequestOptions
): Promise<ImageEditResponse> {
  const { baseURL, apiKey } = getConfig();

  if (!options.images || options.images.length === 0) {
    throw new Error('请提供至少一张待编辑的图片');
  }

  const formData = new FormData();
  formData.append('prompt', options.prompt);
  formData.append('model', options.modelId);

  options.images.forEach((file) => {
    formData.append('image', file, file.name);
  });

  if (options.mask) {
    formData.append('mask', options.mask, options.mask.name);
  }

  if (options.n !== undefined) {
    formData.append('n', String(options.n));
  }

  if (options.size) {
    formData.append('size', options.size);
  }

  if (options.output_format) {
    formData.append('output_format', options.output_format);
  }

  if (typeof options.seed === 'number' && Number.isFinite(options.seed)) {
    formData.append('seed', String(Math.floor(options.seed)));
  }

  if (typeof options.prompt_upsampling === 'boolean') {
    formData.append('prompt_upsampling', String(options.prompt_upsampling));
  }

  if (typeof options.safety_tolerance === 'number' && Number.isFinite(options.safety_tolerance)) {
    formData.append('safety_tolerance', String(Math.floor(options.safety_tolerance)));
  }

  if (options.background) {
    formData.append('background', options.background);
  }

  if (options.response_format) {
    formData.append('response_format', options.response_format);
  }

  if (typeof options.watermark === 'boolean') {
    formData.append('watermark', String(options.watermark));
  }

  const response = await axios.post<ImageEditResponse>(
    `${baseURL}/v1/images/edits`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  return response.data;
}
