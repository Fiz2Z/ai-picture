import type { Model, GenerateImageResponse } from '@/types/flux';
import { callImageEdit, callImageGenerate } from './image-api-client';
import { callImageUpscale } from './upscale-image';

const normalizeSeedValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }

    return undefined;
  }

  return undefined;
};

export async function generateImage(
  model: Model,
  input: Record<string, any>
): Promise<GenerateImageResponse> {
  
  console.log('🚀 开始图像生成请求', { model: model.id, input });

  try {
    if (model.provider === 'image-api') {
      console.log('📝 检测到图像 API 模型，准备调用接口');

      const filenames = Array.isArray(input.uploadedImages)
        ? input.uploadedImages.map((item: any) => item?.file?.name).filter(Boolean)
        : [];

      console.log('📎 上传的图片信息', filenames);

      const hasUploadedImages = Array.isArray(input.uploadedImages) && input.uploadedImages.length > 0;
      const meta = model.meta || {};
      const generationParams: string[] = Array.isArray(meta.generationParams) ? meta.generationParams : [];
      const editParams: string[] = Array.isArray(meta.editParams) ? meta.editParams : [];
      const generationDefaults = (meta.generationDefaults ?? {}) as Record<string, unknown>;
      const editDefaults = (meta.editDefaults ?? {}) as Record<string, unknown>;

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

          const editModelId = typeof meta.editModelId === 'string' && meta.editModelId.trim()
            ? meta.editModelId
            : model.id;

          const editIncludesSize = editParams.includes('size');
          const { size_tier: editSizeTier, size: editSizeValue, ...restEditOptions } = allowedEditOptions as Record<string, any>;
          const resolvedEditSize = editIncludesSize
            ? ((typeof editSizeValue === 'string' && editSizeValue.trim())
              || (typeof editSizeTier === 'string' && editSizeTier.trim())
              || (editDefaults.size as string)
              || (generationDefaults.size as string))
            : undefined;

          const sanitizedEditOptions = { ...restEditOptions } as Record<string, any>;
          if ('seed' in sanitizedEditOptions) {
            const normalizedSeed = normalizeSeedValue(sanitizedEditOptions.seed);
            if (normalizedSeed === undefined) {
              delete sanitizedEditOptions.seed;
            } else {
              sanitizedEditOptions.seed = normalizedSeed;
            }
          }

          const editResponse = await callImageEdit({
            modelId: editModelId,
            prompt: input.prompt,
            images: editImages,
            ...(editDefaults as Record<string, unknown>),
            ...sanitizedEditOptions,
            ...(resolvedEditSize ? { size: resolvedEditSize } : {}),
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

        const { size_tier, size: generationSizeValue, ...restGenerationOptions } = allowedGenerationOptions as Record<string, any>;
        const resolvedGenerationSize = (typeof generationSizeValue === 'string' && generationSizeValue.trim())
          || (typeof size_tier === 'string' && size_tier.trim())
          || (generationDefaults.size as string);

        const sanitizedGenerationOptions = { ...restGenerationOptions } as Record<string, any>;
        if ('seed' in sanitizedGenerationOptions) {
          const normalizedSeed = normalizeSeedValue(sanitizedGenerationOptions.seed);
          if (normalizedSeed === undefined) {
            delete sanitizedGenerationOptions.seed;
          } else {
            sanitizedGenerationOptions.seed = normalizedSeed;
          }
        }

        const generationResponse = await callImageGenerate(model.id, {
          ...(generationDefaults as Record<string, unknown>),
          prompt: input.prompt,
          ...sanitizedGenerationOptions,
          ...(resolvedGenerationSize ? { size: resolvedGenerationSize } : {}),
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

      const uploadedEntries = Array.isArray(input.uploadedImages) ? input.uploadedImages : [];
      if (uploadedEntries.length === 0) {
        return {
          success: false,
          error: '请先上传需要高清化的图?',
        };
      }

      const fileEntry = uploadedEntries.find((item: any) => item.file instanceof File);
      const urlEntry = uploadedEntries.find((item: any) => typeof item.url === 'string' && item.url.trim() !== '');

      if (!fileEntry && !urlEntry) {
        return {
          success: false,
          error: '未找到可用的图片文件或链接',
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

        const upscalePayload: {
          file?: File;
          image_url?: string;
          type?: string;
          scale_factor?: number;
        } = {
          type: typeValue === 'auto' ? undefined : typeValue,
          scale_factor: scaleFactor,
        };

        if (fileEntry?.file) {
          upscalePayload.file = fileEntry.file;
        } else if (urlEntry?.url) {
          upscalePayload.image_url = urlEntry.url;
        }

        const upscaleResult = await callImageUpscale(upscalePayload);

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
            error: `高清化任务已创建，任�?ID: ${data.task_id}`,
          };
        }

        return {
          success: false,
          error: '高清化接口未返回图片结果，请稍后重试',
        };
      } catch (error: any) {
        console.error('�?图片高清化失�?', error);
        return {
          success: false,
          error: error?.message || '调用图片高清化接口失败?',
        };
      }
    }

    // 如果不是支持的模型类�?
    console.error('�?不支持的模型类型:', model.provider);
    return {
      success: false,
      error: `不支持的模型类型: ${model.provider}`,
    };

  } catch (error: any) {
    console.error('❌ 图像生成失败:', error);

    // 处理不同类型的错�?
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
