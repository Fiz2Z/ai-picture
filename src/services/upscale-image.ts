import { fal } from "@fal-ai/client";
import { toast } from 'vue-sonner';
import { handleBalanceExhaustedError } from "./api-key-manager";
import type { Image } from "@/types/flux";

const AURA_SR_MODEL_ID = 'fal-ai/aura-sr';

interface AuraSrInput {
  image_url: string;
  upscaling_factor?: 4;
  checkpoint?: 'v1' | 'v2';
  overlapping_tiles?: boolean;
}

// 输出类型直接使用 API 文档中的 AuraSrOutput 定义
interface AuraSrOutput {
  image: Image;
  timings: Record<string, number>;
}

// 定义一个包含成功结果或错误的响应类型
type UpscaleImageResponse =
  | { success: true; output: AuraSrOutput; requestId: string | null } // requestId 可能为 null
  | { success: false; error: string; errorCode?: string; requestId?: string | null };


/**
 * 调用 Aura SR API 进行超分，并等待结果
 * @param imageUrl 要超分的图片 URL
 * @param options 可选的超分参数
 * @returns Promise<UpscaleImageResponse>
 */
export async function upscaleImage(
  imageUrl: string,
  options: {
    checkpoint?: 'v1' | 'v2';
    overlappingTiles?: boolean;
  } = {}
): Promise<UpscaleImageResponse> {

  console.log('🚀 开始超分图像请求 (使用 subscribe):', { imageUrl, options });

  const apiKey = localStorage.getItem("fal-ai-active-key");
  if (!apiKey) {
    console.error('❌ 未设置FAL.AI API密钥');
    toast.error('未设置FAL.AI API密钥', {
      description: '图像超分功能需要有效的FAL.AI API密钥。'
    });
    return { success: false, error: "未设置FAL.AI API密钥" };
  }

  fal.config({ credentials: apiKey });

  const input: AuraSrInput = {
    image_url: imageUrl,
    upscaling_factor: 4 as any,
    checkpoint: options.checkpoint ?? 'v1',
    overlapping_tiles: options.overlappingTiles ?? false,
  };

  console.log('⏳ 订阅 FAL.AI 超分模型:', { modelId: AURA_SR_MODEL_ID, input });

  // 显示正在处理的提示
  const upscaleToastId = toast.loading('正在进行图像超分...', {
       description: '这可能需要一些时间，请耐心等待...'
  });

  try {
    // 使用 fal.subscribe，它会处理轮询并返回最终结果
    const result: { data: AuraSrOutput | null, requestId: string | null, logs?: any[], error?: any } = await fal.subscribe(AURA_SR_MODEL_ID, {
      input: input as any,
      logs: true, // 可以选择是否获取日志
      onQueueUpdate(update) {
        console.log(`🔄 超分队列状态: ${update.status}`);
        // --- 修改这里的逻辑 ---
        if (update.status === 'IN_PROGRESS') {
           toast.loading('超分任务正在处理中...', { id: upscaleToastId, description: '任务已开始处理...' });
        } else if (update.status === 'IN_QUEUE') {
           // 只有在 IN_QUEUE 状态下才安全访问 queue_position
           const position = (update as any).queue_position; // 使用类型断言或可选链
           toast.loading('超分任务正在排队...', { id: upscaleToastId, description: `队列位置: ${position ?? 'N/A'}` });
        }
     },
    });

    console.log('📦 完整超分 API 响应:', JSON.stringify(result, null, 2));

    // 检查结果中是否有图像数据
    if (result.data && result.data.image && result.data.image.url) {
      console.log('✅ 超分完成:', { requestId: result.requestId, imageUrl: result.data.image.url });
      toast.success('图像超分完成！', {
          id: upscaleToastId,
          description: `请求 ID: ${result.requestId ? result.requestId.substring(0,8)+'...' : 'N/A'}`
      });
      return {
        success: true,
        output: result.data,
        requestId: result.requestId
      };
    } else {
      // 如果没有图像数据，但没有明确的错误，报告失败
      console.error('❌ 超分响应中未找到图像数据');
      toast.error('超分失败', {
          id: upscaleToastId,
          description: 'API 未返回有效的图像结果。'
      });
      return { success: false, error: '超分失败，未返回图像结果', requestId: result.requestId };
    }

  } catch (error: any) {
    console.error("❌ 超分请求失败 (Catch Block):", error);
    toast.dismiss(upscaleToastId); // 关闭 loading toast

    if ((error.status === 403 && error.message?.includes('balance')) ||
        (error.body?.detail?.includes('Exhausted balance'))) {

      const switched = handleBalanceExhaustedError();
      if (switched) {
        return { success: false, error: "FAL.AI API密钥余额不足，正在切换...", errorCode: "FAL_AI_BALANCE_EXHAUSTED" };
      } else {
        return { success: false, error: "所有FAL.AI API密钥余额不足", errorCode: "ALL_FAL_AI_KEYS_EXHAUSTED" };
      }
    }

    toast.error('超分请求失败', {
      description: error.message || "请检查网络连接或稍后再试"
    });
    return { success: false, error: error.message || "超分请求失败" };
  }
}

// --- 删除 getUpscaleResult 函数 ---
// export async function getUpscaleResult(requestId: string): Promise<AuraSrOutput | null> { ... }