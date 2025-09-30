/**
 * 模型参数类型
 */
export type ModelParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'enum'
  | 'image'
  | 'file'
  | 'json';

/**
 * 参数验证规则
 */
export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: unknown) => boolean;
}

/**
 * 属性定义
 */
export interface PropertyDefinition {
  type: string;
  description?: string;
  validation?: ValidationRule;
  default?: unknown;
}

/**
 * 模型参数
 */
export interface ModelParameter {
  key: string;
  type: ModelParameterType;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: unknown[];
  items?: {
    type: string;
    properties?: Record<string, PropertyDefinition>;
  };
  validation?: ValidationRule;
  path?: string;
  scale?: number;
}

/**
 * 模型定义
 */
export interface Model {
  name: string;
  id: string;
  description?: string;
  inputSchema: ModelParameter[];
  outputSchema: ModelParameter[];
  provider?: string;
  category?: string;
  isThirdParty?: boolean;
  apiEndpoint?: string;
  meta?: {
    generationParams?: string[];
    editParams?: string[];
    maxUploadImages?: number;
    requiresPrompt?: boolean;
    requiresImage?: boolean;
    hideParameters?: boolean;
    hidePrompt?: boolean;
  };
}

/**
 * 图像信息
 */
export interface Image {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
  [key: string]: unknown;
}

/**
 * 成功响应
 */
export interface SuccessResponse {
  success: true;
  images?: Image[];
  content?: string;
  model?: string;
  imageUrl?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
      cached_tokens: number;
    };
    completion_tokens_details?: {
      reasoning_tokens: number;
      image_tokens: number;
    };
  };
  seed?: number;
  requestId?: string;
  timings?: Record<string, any>;
  has_nsfw_concepts?: boolean[];
}

/**
 * 失败响应
 */
export interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  has_nsfw_concepts?: boolean[];
}

/**
 * 生成图像响应类型
 */
export type GenerateImageResponse = SuccessResponse | ErrorResponse;
