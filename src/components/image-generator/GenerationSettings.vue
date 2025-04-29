<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Model, ModelParameter, ModelParameterType } from "@/types/flux";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X, Wand2, Save, Settings, Trash2, RefreshCw } from "lucide-vue-next";
import ImageSizeRadioGroup from "./ImageSizeRadioGroup.vue";
import DefaultSettingsToolbar from "./DefaultSettingsToolbar.vue";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fal } from "@fal-ai/client";
import { toast } from 'vue-sonner';
import { handleBalanceExhaustedError } from "@/services/api-key-manager";

const props = defineProps<{
  prompt: string;
  isGenerating: boolean;
  model: Model;
  parameters: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update:prompt', value: string): void;
  (e: 'update:parameters', payload: Record<string, any>): void;
  (e: 'generate'): void;
  (e: 'loadSettings', settings: { parameters: Record<string, any>, prompt: string }): void;
}>();

const promptValue = computed({
  get: () => props.prompt,
  set: (value: string) => {
    emit('update:prompt', value);
  }
});

const loadSettings = (settings: { parameters: Record<string, any>, prompt: string }) => {
  emit('loadSettings', settings);

  if (props.model.inputSchema.some(param => param.key === 'seed')) {
     setTimeout(() => {
       generateRandomSeed();
     }, 100);
  }
};

const jimengSizeOptions = [
  { label: '1:1 (1328x1328)', width: 1328, height: 1328 },
  { label: '3:4 (1104x1472)', width: 1104, height: 1472 },
  { label: '2:3 (1056x1584)', width: 1056, height: 1584 },
  { label: '9:16 (936x1664)', width: 936, height: 1664 },
  { label: '21:9 (2016x864)', width: 2016, height: 864 },
  { label: '16:9 (1664x936)', width: 1664, height: 936 },
  { label: '3:2 (1584x1056)', width: 1584, height: 1056 },
  { label: '4:3 (1472x1104)', width: 1472, height: 1104 },
];

const initializeAllParameters = () => {
  console.log('🛠️ Initializing parameters for model:', props.model.id);
  const initialParams: Record<string, any> = {};

  props.model.inputSchema.forEach(param => {
    if (props.parameters?.[param.key] !== undefined) {
        initialParams[param.key] = props.parameters[param.key];
    } else if (param.default !== undefined) {
        initialParams[param.key] = param.default;
    }
  });

  props.model.inputSchema.forEach(param => {
      if (param.type === 'enum' && param.key !== 'prompt' && param.options) {
          const currentValue = initialParams[param.key];
          if (currentValue !== undefined && !param.options.includes(currentValue)) {
             if (param.default !== undefined) {
                 initialParams[param.key] = param.default;
                 console.log(`🛠️ Resetting enum parameter ${param.key} to default value ${param.default}`);
             } else {
                 delete initialParams[param.key];
                 console.log(`🛠️ Removing invalid value for enum parameter ${param.key}`);
             }
          }
      }
  });

  console.log('🛠️ Initial parameters result:', initialParams);
  emit('update:parameters', initialParams as Record<string, any>);
};

onMounted(() => {
  setTimeout(() => {
    initializeAllParameters();
  }, 100);
});

watch(() => props.model.id, () => {
  console.log('🛠️ Model changed, re-initializing parameters.');
  setTimeout(() => {
    initializeAllParameters();
  }, 100);
});

const updateParameter = (updates: Record<string, any>) => {
  console.log('🛠️ updateParameter called with updates object:', updates);
  const newParameters = { ...props.parameters, ...updates };
  console.log('🛠️ newParameters:', newParameters);
  emit('update:parameters', newParameters as Record<string, any>);
};

const generateRandomSeed = () => {
   const seedParam = props.model.inputSchema.find(param => param.key === 'seed');
   if (!seedParam) {
      toast.info(`当前模型 "${props.model.name}" 不支持随机种子`);
      return;
   }

  const randomSeed = Math.floor(Math.random() * 100000000);
  updateParameter({ seed: randomSeed } as Record<string, any>);
  toast.success(`已生成新的随机种子: ${randomSeed}`);
};

const savedSettings = ref<Array<{id: string, name: string, parameters: Record<string, any>, prompt: string}>>([]);
const settingName = ref('');
const isDialogOpen = ref(false);
const isDropdownOpen = ref(false);

