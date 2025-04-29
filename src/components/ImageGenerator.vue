<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Model, Image, Generation, SuccessResponse, ErrorResponse, GenerateImageResponse, SuperscaledImage } from "@/types/flux"; // 导入 GenerateImageResponse 和 SuperscaledImage
import GenerationSettings from "./image-generator/GenerationSettings.vue";
import ImageDisplay from "./image-generator/ImageDisplay.vue";
import { generateImage } from "@/services/generate-image";
import { saveGeneration } from "@/services/generation-history";
import { upscaleImage } from "@/services/upscale-image"; // 导入超分服务
import { saveSuperscaleRecord } from "@/services/superscale-history"; // 导入保存超分记录服务
import { toast } from 'vue-sonner';
import { v4 as uuidv4 } from 'uuid';

import { currentUserId } from "@/lib/supabase";
import { fal } from '@fal-ai/client'; // 导入 fal 用于配置密钥

const props = defineProps<{
  model: Model;
}>();

const ensureValidNumImages = (params: Record<string, any>): Record<string, any> => {
  if (params.num_images !== undefined && params.num_images > 4) {
    params.num_images = 4;
  }
  return params;
};

const initParameters = (): Record<string, any> => {
  const defaultParams = Object.fromEntries(
    props.model.inputSchema
      .filter(param => param.default !== undefined)
      .map(param => [param.key, param.default])
  );

  let customDefaults: Record<string, any> = {};

  if (hasParameter('output_format')) {
    customDefaults.output_format = 'png';
  }
  if (hasParameter('num_images')) {
    customDefaults.num_images = 1;
  }

  if (props.model.id === 'fal-ai/flux-pro/v1.1') {
    if (hasParameter('image_size')) {
      customDefaults.image_size = 'landscape_16_9';
    }
    if (hasParameter('enable_safety_checker')) {
      customDefaults.enable_safety_checker = false;
    }
    if (hasParameter('safety_tolerance')) {
      customDefaults.safety_tolerance = '6';
    }
  }
  else if (props.model.id === 'fal-ai/flux-pro/v1.1-ultra') {
    if (hasParameter('aspect_ratio')) {
      customDefaults.aspect_ratio = '16:9';
    }
    if (hasParameter('enable_safety_checker')) {
      customDefaults.enable_safety_checker = false;
    }
    if (hasParameter('safety_tolerance')) {
      customDefaults.safety_tolerance = '6';
    }
  }
  else if (props.model.id === 'fal-ai/flux-lora') {
    if (hasParameter('image_size')) {
      customDefaults.image_size = 'landscape_16_9';
    }
    if (hasParameter('guidance_scale')) {
      customDefaults.guidance_scale = 7.0;
    }
    if (hasParameter('num_inference_steps')) {
      customDefaults.num_inference_steps = 40;
    }
    if (hasParameter('enable_safety_checker')) {
      customDefaults.enable_safety_checker = false;
    }
    if (hasParameter('loras')) {
      customDefaults.loras = [];
    }
  } else if (props.model.id === 'jimeng-3.0') {
     if (hasParameter('width')) {
         customDefaults.width = 1024;
     }
     if (hasParameter('height')) {
         customDefaults.height = 1024;
     }
     if (hasParameter('sample_strength')) {
         customDefaults.sample_strength = 0.5;
     }
     if (hasParameter('negativePrompt')) {
         customDefaults.negativePrompt = '';
     }
  }

  return ensureValidNumImages({ ...defaultParams, ...customDefaults });
};

const parameters = ref<Record<string, any>>(initParameters());
const prompt = ref('');
const result = ref<Image[] | null>(null);
const isGenerating = ref(false);

watch(() => props.model.id, () => {
  parameters.value = initParameters();
  prompt.value = '';
  result.value = null;
}, { immediate: true });

function hasParameter(key: string): boolean {
  return props.model.inputSchema.some(param => param.key === key);
}

const handleLoadSettings = (settings: { parameters: Record<string, any>, prompt: string }) => {
  const baseParams = initParameters();
  parameters.value = ensureValidNumImages({ ...baseParams, ...settings.parameters });
  prompt.value = settings.prompt || '';

  if (props.model.id === 'fal-ai/flux-lora' && !parameters.value.loras) {
    parameters.value.loras = [];
  }

  console.log('已加载设置:', { parameters: parameters.value, prompt: prompt.value });
};

