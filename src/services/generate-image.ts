import { fal } from "@fal-ai/client";
import type { Model, GenerateImageResponse, Image } from "@/types/flux";
import { handleBalanceExhaustedError } from "./api-key-manager";

interface ThirdPartyApiResponse {
  created: number;
  data: Array<{
    url: string;
  }>;
}

interface ThirdPartyErrorResponse {
    code: number;
    message: string;
    data: null;
}

export async function generateImage(
  model: Model,
  input: Record<string, any>,
  apiKey: string
): Promise<GenerateImageResponse> {
  console.log('🚀 开始图像生成过程:', {
    modelId: model.id,
    inputParams: { ...input, prompt: input.prompt?.substring(0, 50) + '...' }
  });

  try {
    if (model.isThirdParty && model.apiEndpoint) {
      console.log(`Detected third-party model: ${model.name}. Calling custom API endpoint.`);

      const thirdPartyApiKey = import.meta.env.VITE_THIRD_PARTY_API_KEY as string | undefined;

      if (!thirdPartyApiKey) {
        console.error('❌ 未配置第三方API密钥 (VITE_THIRD_PARTY_API_KEY)');
        return {
          success: false,
          error: "未配置第三方API密钥。请检查您的.env文件。"
        };
      }

      const thirdPartyInput = {
        model: model.id,
        prompt: input.prompt,
        negativePrompt: input.negative_prompt,
        width: input.width,
        height: input.height,
        sample_strength: input.sample_strength,
      };

      console.log('📤 Sending POST request to third-party API:', model.apiEndpoint);
      console.log('Request Body:', thirdPartyInput);

      const response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${thirdPartyApiKey}`,
        },
        body: JSON.stringify(thirdPartyInput),
      });

      console.log('📥 Received response from third-party API. Status:', response.status);

      // --- 修改响应处理逻辑 ---

      // 尝试解析响应体，无论是成功还是失败的结构
      const responseBody: ThirdPartyApiResponse | ThirdPartyErrorResponse | { [key: string]: any } | null = await response.json().catch(() => null);
      console.log('📦 Third-party API raw response body:', JSON.stringify(responseBody, null, 2));

      // 首先，检查HTTP状态码是否表示错误
      if (!response.ok) {
         console.error('❌ Third-party API request failed (HTTP Error). Status:', response.status, 'Body:', responseBody);
         // 返回通用HTTP错误或尝试使用body中的message
         return {
           success: false,
           error: (responseBody as any)?.message || `第三方API请求失败，状态码: ${response.status}`
         };
      }

      // 如果HTTP状态码OK (通常是200)，但响应体是已知的错误格式 (如合规问题)
      // 检查响应体是否是对象，并且包含 code 和 message 属性 (排除 null 或数组)
      if (responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody) && 'code' in responseBody && 'message' in responseBody) {
          const errorBody = responseBody as ThirdPartyErrorResponse;
          console.error('❌ Third-party API returned specific error:', errorBody.message, 'Code:', errorBody.code);

          // 返回包含第三方API真实错误信息的 ErrorResponse
          return {
              success: false,
              error: errorBody.message || "第三方API返回未知错误",
              errorCode: errorBody.code ? `THIRD_PARTY_ERROR_${errorBody.code}` : "THIRD_PARTY_UNKNOWN_ERROR"
          };
      }

      // 如果HTTP状态码OK，且响应体不是已知错误格式，则期望它是成功的响应结构
      // 检查响应结构是否符合预期（包含 'data' 数组且不为空）
      if (!responseBody || !Array.isArray((responseBody as ThirdPartyApiResponse).data) || (responseBody as ThirdPartyApiResponse).data.length === 0) {
         console.error('❌ Third-party API response format is unexpected or empty for success:', responseBody);
         return {
             success: false,
             error: "第三方API响应格式错误或未包含图像"
         };
      }

      // 如果通过了结构检查，提取图像
      const result = responseBody as ThirdPartyApiResponse;
      const images: Image[] = result.data.map(item => ({ url: item.url }));

      console.log('✅ Generated images from third-party API:', { imageCount: images.length });

      return {
        success: true,
        images: images,
        seed: undefined,
        requestId: undefined,
        timings: undefined,
        has_nsfw_concepts: images.map(() => false),
      };

    }
    // --- 第三方模型处理结束 ---


    // --- 原有的 FAL.AI 调用逻辑开始 ---
    if (!apiKey) {
      console.error('❌ 未提供FAL.AI API密钥');
      return {
         success: false,
         error: "未设置FAL.AI API密钥，无法使用FAL.AI模型。",
      };
    }

    console.log('📝 使用FAL.AI API密钥配置FAL客户端');
    fal.config({
      credentials: apiKey,
    });

    console.log('⏳ 订阅FAL.AI模型:', model.id);
    const result = await fal.subscribe(model.id, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`🔄 FAL.AI 队列状态: ${update.status}`);
        if (update.status === "IN_PROGRESS") {
          console.log('📊 FAL.AI 生成日志:');
          update.logs.map((log) => log.message).forEach((msg) => console.log(`   ${msg}`));
        }
      },
    });

    console.log('📦 完整FAL.AI API响应:', JSON.stringify(result, null, 2));
    console.log('✅ FAL.AI 生成完成:', {
      requestId: result.requestId,
      hasImages: !!result.data?.images?.length
    });

    const images = result.data?.images;
    if (!images || images.length === 0) {
      console.error('❌ FAL.AI 响应中没有图像');
      if (result.data?.has_nsfw_concepts && result.data.has_nsfw_concepts.some(Boolean)) {
         return {
             success: false,
             error: "图像因安全内容被过滤",
             errorCode: "NSFW_FILTERED",
             has_nsfw_concepts: result.data.has_nsfw_concepts
         };
      }

      throw new Error("未生成图像");
    }

    console.log('🎉 成功生成FAL.AI图像:', {
      seed: result.data?.seed,
      requestId: result.requestId,
      imageCount: images.length
    });

    return {
      success: true,
      images,
      seed: result.data?.seed,
      requestId: result.requestId,
      timings: result.data?.timings || {},
      has_nsfw_concepts: result.data?.has_nsfw_concepts || [],
    };
    // --- 原有的 FAL.AI 调用逻辑结束 ---

  } catch (error: any) {
    console.error("❌ 图像生成失败 (Catch Block):", error);

    if (error && typeof error === 'object') {
        const errorMessage = error.message || (error.body?.detail && typeof error.body.detail === 'string' ? error.body.detail : JSON.stringify(error));

        if ((error.status === 403 && errorMessage.includes('Exhausted balance')) ||
            (errorMessage.includes('403') && errorMessage.includes('Exhausted balance'))) {

            const switched = handleBalanceExhaustedError();

            if (switched) {
                return {
                    success: false,
                    error: "FAL.AI API密钥余额不足，正在切换...",
                    errorCode: "FAL_AI_BALANCE_EXHAUSTED"
                };
            } else {
                return {
                    success: false,
                    error: "所有FAL.AI API密钥余额不足，请添加新的FAL.AI密钥或充值。",
                    errorCode: "ALL_FAL_AI_KEYS_EXHAUSTED"
                };
            }
        }
    }

    return {
      success: false,
      error: error.message || "生成图像失败，发生未知错误。",
    };
  }
}