const getDefaultPresets = (modelId: string): Array<{ name: string, parameters: Record<string, any>, prompt: string }> => {
  const ensureValidNumImages = (params: Record<string, any>) => {
    if (params.num_images !== undefined && params.num_images > 4) {
      return { ...params, num_images: 4 };
    }
    return params;
  };
  const presets: Record<string, Array<{ name: string, parameters: Record<string, any>, prompt: string }>> = {
    'fal-ai/flux-pro/v1.1': [
      {
        name: '高清写实风景',
        parameters: {
          image_size: 'landscape_16_9',
          output_format: 'png',
          num_images: 1,
          enable_safety_checker: false,
          safety_tolerance: '6',
          negative_prompt: ''
        },
        prompt: 'Beautiful natural landscape, high-quality photography, sunny day, 4K ultra-clear, fine details'
      },
      {
        name: '动漫风格人物',
        parameters: {
          image_size: 'portrait_4_3',
          output_format: 'png',
          num_images: 1,
          enable_safety_checker: true,
          safety_tolerance: '4',
          negative_prompt: ''
        },
        prompt: 'Anime style young female character, colorful illustration, beautiful lines, exquisite details'
      },
      {
        name: '未来科技风',
        parameters: {
          image_size: 'square_hd',
          output_format: 'png',
          num_images: 1,
          enable_safety_checker: false,
          safety_tolerance: '6',
          negative_prompt: ''
        },
        prompt: 'Futuristic tech style, high-tech city, blue color scheme, holographic rendering, fine details, 8K ultra-clear'
      }
    ],
    'fal-ai/flux-pro/v1.1-ultra': [
      {
        name: '超宽屏风景',
        parameters: {
          aspect_ratio: '21:9',
          output_format: 'png',
          num_images: 1,
          enable_safety_checker: false,
          safety_tolerance: '6',
           negative_prompt: ''
        },
        prompt: 'Magnificent mountain landscape, ultra-wide panorama, sunny day, 8K ultra-clear, fine details'
      },
      {
        name: '电影海报风格',
        parameters: {
          aspect_ratio: '2:3',
          output_format: 'png',
          num_images: 1,
          enable_safety_checker: true,
          safety_tolerance: '4',
          negative_prompt: ''
        },
        prompt: 'Movie poster style, dramatic lighting, cinematic composition, high contrast, professional quality'
      }
    ],
    'fal-ai/flux-lora': [
      {
        name: 'LoRA 基础设置',
        parameters: {
          image_size: 'square_hd',
          output_format: 'png',
          num_images: 1,
          enable_safety_checker: true,
          safety_tolerance: '4',
          loras: [],
          negative_prompt: ''
        },
        prompt: 'High quality, masterpiece, detailed, 8K resolution'
      }
    ],
    'jimeng-3.0': [
      {
        name: 'Jimeng 默认',
        parameters: {
          prompt: '',
          negativePrompt: '',
          width: 1024,
          height: 1024,
          sample_strength: 0.5,
        },
        prompt: 'Default settings for Jimeng 3.0'
      },
      {
        name: '人像 3:4',
        parameters: {
          prompt: '',
          negativePrompt: '',
          width: 1104,
          height: 1472,
          sample_strength: 0.5,
        },
        prompt: 'Portrait style image'
      },
       {
        name: '风景 16:9',
        parameters: {
          prompt: '',
          negativePrompt: '',
          width: 1664,
          height: 936,
          sample_strength: 0.5,
        },
        prompt: 'Landscape style image'
      }
    ]
  };

  const result = presets[modelId] || [];
  return result.map(preset => ({
    ...preset,
    parameters: ensureValidNumImages({...preset.parameters})
  }));
};

const defaultPresets = computed(() => {
  return getDefaultPresets(props.model.id).map(preset => ({
    ...preset,
    id: `preset-${preset.name}`,
    isPreset: true
  }));
});

const allSettings = computed(() => {
  return [...savedSettings.value, ...defaultPresets.value.filter(preset => !savedSettings.value.some(userSetting => userSetting.name === preset.name))];
});

const saveCurrentSetting = () => {
  if (!settingName.value.trim()) {
    toast.error('请输入设置名称');
    return;
  }

  const modelId = props.model.id;
  const storageKey = `fal-ai-settings-${modelId}`;

  const newSetting = {
    id: Date.now().toString(),
    name: settingName.value,
    parameters: { ...props.parameters },
    prompt: props.prompt
  };

  const existingIndex = savedSettings.value.findIndex(s => s.name === newSetting.name);

  if (existingIndex >= 0) {
     savedSettings.value[existingIndex] = newSetting;
     toast.success(`已更新设置: ${newSetting.name}`);
  } else {
     savedSettings.value = [newSetting, ...savedSettings.value];
     toast.success(`已保存设置: ${newSetting.name}`);
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(savedSettings.value));
    settingName.value = '';
    isDialogOpen.value = false;
  } catch (error) {
    console.error('保存设置失败:', error);
    toast.error('保存设置失败');
  }
};