async function handleGenerate() {
  console.log("🎨 开始客户端图像生成过程");

  if (!prompt.value.trim() && props.model.inputSchema.some(p => p.key === 'prompt')) {
    toast.error("请输入提示词");
    return;
  }

  isGenerating.value = true;
  result.value = null;

  try {
    console.log("🛠️ Before ensureValidNumImages, parameters.value:", parameters.value);
    const allParameters: Record<string, any> = ensureValidNumImages({
      ...parameters.value,
      prompt: prompt.value,
       negative_prompt: props.model.id !== 'jimeng-3.0' ? (parameters.value.negativePrompt ?? parameters.value.negative_prompt ?? '') : undefined,
    });
     console.log("🛠️ After ensureValidNumImages, allParameters:", allParameters);

    if (allParameters.loras && Array.isArray(allParameters.loras)) {
      allParameters.loras = allParameters.loras.filter((lora: { path: string; scale: number }) =>
        lora.path && lora.path.trim() !== ''
      );
      if (allParameters.loras.length === 0) {
        delete allParameters.loras;
      }
    }

    console.log("📤 发送生成请求，最终参数:", allParameters);

    const ACTIVE_KEY_STORAGE_KEY = 'fal-ai-active-key';
    const API_KEYS_STORAGE_KEY = 'fal-ai-api-keys';
    const ACTIVE_KEY_INDEX_STORAGE_KEY = 'fal-ai-active-key-index';

    let apiKey = '';
    if (!props.model.isThirdParty) {
        apiKey = localStorage.getItem(ACTIVE_KEY_STORAGE_KEY) || '';
        if (!apiKey) {
          const apiKeys = JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) || '[]');
          const activeKeyIndex = parseInt(localStorage.getItem(ACTIVE_KEY_INDEX_STORAGE_KEY) || '-1');

          if (activeKeyIndex >= 0 && activeKeyIndex < apiKeys.length) {
            apiKey = apiKeys[activeKeyIndex].key;
            localStorage.setItem(ACTIVE_KEY_STORAGE_KEY, apiKey);
          }
        }
    }

    console.log('🔑 API密钥状态:', {
      modelType: props.model.isThirdParty ? 'Third-Party' : 'FAL.AI',
      hasActiveFalApiKey: !!apiKey,
      keyLength: apiKey?.length ?? 0
    });
    if (!props.model.isThirdParty && !apiKey) {
      toast.error('未设置FAL.AI API密钥', {
        description: '请先在设置中添加并选择一个FAL.AI API密钥'
      });
      isGenerating.value = false;
      return;
    }

    const response: GenerateImageResponse = await generateImage(props.model, allParameters, apiKey);

    if (response.success) {
      const successResponse = response as SuccessResponse;
      console.log("📥 收到生成响应:", {
        imageCount: successResponse.images.length,
        firstImageUrl: successResponse.images[0]?.url,
        seed: successResponse.seed,
        requestId: successResponse.requestId,
      });
      result.value = successResponse.images;

      const savePromises = successResponse.images.map(async (image, index) => {
        const newGeneration: Generation = {
          id: uuidv4(),
          modelId: props.model.id,
          modelName: props.model.name,
          prompt: prompt.value,
          parameters: allParameters,
          output: {
            images: [image],
            timings: successResponse.timings, // 直接使用，如果不存在则为 undefined
            seed: successResponse.seed,
            has_nsfw_concepts: successResponse.has_nsfw_concepts ?
              [successResponse.has_nsfw_concepts[index] || false] : undefined, // 如果不存在则为 undefined
          },
          timestamp: Date.now(),
          userId: currentUserId,
          isCurrentUser: true
        };
        await saveGeneration(newGeneration);
      });

      await Promise.all(savePromises);

      toast.success("图像生成成功", {
        description: successResponse.seed ? `种子: ${successResponse.seed}` : undefined
      });
    } else {
      const errorResponse = response as ErrorResponse;
      console.error("✖️ 生成失败:", errorResponse.error);

      if (errorResponse.errorCode === "ALL_KEYS_EXHAUSTED" || errorResponse.errorCode === "ALL_FAL_AI_KEYS_EXHAUSTED") {
        toast.error("所有API密钥余额不足", {
          description: "请添加新的API密钥或充值您的账户。"
        });
      } else if (errorResponse.errorCode === "CONTENT_BLOCKED" || errorResponse.errorCode === "NSFW_FILTERED") {
         toast.error("生成失败", {
           description: errorResponse.error
         });
      } else if (errorResponse.errorCode === "FAL_AI_BALANCE_EXHAUSTED") {
         toast.warning("正在尝试切换密钥...", { duration: 2000 });
      } else {
        toast.error("生成失败", {
          description: errorResponse.error || "请检查您的API密钥和网络连接"
        });
      }
    }
  } catch (error: any) {
    console.error("❌ 处理生成请求时发生意外错误:", error);
    toast.error("生成失败", {
      description: error.message || "请检查您的API密钥和网络连接"
    });
  } finally {
    isGenerating.value = false;
  }
}

