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
  | 'image'  // 图像数据的特殊类型
  | 'file'   // 文件上传的特殊类型
  | 'json';  // 结构化JSON数据

/**
 * 验证规则接口
 */
export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: unknown) => boolean;
}

/**
 * 属性定义接口
 */
export interface PropertyDefinition {
  type: string;
  description?: string;
  validation?: ValidationRule;
  default?: unknown;
}

/**
 * 模型参数接口
 */
export interface ModelParameter {
  key: string;
  type: ModelParameterType;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: unknown[];  // 枚举类型参数
  items?: {
    type: string;
    properties?: Record<string, PropertyDefinition>;
  };  // 数组项类型
  validation?: ValidationRule;
  // LoRA specific properties (assuming structure based on usage)
  path?: string;
  scale?: number;
}

/**
 * 模型接口
 */
export interface Model {
  name: string;
  id: string;
  description?: string; // 添加可选的描述属性
  inputSchema: ModelParameter[];
  outputSchema: ModelParameter[];
  provider?: string;    // 模型提供者 (openrouter, fal, etc.)
  category?: string;    // 添加可选的分类属性
  // --- 保留向后兼容性 ---
  isThirdParty?: boolean; // 标识是否为第三方模型
  apiEndpoint?: string;   // 第三方模型的API地址
}

/**
 * 图像接口
 */
export interface Image {
  url: string;
  // --- 修改为可选，以兼容第三方API可能不返回这些信息的情况 ---
  width?: number;
  height?: number;
  content_type?: string;
  [key: string]: unknown;  // 允许额外的图像属性
}

/**
 * 生成结果接口
 */
export interface Generation {
  id: string;
  modelId: string;
  modelName: string;
  prompt: string;
  parameters: Record<string, any>;
  output: {
    images: Image[];
    // --- 修改为可选，以兼容第三方API可能不返回这些信息的情况 ---
    timings?: Record<string, any>;
    seed?: number;
    has_nsfw_concepts?: boolean[];
  };
  timestamp: number;
  userId?: string; // 用户ID，用于区分不同用户的生成记录
  isCurrentUser?: boolean; // 是否是当前用户的记录，前端显示用
  // 添加第三方API特有的信息，如果需要的话
  // Например: thirdPartyResponseDetails?: any;
}

/**
 * Supabase生成记录表类型
 */
export interface SupabaseGeneration {
  id: string;
  user_id: string;
  model_id: string;
  model_name: string;
  prompt: string;
  parameters: Record<string, any>;
  output: {
    images: Image[];
    timings?: Record<string, any>; // 修改为可选
    seed?: number; // 修改为可选
    has_nsfw_concepts?: boolean[]; // 修改为可选
  };
  created_at: string;
}

/**
 * 生成图像响应接口 - 成功
 */
export interface SuccessResponse {
  success: true;
  images?: Image[]; // 对于图像生成模型
  content?: string; // 对于文本生成模型
  model?: string; // 使用的模型ID
  imageUrl?: string; // 上传的图片URL（用于显示）
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
  }; // API使用情况
  seed?: number; // 修改为可选
  requestId?: string; // 修改为可选
  timings?: Record<string, any>; // 修改为可选
  has_nsfw_concepts?: boolean[]; // 修改为可选
}

/**
 * 生成图像响应接口 - 失败
 */
export interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string; // 错误代码，用于标识特定类型的错误 (例如: CONTENT_BLOCKED, FAL_AI_BALANCE_EXHAUSTED)
  // 添加可能的 NSFW 标记，即使失败也可能返回 (比如 FAL.AI 过滤了)
  has_nsfw_concepts?: boolean[];
}

/**
 * 生成图像响应类型
 */
export type GenerateImageResponse = SuccessResponse | ErrorResponse;


// =========================================================================
// --- 新增：超分图像相关类型 ---
// =========================================================================

/**
 * 超分图像记录接口
 */
export interface UpscaledImageRecord {
  id: string; // 唯一的超分记录ID
  originalImageUrl: string; // 原始图片的URL
  originalGenerationId?: string; // 原始图片所在的生成记录ID (可选)
  upscaledImageUrl: string; // 超分后图片的URL
  upscaledImageWidth?: number; // 超分后图片的宽度 (可选，如果API返回)
  upscaledImageHeight?: number; // 超分后图片的高度 (可选, 如果API返回)
  upscaledModelId: string; // 使用的超分模型ID (应为 fal-ai/aura-sr)
  upscalingParameters: { // 超分时使用的参数 (根据API文档细化)
    image_url: string;
    upscaling_factor?: number; // 文档中enum为4，但定义为integer
    checkpoint?: string; // 文档中enum
    overlapping_tiles?: boolean;
    [key: string]: any; // 允许其他参数
  };
  timestamp: number; // 超分完成的时间戳
  userId?: string; // 执行超分的用户ID (可选)
}


// 你可能还需要定义超分API的响应类型，如果需要在 service 层更精细地处理的话
// 例如：
// interface AuraSrQueueStatusResponse {
//   status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
//   request_id: string;
//   response_url?: string; // 只有 COMPLETED 状态下有
//   status_url: string;
//   cancel_url: string;
//   logs?: Record<string, any>;
//   metrics?: Record<string, any>;
//   queue_position?: number;
// }

// interface AuraSrCompletedResponse {
//   image: Image; // 使用我们定义的 Image 类型
//   timings?: Record<string, any>;
// }

// export type AuraSrResponse = AuraSrQueueStatusResponse | AuraSrCompletedResponse;

/**
 * Aura SR 模型输入参数接口 (根据API文档)
 */
export interface AuraSrInput {
  image_url: string; // 原始图片URL (必须)
  upscaling_factor?: "4" | undefined; // 超分因子 (文档enum为4，只能是数字4或undefined) // <-- 修改为 "4" | undefined
  checkpoint?: "v1" | "v2"; // 检查点 (文档enum)
  overlapping_tiles?: boolean; // 是否使用重叠瓦片
  [key: string]: any; // 允许其他未在文档中列出的参数
}

/**
 * 超分成功响应接口 (根据API文档的成功结果结构)
 */
export interface UpscaleSuccessResponse {
  success: true;
  upscaledImage: Image; // 超分后的图片，使用我们定义的 Image 类型
  timings?: Record<string, any>; // 处理时间 (可选)
  // 其他从API文档结果中可能需要的属性
}

/**
 * 超分响应接口 (包含成功或失败)
 */
export type UpscaleImageResponse = UpscaleSuccessResponse | ErrorResponse;

// --- 新增：超分图片类型定义 ---
export interface SuperscaledImage {
  id: string;
  originalImageUrl: string;
  superscaledImageUrl: string;
  timestamp: number;
  originalWidth?: number;
  originalHeight?: number;
  upscaledWidth?: number;
  upscaledHeight?: number;
  checkpoint?: string;
  overlappingTiles?: boolean;
}