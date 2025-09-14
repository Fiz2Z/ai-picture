import type { Model, GenerateImageResponse } from '@/types/flux';
import { callOpenRouter } from './openrouter-client';

export async function generateImage(
  model: Model,
  input: Record<string, any>
): Promise<GenerateImageResponse> {
  
  console.log('🚀 开始图像生成请求:', { model: model.id, input });

  try {
    // 检查模型提供者
    if (model.provider === 'openrouter') {
      console.log('📝 检测到OpenRouter模型，使用OpenRouter API');

      // 使用传入的messages，如果没有则构建默认格式
      const messages = input.messages || [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: input.prompt || "请描述这个图像"
            }
          ]
        }
      ];

      console.log('⏳ 调用OpenRouter API:', { 
        model: model.id, 
        messages, 
        options: {
          max_tokens: input.max_tokens,
          temperature: input.temperature
        }
      });

      const response = await callOpenRouter(model.id, messages, {
        max_tokens: input.max_tokens,
        temperature: input.temperature
      });

      console.log('✅ OpenRouter API调用成功:', response);

      // 提取生成的图片
      const generatedImages = response.choices[0]?.message?.images || [];
      const images = generatedImages.map((img: any) => ({
        url: img.image_url.url,
        width: undefined,
        height: undefined,
        content_type: 'image/png'
      }));

      // 构建符合您要求的返回格式
      return {
        success: true,
        content: response.choices[0]?.message?.content || '',
        images: images.length > 0 ? images : undefined,
        model: model.id,
        // 如果有上传的图片，也包含在返回中（用于显示）
        imageUrl: input.messages?.[0]?.content?.find((c: any) => c.type === 'image_url')?.image_url?.url
      } as any;
    }

    // 如果不是支持的模型类型
    console.error('❌ 不支持的模型类型:', model.provider);
    return {
      success: false,
      error: `不支持的模型类型: ${model.provider}`,
    };

  } catch (error: any) {
    console.error('❌ 图像生成失败:', error);

    // 处理不同类型的错误
    let errorMessage = "图像生成失败";
    
    if (error.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // 特殊错误处理
    if (errorMessage.indexOf('insufficient_quota') !== -1 || errorMessage.indexOf('quota') !== -1) {
      errorMessage = "API配额不足，请检查您的账户余额";
    } else if (errorMessage.indexOf('invalid_api_key') !== -1 || errorMessage.indexOf('unauthorized') !== -1) {
      errorMessage = "API密钥无效，请检查您的密钥设置";
    } else if (errorMessage.indexOf('rate_limit') !== -1 || errorMessage.indexOf('too_many_requests') !== -1) {
      errorMessage = "请求过于频繁，请稍后再试";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}