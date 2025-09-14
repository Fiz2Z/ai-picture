import OpenAI from 'openai';

// 从环境变量获取配置
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';
const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'AI Image Generator';

// 创建OpenRouter客户端
export const openrouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": SITE_URL,
    "X-Title": SITE_NAME,
  },
  dangerouslyAllowBrowser: true
});

// OpenRouter API响应类型
export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      images?: Array<{
        type: string;
        image_url: {
          url: string;
        };
        index: number;
      }>;
    };
  }>;
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
}

// 调用OpenRouter API
export async function callOpenRouter(
  model: string,
  messages: any[],
  options: {
    max_tokens?: number;
    temperature?: number;
  } = {}
): Promise<OpenRouterResponse> {
  try {
    console.log('🚀 调用OpenRouter API:', { model, messages, options });

    const completion = await openrouterClient.chat.completions.create({
      model,
      messages,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7,
      extra_headers: {
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
      },
      extra_body: {},
    } as any);

    console.log('✅ OpenRouter API调用成功:', completion);

    return {
      choices: completion.choices.map(choice => ({
        message: {
          content: choice.message?.content || '',
          images: (choice.message as any)?.images || []
        }
      })),
      usage: completion.usage ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
        prompt_tokens_details: (completion.usage as any).prompt_tokens_details,
        completion_tokens_details: (completion.usage as any).completion_tokens_details
      } : undefined
    };
  } catch (error) {
    console.error('❌ OpenRouter API调用失败:', error);
    throw error;
  }
}