const handleUpscaleImage = async (imageUrl: string) => {
  console.log('⏫ 接收到超分请求:', imageUrl);
  const apiKey = localStorage.getItem("fal-ai-active-key");
   if (!apiKey) {
       toast.error('未设置FAL.AI API密钥', {
         description: '图像超分功能需要FAL.AI API密钥。'
       });
       return;
   }

  const upscaleToastId = toast.loading('正在进行图像超分...', {
       description: '这可能需要一些时间，请耐心等待...'
  });

  try {
    const result = await upscaleImage(imageUrl, {
      // checkpoint: 'v2',
      // overlappingTiles: true,
    });

    if (result.success) {
      const upscaleOutput = result.output;
      const requestId = result.requestId || uuidv4();

      toast.success('图像超分完成！', {
        id: upscaleToastId,
        description: `请求 ID: ${requestId.substring(0,8)}...`
      });

      if (upscaleOutput && upscaleOutput.image && upscaleOutput.image.url) {
          const recordToSave: Omit<SuperscaledImage, 'timestamp' | 'id'> & { requestId?: string } = {
              originalImageUrl: imageUrl,
              superscaledImageUrl: upscaleOutput.image.url,
              upscaledWidth: upscaleOutput.image.width,
              upscaledHeight: upscaleOutput.image.height,
              requestId: requestId,
              // checkpoint: options.checkpoint, // 如果需要保存，从 options 获取
              // overlappingTiles: options.overlappingTiles, // 如果需要保存，从 options 获取
          };

          const saveResult = await saveSuperscaleRecord(recordToSave);

          if (saveResult.success) {
              console.log(`超分结果已保存到 Supabase: ${requestId}`);
              toast.info('超分结果已保存，请前往“超分图片”页面查看。');
          } else {
              console.error('保存超分结果到 Supabase 失败:', saveResult.error);
              toast.error('保存超分结果失败。');
          }

      } else {
          console.error('超分成功但未返回有效图像数据');
          toast.warning('超分完成但未获取到图像数据。', { id: upscaleToastId });
      }

    } else {
      toast.error('超分失败', {
        id: upscaleToastId,
        description: result.error || '未知错误'
      });
      if (result.errorCode === 'FAL_AI_BALANCE_EXHAUSTED' || result.errorCode === 'ALL_FAL_AI_KEYS_EXHAUSTED') {
         toast.warning('FAL.AI 密钥余额不足，请检查或更换密钥。', { duration: 5000 });
      }
    }
  } catch (error: any) {
     console.error('❌ 处理超分请求时发生意外错误:', error);
     toast.error('处理超分请求时发生意外错误', {
       id: upscaleToastId,
       description: error.message || '请稍后再试'
     });
  }
};

</script>

<template>
  <div class="flex flex-col space-y-8 w-full max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <GenerationSettings
        :prompt="prompt"
        @update:prompt="prompt = $event"
        @generate="handleGenerate"
        :is-generating="isGenerating"
        :model="model"
        :parameters="parameters"
        @update:parameters="parameters = $event"
        @loadSettings="handleLoadSettings"
      />
      <ImageDisplay
        :result="result"
        :is-generating="isGenerating"
        @upscale-image="handleUpscaleImage"
      />
    </div>
  </div>
</template>