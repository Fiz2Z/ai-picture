import axios from 'axios';
import { ENV } from '@/utils/env';

interface UpscaleOptions {
  file?: File;
  image_url?: string;
  type?: string;
  scale_factor?: number | string;
}

interface UpscaleResponseData {
  image?: string;
  image_height?: number;
  image_width?: number;
  task_id?: string;
  [key: string]: unknown;
}

export interface UpscaleResult {
  data: UpscaleResponseData;
  raw: any;
}

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

export async function callImageUpscale(options: UpscaleOptions): Promise<UpscaleResult> {
  const { baseURL, apiKey } = getConfig();

  const formData = new FormData();
  const hasFile = options.file instanceof File;
  const hasImageUrl = typeof options.image_url === 'string' && options.image_url.trim() !== '';

  if (!hasFile && !hasImageUrl) {
    throw new Error('高清化请求需要提供图片文件或图片链接');
  }

  if (hasFile) {
    formData.append('image_file', options.file as File, options.file!.name);
  }

  if (hasImageUrl) {
    formData.append('image_url', options.image_url!.trim());
  }

  formData.append('sync', '1');

  const typeValue = typeof options.type === 'string' ? options.type.trim() : '';
  if (typeValue && typeValue !== 'auto') {
    formData.append('type', typeValue);
  }

  if (options.scale_factor !== undefined && options.scale_factor !== null) {
    const scaleValue = typeof options.scale_factor === 'string'
      ? options.scale_factor.trim()
      : String(options.scale_factor);

    if (scaleValue && scaleValue !== 'auto' && scaleValue !== 'NaN') {
      formData.append('scale_factor', scaleValue);
    }
  }

  // sync 默认为 0，无需显式设置

  const response = await axios.post(
    `${baseURL}/task/pic/scale`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  return {
    data: response.data?.data ?? {},
    raw: response.data,
  };
}
