import type { Model, GenerateImageResponse } from '@/types/flux';
import { callImageEdit, callImageGenerate } from './image-api-client';
import { callImageUpscale } from './upscale-image';

export async function generateImage(
  model: Model,
  input: Record<string, any>
): Promise<GenerateImageResponse> {
  
  console.log('🚀 开始图像生成请求:', { model: model.id, input });

  try {
    if (model.provider === 'image-api') {
      console.log('📝 检测到图像 API 模型，准备调用接口');

      const filenames = Array.isArray(input.uploadedImages)
        ? input.uploadedImages.map((item: any) => item?.file?.name).filter(Boolean)
        : [];

      console.log('📎 上传的图片信息:', filenames);

      const hasUploadedImages = Array.isArray(input.uploadedImages) && input.uploadedImages.length > 0;
      const meta = model.meta || {};
      const generationParams: string[] = Array.isArray(meta.generationParams) ? meta.generationParams : [];
      const editParams: string[] = Array.isArray(meta.editParams) ? meta.editParams : [];

      if (meta.requiresPrompt !== false && !input.prompt) {
        return {
          success: false,
          error: '提示词不能为空',
        };
      }

      try {
        if (hasUploadedImages) {
          console.log('✏️ 进入图片编辑流程');

          const editImages = input.uploadedImages
            .map((item: any) => item.file)
            .filter((file: File | undefined): file is File => Boolean(file));

          const allowedEditOptions = editParams.reduce((acc: Record<string, any>, key) => {
            if (input[key] !== undefined && input[key] !== null) {
              acc[key] = input[key];
            }
            return acc;
          }, {});

          const editResponse = await callImageEdit({
            modelId: model.id,
            prompt: input.prompt,
            images: editImages,
            ...(allowedEditOptions as { n?: number; size?: string; background?: 'auto' | 'transparent' | 'opaque' }),
          });

          const images = editResponse.data
            .map((item, index) => {
              if (item.url) {
                return {
                  url: item.url,
                  content_type: undefined,
                  width: undefined,
                  height: undefined,
                };
              }

              if (item.b64_json) {
                return {
                  url: `data:image/png;base64,${item.b64_json}`,
                  content_type: 'image/png',
                  width: undefined,
                  height: undefined,
                };
              }

              console.warn(`⚠️ 未识别的编辑结果 (index=${index})`, item);
              return undefined;
            })
            .filter(Boolean) as any[];

          return {
            success: true,
            images,
            model: model.id,
            usage: editResponse.usage
              ? {
                  prompt_tokens: editResponse.usage.input_tokens,
                  completion_tokens: editResponse.usage.output_tokens,
                  total_tokens: editResponse.usage.total_tokens,
                  completion_tokens_details: {
                    reasoning_tokens: 0,
                    image_tokens: editResponse.usage.input_tokens_details?.image_tokens ?? 0,
                  },
                }
              : undefined,
          };
        }

        console.log('🎨 进入图片生成流程');

        const allowedGenerationOptions = generationParams.reduce((acc: Record<string, any>, key) => {
          if (input[key] !== undefined && input[key] !== null) {
            acc[key] = input[key];
          }
          return acc;
        }, {});

        const generationResponse = await callImageGenerate(model.id, {
          prompt: input.prompt,
          ...(allowedGenerationOptions as {
            n?: number;
            size?: string;
            output_format?: 'png' | 'jpeg' | 'webp';
            background?: 'transparent' | 'opaque' | 'auto';
            output_compression?: number;
          }),
        });

        const images = generationResponse.data
          .map((item, index) => {
            if (item.b64_json) {
              return {
                url: `data:image/png;base64,${item.b64_json}`,
                content_type: 'image/png',
                width: undefined,
                height: undefined,
              };
            }

            if (item.url) {
              return {
                url: item.url,
                content_type: undefined,
                width: undefined,
                height: undefined,
              };
            }

            console.warn(`⚠️ 未识别的生成结果 (index=${index})`, item);
            return undefined;
          })
          .filter(Boolean) as any[];

        const usage = generationResponse.usage
          ? {
              prompt_tokens: generationResponse.usage.input_tokens,
              completion_tokens: generationResponse.usage.output_tokens,
              total_tokens: generationResponse.usage.total_tokens,
              completion_tokens_details: {
                reasoning_tokens: 0,
                image_tokens: generationResponse.usage.input_tokens_details?.image_tokens ?? 0,
              },
            }
          : undefined;

        return {
          success: true,
          images,
          model: model.id,
          usage,
        };
      } catch (error: any) {
        console.error('❌ 图像 API 调用失败:', error);

        return {
          success: false,
          error: error?.message || '调用图像 API 失败',
        };
      }
    }

    if (model.provider === 'image-upscale') {
      console.log('📝 检测到图片高清化模型，准备调用无损放大接口');

      const hasUploadedImages = Array.isArray(input.uploadedImages) && input.uploadedImages.length > 0;
      if (!hasUploadedImages) {
        return {
          success: false,
          error: '请先上传需要高清化的图片',
        };
      }

      const file: File | undefined = input.uploadedImages
        .map((item: any) => item.file)
        .find((candidate: File | undefined): candidate is File => Boolean(candidate));

      if (!file) {
        return {
          success: false,
          error: '未找到可用的图片文件',
        };
      }

      try {
        const typeValue = typeof input.type === 'string' && input.type !== 'auto' && input.type.trim() !== ''
          ? input.type
          : undefined;

        let scaleFactor: number | undefined;
        if (input.scale_factor !== undefined && input.scale_factor !== null && input.scale_factor !== 'auto') {
          const parsed = Number(input.scale_factor);
          scaleFactor = Number.isFinite(parsed) ? parsed : undefined;
        }

        const upscaleResult = await callImageUpscale({
          file,
          type: typeValue === 'auto' ? undefined : typeValue,
          scale_factor: scaleFactor,
        });

        const { data } = upscaleResult;

        if (data?.image) {
          return {
            success: true,
            images: [
              {
                url: data.image,
                width: data.image_width,
                height: data.image_height,
                content_type: undefined,
              },
            ],
            model: model.id,
          };
        }

        if (data?.task_id) {
          return {
            success: false,
            error: `高清化任务已创建，任务 ID: ${data.task_id}`,
          };
        }

        return {
          success: false,
          error: '高清化接口未返回图片结果，请稍后重试',
        };
      } catch (error: any) {
        console.error('❌ 图片高清化失败:', error);
        return {
          success: false,
          error: error?.message || '调用图片高清化接口失败',
        };
      }
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