const loadSetting = (setting: {id: string, name: string, parameters: Record<string, any>, prompt: string, isPreset?: boolean}) => {
  emit('loadSettings', {
    parameters: setting.parameters,
    prompt: setting.prompt
  });
  toast.success(`已加载设置: ${setting.name}`);

  isDropdownOpen.value = false;

  if (props.model.inputSchema.some(param => param.key === 'seed')) {
     setTimeout(() => {
       generateRandomSeed();
     }, 100);
  }
};

const deleteSetting = (id: string) => {
  const index = savedSettings.value.findIndex(setting => setting.id === id);
  if (index !== -1) {
    const settingName = savedSettings.value[index].name;
    savedSettings.value.splice(index, 1);

    const modelId = props.model.id;
    const storageKey = `fal-ai-settings-${modelId}`;
    localStorage.setItem(storageKey, JSON.stringify(savedSettings.value));

    toast.success(`已删除设置: ${settingName}`);
    isDropdownOpen.value = false;
  } else {
    toast.info('默认预设设置不能删除');
    isDropdownOpen.value = false;
  }
};

onMounted(() => {
  const modelId = props.model.id;
  const storageKey = `fal-ai-settings-${modelId}`;
  try {
    const storedSettings = localStorage.getItem(storageKey);
    if (storedSettings) {
      savedSettings.value = JSON.parse(storedSettings);
    } else {
       savedSettings.value = [];
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    savedSettings.value = [];
  }

  initializeAllParameters();
});

const enumParameters = computed(() => {
  return props.model.inputSchema
    .filter(param => param.type === 'enum' && param.key !== 'prompt');
});

const hasImageSizeParam = computed(() => {
  return props.model.inputSchema.some(param =>
    param.type === 'enum' && (param.key === 'image_size' || param.key === 'aspect_ratio')
  );
});

const getImageSizeParamKey = () => {
  const param = props.model.inputSchema.find(param =>
    param.type === 'enum' && (param.key === 'image_size' || param.key === 'aspect_ratio')
  );
  return param ? param.key : '';
};

const getImageSizeValue = () => {
  const key = getImageSizeParamKey();
  if (!key) return '';

  const param = props.model.inputSchema.find(p => p.key === key);
  return String(props.parameters?.[key] ?? param?.default ?? '');
};

const getImageSizeOptions = () => {
  const key = getImageSizeParamKey();
  if (!key) return [];

  const param = props.model.inputSchema.find(p => p.key === key);
  return param?.options || [];
};

const otherEnumParameters = computed(() => {
  return props.model.inputSchema
    .filter(param =>
      param.type === 'enum' &&
      param.key !== 'prompt' &&
      param.key !== 'image_size' &&
      param.key !== 'aspect_ratio'
    );
});

const mobileRowEnumParameters = computed(() => {
  return otherEnumParameters.value.filter(param =>
    param.key === 'safety_tolerance' ||
    param.key === 'output_format'
  );
});

const remainingEnumParameters = computed(() => {
  const mobileRowKeys = mobileRowEnumParameters.value.map(param => param.key);
  return otherEnumParameters.value.filter(param => !mobileRowKeys.includes(param.key));
});

const booleanParameters = computed(() => {
  return props.model.inputSchema
    .filter(param => param.type === 'boolean' && param.key !== 'sync_mode' && param.key !== 'enable_safety_checker');
});

const numberParameters = computed(() => {
  return props.model.inputSchema
    .filter(param => param.type === 'number' && param.key !== 'loras' &&
            !(props.model.id === 'jimeng-3.0' && (param.key === 'width' || param.key === 'height'))
           );
});

const mobileRowNumberParameters = computed(() => {
  return numberParameters.value.filter(param =>
    param.key === 'num_images' ||
    param.key === 'seed'
  );
});

const loraParameters = computed(() => {
  return props.model.inputSchema
    .filter(param => param.key === 'loras');
});

const formatParamName = (key: string) => {
  const nameMap: Record<string, string> = {
    'prompt': '提示词',
    'negative_prompt': '负面提示词',
    'num_inference_steps': '推理步数',
    'guidance_scale': '引导强度',
    'seed': '随机种子',
    'num_images': '图像数量',
    'image_size': '图像尺寸',
    'aspect_ratio': '宽高比',
    'output_format': '输出格式',
    'safety_tolerance': '安全容差',
    'enable_safety_checker': '启用安全检查',
    'sync_mode': '同步模式',
    'loras': 'LoRA 权重',
    'path': 'LoRA 路径',
    'scale': '比例',
    'scheduler': '采样器',
    'style': '风格',
    'width': '宽度',
    'height': '高度',
    'refiner_strength': '精细化强度',
    'apply_watermark': '添加水印',
    'high_noise_frac': '高噪声比例',
    'negative_style': '负面风格',
     'sample_strength': '精细度',
     'negativePrompt': '负面提示词',
  };

  return nameMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getParamValue = (param: ModelParameter) => {
  return props.parameters?.[param.key] ?? param.default;
};

const getSliderConfig = (key: string) => {
  const configs: Record<string, { min: number; max: number; step: number; default: number; decimals: number }> = {
    guidance_scale: {
      min: 1,
      max: 10,
      step: 0.1,
      default: 3.5,
      decimals: 1
    },
    num_inference_steps: {
      min: 1,
      max: 50,
      step: 1,
      default: 35,
      decimals: 0
    },
    sample_strength: {
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      decimals: 2
    }
  };
  return configs[key as keyof typeof configs] as typeof configs[keyof typeof configs] | undefined;
};

const addLora = (param: ModelParameter) => {
   if (props.model.id !== 'fal-ai/flux-lora') return;
  const loras = getParamValue(param) as Array<{ path: string; scale: number }> || [];
  if (loras.length >= 3) {
     toast.info('最多只能添加 3 个 LoRA');
     return;
  }
  const newLoras = [...loras, { path: "", scale: 1 }];
  updateParameter({ [param.key]: newLoras } as Record<string, any>);
};

const removeLora = (param: ModelParameter, index: number) => {
   if (props.model.id !== 'fal-ai/flux-lora') return;
  const loras = getParamValue(param) as Array<{ path: string; scale: number }> || [];
  const newLoras = [...loras];
  newLoras.splice(index, 1);
  updateParameter({ [param.key]: newLoras } as Record<string, any>);
};

const updateLoraPath = (param: ModelParameter, index: number, value: string) => {
   if (props.model.id !== 'fal-ai/flux-lora') return;
  const loras = getParamValue(param) as Array<{ path: string; scale: number }> || [];
  const newLoras = [...loras];
   if (newLoras[index]) {
     newLoras[index].path = value;
     updateParameter({ [param.key]: newLoras } as Record<string, any>);
   }
};

const updateLoraScale = (param: ModelParameter, index: number, value: number) => {
   if (props.model.id !== 'fal-ai/flux-lora') return;
  const loras = getParamValue(param) as Array<{ path: string; scale: number }> || [];
  const newLoras = [...loras];
   if (newLoras[index]) {
     newLoras[index].scale = value;
     updateParameter({ [param.key]: newLoras } as Record<string, any>);
   }
};

const isEnhancingPrompt = ref(false);

const enhancePrompt = async () => {
   const apiKey = localStorage.getItem("fal-ai-active-key");
   if (!apiKey) {
       toast.error('未设置FAL.AI API密钥', {
         description: '提示词增强功能需要FAL.AI API密钥。'
       });
        isEnhancingPrompt.value = false;
       return;
   }
    fal.config({ credentials: apiKey });

  if (!props.prompt.trim()) {
    toast.error("请先输入基础提示词");
    return;
  }

  isEnhancingPrompt.value = true;
  toast.info("正在增强提示词...", { duration: 3000 });

  try {
    const SYSTEM_PROMPT = `
    You're an AI image generation expert. You will receive a basic prompt and enhance it to create a more detailed and effective prompt for high-quality image generation.

    Important guidelines:
    1. The enhanced prompt should be in English.
    2. Add specific details about style (realistic, anime, painting, etc.), lighting (soft, dramatic, natural), composition (close-up, wide shot, etc.), colors, textures, and atmosphere.
    3. Include relevant artistic references if appropriate (like "in the style of [artist]" or "similar to [art movement]").
    4. Add technical quality indicators (high resolution, detailed, 8K, photorealistic, etc.).
    5. Keep the original intent and subject of the prompt.
    6. The prompt should be 2-4 sentences long, with rich descriptive elements.
    7. Return ONLY the enhanced prompt, no explanations or additional text.
    8. DO NOT add markdown formatting or quotes, return the PLAIN STRING only.
    `;

    const response = await fal.subscribe("fal-ai/any-llm", {
      input: {
        system_prompt: SYSTEM_PROMPT,
        prompt: `
          Enhance this image generation prompt: "${props.prompt}"
          Make it more detailed and effective for AI image generation.
        `.trim(),
        model: "anthropic/claude-3.7-sonnet" as any,
      },
    });

    if (response && response.data && response.data.output) {
      const enhancedPrompt = String(response.data.output);
      emit('update:prompt', enhancedPrompt);
      toast.success("提示词增强成功");
    } else {
      throw new Error("未收到有效的增强提示词");
    }
  } catch (error: any) {
    console.error("增强提示词失败:", error);

    if ((error.status === 403 && error.message && error.message.includes('balance')) ||
        (error.body && error.body.detail && error.body.detail.includes('Exhausted balance'))) {

      const switched = handleBalanceExhaustedError();

      if (switched) {
        toast.success("已切换到下一个FAL.AI API密钥，正在重试增强提示词...");
        setTimeout(() => {
          enhancePrompt();
        }, 1000);
        return;
      }

      toast.error("所有FAL.AI API密钥余额不足", {
        description: "提示词增强功能需要FAL.AI API密钥，请添加新的密钥或充值您的FAL.AI账户。"
      });
    } else {
      toast.error("增强提示词失败", {
        description: error instanceof Error ? error.message : "请稍后再试"
      });
    }
  } finally {
    isEnhancingPrompt.value = false;
    const activeKey = localStorage.getItem("fal-ai-active-key");
    if (activeKey) {
      fal.config({ credentials: activeKey });
    }
  }
};

const isGeneratingAdvancedPrompt = ref(false);

const generateAdvancedPrompt = async () => {
    const apiKey = localStorage.getItem("fal-ai-active-key");
    if (!apiKey) {
        toast.error('未设置FAL.AI API密钥', {
          description: '标签结构化功能需要FAL.AI API密钥。'
        });
         isGeneratingAdvancedPrompt.value = false;
        return;
    }
     fal.config({ credentials: apiKey });

  if (!props.prompt.trim()) {
    toast.error("请先输入基础提示词");
    return;
  }

  isGeneratingAdvancedPrompt.value = true;
  toast.info("正在生成高级提示词...", { duration: 3000 });

  try {
    const SYSTEM_PROMPT = `
    You're an AI image generation expert. You will receive a basic scene description and convert it into a detailed, structured prompt format for AI image generation. Your task is to analyze the scene, identify all elements, and organize them into a comprehensive tag-based format that will produce high-quality AI-generated images.

    Important guidelines:

    1. First, create a detailed Chinese description (about 100 characters) of the scene, capturing all important visual elements.
    2. Second, list all elements, relationships, and descriptive words as Chinese tags.
    3. Third, translate these tags into English, ensuring accurate and appropriate translations.
    4. Fourth, create a comprehensive comma-separated list of English tags optimized for AI image generation.
    5. Follow the exact output format requested, with the four clearly labeled sections.
    6. **Always** return just the formatted prompt, don't add any extra content, explanations, or apologies.
    7. **DO NOT ADD markdown** formatting or quotes, return the PLAIN STRING only.
    `;

    const response = await fal.subscribe("fal-ai/any-llm", {
      input: {
        system_prompt: SYSTEM_PROMPT,
        prompt: `
          请将以下场景描述转换为结构化的AI图像生成提示词格式：

          场景描述：${props.prompt}

          请分析这个场景，识别所有视觉元素，并按照以下四个步骤输出结构化的提示词：

          1. 用约100字的中文详细描述这个场景，包含所有重要的视觉元素、气氛和风格。

          2. 列出所有元素、关系和描述词的中文标签，包括主体、动作、环境、风格、光照、构图等。

          3. 将这些标签翻译成准确的英文标签。

          4. 创建一个用逗号分隔的完整英文标签列表，优化为AI图像生成使用，包含技术质量指标（如高清、细节等）和艺术风格参考。

          请使用以下格式输出：

          """

          第一步 - 场景：{}

          第二步 - 标签（关系词、名词、动词）：{}

          第三步 - tag：{}

          第四步： {}

          """

        `.trim(),
        model: "anthropic/claude-3.7-sonnet" as any,
      },
    });

    if (response && response.data && response.data.output) {
      const advancedPrompt = String(response.data.output);
      emit('update:prompt', advancedPrompt);
      toast.success("标签结构化成功");
    } else {
      throw new Error("未收到有效的结构化标签");
    }
  } catch (error: any) {
    console.error("标签结构化失败:", error);

    if ((error.status === 403 && error.message && error.message.includes('balance')) ||
        (error.body && error.body.detail && error.body.detail.includes('Exhausted balance'))) {

      const switched = handleBalanceExhaustedError();

      if (switched) {
        toast.success("已切换到下一个FAL.AI API密钥，正在重试标签结构化...");
        setTimeout(() => {
          generateAdvancedPrompt();
        }, 1000);
        return;
      }

      toast.error("所有FAL.AI API密钥余额不足", {
        description: "标签结构化功能需要FAL.AI API密钥，请添加新的密钥或充值您的FAL.AI账户。"
      });
    } else {
      toast.error("标签结构化失败", {
        description: error instanceof Error ? error.message : "请稍后再试"
      });
    }
  } finally {
    isGeneratingAdvancedPrompt.value = false;
    const activeKey = localStorage.getItem("fal-ai-active-key");
    if (activeKey) {
      fal.config({ credentials: activeKey });
    }
  }
};
</script>

<template>
  <Card class="h-full">
    <CardHeader>
      <div class="flex justify-between items-start">
        <div>
          <CardTitle>设置</CardTitle>
          <CardDescription>为 {{ model.name }} 配置您的图像生成</CardDescription>
        </div>
        <div class="hidden sm:block">
          <DefaultSettingsToolbar
            :modelId="model.id"
            :parameters="parameters"
            :prompt="prompt"
            @loadSettings="loadSettings"
          />
        </div>
      </div>

      <div class="sm:hidden grid grid-cols-2 gap-4 mt-4">
        <div class="space-y-2">
          <Dialog v-model:open="isDialogOpen">
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                class="w-full flex items-center justify-center gap-1"
              >
                <Save class="h-4 w-4" />
                <span>保存设置</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>保存设置</DialogTitle>
                <DialogDescription>
                  保存当前设置以便于以后使用。
                </DialogDescription>
              </DialogHeader>
              <div class="space-y-4 py-2">
                <div class="space-y-2">
                  <Label for="setting-name">设置名称</Label>
                  <Input id="setting-name" v-model="settingName" placeholder="输入设置名称" />
                </div>
              </div>
              <DialogFooter>
                <Button @click="saveCurrentSetting">保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu v-model:open="isDropdownOpen">
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                class="w-full flex items-center justify-center gap-1"
              >
                <Settings class="h-4 w-4" />
                <span>默认设置</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <div v-if="allSettings.length === 0" class="px-2 py-1.5 text-sm text-muted-foreground">
                暂无保存的设置
              </div>

              <div v-else>
                <div
                  v-for="(setting, index) in allSettings"
                  :key="index"
                  class="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm"
                >
                  <button
                    class="flex-1 text-left text-sm"
                    @click="loadSetting(setting)"
                  >
                    {{ setting.name }}
                  </button>

                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6"
                    @click="deleteSetting(setting.id)"
                  >
                    <Trash2 class="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div class="space-y-2">
          <Button
            variant="outline"
            size="sm"
            class="w-full flex items-center justify-center gap-1"
            @click="generateAdvancedPrompt"
            :disabled="isEnhancingPrompt || isGeneratingAdvancedPrompt || !prompt.trim()"
          >
            <Wand2 class="h-4 w-4" />
            <span>标签结构化</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            class="w-full flex items-center justify-center gap-1"
            @click="enhancePrompt"
            :disabled="isEnhancingPrompt || isGeneratingAdvancedPrompt || !prompt.trim()"
          >
            <Wand2 class="h-4 w-4" />
            <span>提示词增强</span>
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-1">
        <div class="flex justify-between items-center">
          <div>
            <Label for="prompt" class="text-sm">提示词</Label>
            <p class="text-xs mt-1 text-red-500">提示词请使用
              <Badge variant="outline" class=" bg-red-300">英文</Badge>
              <Badge variant="outline" class=" bg-red-300">标签化</Badge>
              形式</p>
          </div>
          <div class="hidden sm:flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="gap-1 h-7"
              @click="enhancePrompt"
              :disabled="isEnhancingPrompt || isGeneratingAdvancedPrompt || !prompt.trim()"
            >
              <Wand2 class="h-3.5 w-3.5" />
              <span>{{ isEnhancingPrompt ? '增强中...' : '提示词增强' }}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="gap-1 h-7"
              @click="generateAdvancedPrompt"
              :disabled="isEnhancingPrompt || isGeneratingAdvancedPrompt || !prompt.trim()"
            >
              <Wand2 class="h-3.5 w-3.5" />
              <span>{{ isGeneratingAdvancedPrompt ? '生成中...' : '标签结构化' }}</span>
            </Button>
          </div>
        </div>
        <div class="relative">
          <Textarea
            id="prompt"
            v-model="promptValue"
            placeholder="1girl, school uniform, smile, outdoors, high quality, masterpiece"
            class="min-h-[80px]"
          />
          <div class="absolute top-2 right-2">
          </div>
        </div>
      </div>

      <div v-if="parameters?.negativePrompt !== undefined || parameters?.negative_prompt !== undefined" class="space-y-1">
        <Label :for="model.id === 'jimeng-3.0' ? 'negativePrompt' : 'negative_prompt'" class="text-sm">{{ formatParamName(model.id === 'jimeng-3.0' ? 'negativePrompt' : 'negative_prompt') }}</Label>
         <Textarea
            :id="model.id === 'jimeng-3.0' ? 'negativePrompt' : 'negative_prompt'"
            :model-value="model.id === 'jimeng-3.0' ? parameters?.negativePrompt : parameters?.negative_prompt"
             @update:model-value="(value: string | number) => {
                const processedValue = typeof value === 'number' ? String(value) : value;
                updateParameter({ [model.id === 'jimeng-3.0' ? 'negativePrompt' : 'negative_prompt']: processedValue } as Record<string, any>);
             }"
            placeholder="输入负面提示词 (可选)"
            class="min-h-[80px]"
         />
      </div>

      <div v-if="hasImageSizeParam" class="w-full mb-4">
        <ImageSizeRadioGroup
          :value="getImageSizeValue()"
          :options="getImageSizeOptions()"
          :param-key="getImageSizeParamKey()"
          @update:value="(value) => updateParameter({ [getImageSizeParamKey()]: value } as Record<string, any>)"
        />
      </div>

      <div v-if="model.id === 'jimeng-3.0'" class="w-full mb-4">
        <Label class="text-sm mb-2 block">快速选择图像尺寸</Label>
        <div class="flex flex-wrap gap-2">
           <Button
             v-for="(size, index) in jimengSizeOptions"
             :key="index"
             variant="outline"
             size="sm"
             :class="{ 'border-primary': parameters?.width === size.width && parameters?.height === size.height }"
             @click="() => { updateParameter({ width: size.width, height: size.height } as Record<string, any>); }"
             >
             {{ size.label }}
           </Button>
        </div>
         <div v-if="parameters?.width !== undefined && parameters?.height !== undefined" class="mt-2 text-sm text-muted-foreground">
            当前尺寸：{{ parameters.width }}x{{ parameters.height }}
         </div>
      </div>

      <div v-if="mobileRowEnumParameters.length > 0" class="grid grid-cols-2 gap-3 mb-3">
        <div v-for="param in mobileRowEnumParameters" :key="param.key" class="space-y-1">
          <Label :for="param.key" class="text-sm">{{ formatParamName(param.key) }}</Label>
          <Select
            :model-value="getParamValue(param)"
            @update:model-value="(newValue: any) => updateParameter({ [param.key]: newValue } as Record<string, any>)"
          >
            <SelectTrigger :id="param.key">
              <SelectValue placeholder="选择选项" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in param.options"
                :key="option as string"
                :value="option as string"
              >
                {{ option as string }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div v-if="remainingEnumParameters.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="param in remainingEnumParameters" :key="param.key" class="space-y-1">
          <Label :for="param.key" class="text-sm">{{ formatParamName(param.key) }}</Label>
          <Select
            :model-value="getParamValue(param)"
            @update:model-value="(newValue: any) => updateParameter({ [param.key]: newValue } as Record<string, any>)"
          >
            <SelectTrigger :id="param.key">
              <SelectValue placeholder="选择选项" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in param.options"
                :key="option as string"
                :value="option as string"
              >
                {{ option as string }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div v-if="booleanParameters.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div
          v-for="param in booleanParameters"
          :key="param.key"
          class="flex items-center justify-between space-x-2 py-1"
        >
          <Label :for="param.key" class="text-sm">{{ formatParamName(param.key) }}</Label>
          <Switch
            :id="param.key"
            :checked="getParamValue(param)"
            @update:checked="(newValue: boolean) => updateParameter({ [param.key]: newValue } as Record<string, any>)"
          />
        </div>
      </div>

      <div v-if="numberParameters.length > 0" class="grid grid-cols-2 gap-3 mb-3">
        <template v-for="param in mobileRowNumberParameters" :key="param.key">
          <div class="space-y-1">
            <Label :for="param.key" class="text-sm">{{ formatParamName(param.key) }}</Label>
            <div v-if="param.key === 'seed'" class="flex space-x-2">
              <Input
                :id="param.key"
                type="number"
                :value="getParamValue(param)"
                class="h-8 flex-1"
                maxlength="8"
                max="99999999"
                @input="(e: Event) => {
                  const input = e.target as HTMLInputElement;
                  const value = input.value;
                  if (value.length > 8) {
                    input.value = value.slice(0, 8);
                  }
                  updateParameter({ [param.key]: Number(input.value) } as Record<string, any>);
                }"
              />
              <Button
                variant="outline"
                size="sm"
                class="h-8 px-2"
                @click="generateRandomSeed"
                title="生成新的随机种子"
              >
                <RefreshCw class="h-4 w-4" />
              </Button>
            </div>
            <Input
              v-else
              :id="param.key"
              type="number"
              :value="getParamValue(param)"
              class="h-8"
              :min="1"
              :max="param.key === 'num_images' ? 4 : undefined"
              @input="(e: Event) => {
                const input = e.target as HTMLInputElement;
                const value = Number(input.value);
                if (param.key === 'num_images' && value > 4) {
                  input.value = '4';
                  updateParameter({ [param.key]: 4 } as Record<string, any>);
                } else {
                  updateParameter({ [param.key]: value } as Record<string, any>);
                }
              }"
            />
          </div>
        </template>
      </div>

      <div v-if="numberParameters.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <template v-for="param in numberParameters" :key="param.key">
          <template v-if="!mobileRowNumberParameters.some(p => p.key === param.key)">
            <div v-if="['guidance_scale', 'num_inference_steps', 'sample_strength'].includes(param.key)" class="space-y-1">
              <div class="flex items-center justify-between">
                <Label :for="param.key" class="text-sm">
                  {{ formatParamName(param.key) }}
                </Label>
                <span class="text-sm w-12 text-right">
                  {{ Number(getParamValue(param) ?? getSliderConfig(param.key)?.default).toFixed(getSliderConfig(param.key)?.decimals ?? 0) }}
                </span>
              </div>
              <Slider
                :id="param.key"
                :min="getSliderConfig(param.key)?.min ?? 0"
                :max="getSliderConfig(param.key)?.max ?? 100"
                :step="getSliderConfig(param.key)?.step ?? 1"
                :model-value="[getParamValue(param) ?? getSliderConfig(param.key)?.default ?? 0]"
                @update:model-value="(values: number[] | undefined) => values && updateParameter({ [param.key]: values[0] } as Record<string, any>)"
                class="w-full"
              />
            </div>
            <div v-else class="space-y-1">
              <Label :for="param.key" class="text-sm">{{ formatParamName(param.key) }}</Label>
              <div v-if="param.key === 'seed'" class="flex space-x-2">
                <Input
                  :id="param.key"
                  type="number"
                  :value="getParamValue(param)"
                  class="h-8 flex-1"
                  maxlength="8"
                  max="99999999"
                  @input="(e: Event) => {
                    const input = e.target as HTMLInputElement;
                    const value = input.value;
                    if (value.length > 8) {
                      input.value = value.slice(0, 8);
                    }
                    updateParameter({ [param.key]: Number(input.value) } as Record<string, any>);
                  }"
                />
                <Button
                  variant="outline"
                  size="sm"
                  class="h-8 px-2"
                  @click="generateRandomSeed"
                  title="生成新的随机种子"
                >
                  <RefreshCw class="h-4 w-4" />
                </Button>
              </div>
              <Input
                v-else
                :id="param.key"
                type="number"
                :value="getParamValue(param)"
                class="h-8"
                @input="(e: Event) => updateParameter({ [param.key]: Number((e.target as HTMLInputElement).value) } as Record<string, any>)"
              />
            </div>
          </template>
        </template>
      </div>

      <div v-if="loraParameters.length > 0" class="space-y-3">
        <Label class="text-sm">LoRA 权重</Label>
        <div
          v-for="(lora, index) in (getParamValue(loraParameters[0]) as Array<{ path: string; scale: number }> || [])"
          :key="index"
          class="grid grid-cols-4 gap-2 relative group"
        >
          <div class="col-span-2">
            <Input
              placeholder="LoRA path or URL"
              :value="lora.path"
              @input="(e: Event) => updateLoraPath(loraParameters[0], index, (e.target as HTMLInputElement).value)"
            />
          </div>
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">比例</span>
              <span class="text-xs w-8 text-right">{{ lora.scale.toFixed(1) }}</span>
            </div>
            <Slider
              :min="0"
              :max="2"
              :step="0.1"
              :model-value="[lora.scale]"
              @update:model-value="(values: number[] | undefined) => values && updateLoraScale(loraParameters[0], index, values[0])"
              class="w-full"
            />
          </div>
          <div class="flex items-center justify-center">
            <Button
              variant="destructive"
              size="icon"
              class="h-8 w-8 opacity-70 group-hover:opacity-100 transition-opacity"
              @click="removeLora(loraParameters[0], index)"
              title="移除此LoRA"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          v-if="(getParamValue(loraParameters[0]) as Array<{ path: string; scale: number }> || []).length < 3"
          variant="outline"
          size="sm"
          class="w-full"
          @click="addLora(loraParameters[0])"
        >
          添加 LoRA
        </Button>
      </div>
    </CardContent>
    <CardFooter>
      <Button
        @click="$emit('generate')"
        :disabled="isGenerating || !prompt"
        class="w-full"
      >
        {{ isGenerating ? "生成中..." : "生成图像" }}
      </Button>
    </CardFooter>
  </Card>
</template>