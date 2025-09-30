<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Model, GenerateImageResponse } from "@/types/flux";
import { generateImage } from "@/services/generate-image";
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, X, Image as ImageIcon, Settings, Download, Wand2 } from 'lucide-vue-next';
import ImageComparison from './ImageComparison.vue';
import { getModelById } from '@/router/models';

const props = defineProps<{
  model: Model;
}>();

// 生成状态
const isGenerating = ref(false);
const generationResult = ref<GenerateImageResponse | null>(null);

// 基础输入参数
const prompt = ref('');
const uploadedImages = ref<Array<{ file: File; url: string; base64: string }>>([]);
const additionalParameters = computed(() =>
  props.model.inputSchema.filter(param => param.key !== 'prompt' && param.key !== 'messages')
);
const hasAdditionalParameters = computed(() => {
  if (props.model.meta?.hideParameters) {
    return false;
  }
  return additionalParameters.value.length > 0;
});
const maxUploadImages = computed(() => props.model.meta?.maxUploadImages ?? Infinity);
const requiresPrompt = computed(() => props.model.meta?.requiresPrompt !== false);
const requiresImage = computed(() => props.model.meta?.requiresImage === true);
const showPrompt = computed(() => requiresPrompt.value || !props.model.meta?.hidePrompt);

const UPSCALE_MODEL_ID = 'image-upscale';
const upscaleModel = computed(() => getModelById(UPSCALE_MODEL_ID));
const hasUpscaleModel = computed(() => Boolean(upscaleModel.value));
const upscalingState = ref<Record<number, boolean>>({});
const upscaledComparisons = ref<Array<{ original: string; enhanced: string }>>([]);

// 动态参数
const parameters = ref<Record<string, any>>({});

// 文件上传处理
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  
  if (!files) return;

  for (const file of Array.from(files)) {
    if (uploadedImages.value.length >= maxUploadImages.value) {
      toast.error(`最多只能上传 ${maxUploadImages.value} 张图片`);
      break;
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error(`${file.name} 不是有效的图片文件`);
      continue;
    }

    // 检查文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} 文件大小超过10MB限制`);
      continue;
    }

    try {
      // 创建预览URL
      const url = URL.createObjectURL(file);
      
      // 转换为base64
      const base64 = await fileToBase64(file);
      
      uploadedImages.value.push({
        file,
        url,
        base64
      });
    } catch (error) {
      console.error('文件处理失败:', error);
      toast.error(`处理 ${file.name} 时发生错误`);
    }
  }

  // 清空input
  target.value = '';
};

// 文件转base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 删除上传的图片
const removeImage = (index: number) => {
  const image = uploadedImages.value[index];
  URL.revokeObjectURL(image.url);
  uploadedImages.value.splice(index, 1);
};

// 初始化参数
const initParameters = () => {
  const params: Record<string, any> = {};
  
  props.model.inputSchema.forEach(param => {
    if (param.default !== undefined) {
      params[param.key] = param.default;
    }
  });

  parameters.value = params;
};

// 监听模型变化
watch(() => props.model, () => {
  prompt.value = '';
  uploadedImages.value.forEach(img => URL.revokeObjectURL(img.url));
  uploadedImages.value = [];
  generationResult.value = null;
  upscalingState.value = {};
  upscaledComparisons.value = [];
  initParameters();
}, { immediate: true });

// 获取参数值
const getParameterValue = (param: any) => {
  return parameters.value[param.key] ?? param.default;
};

// 更新参数值
const updateParameter = (key: string, value: any) => {
  parameters.value[key] = value;
};

// 检查参数是否为必填
const isRequired = (param: any) => {
  return param.required === true;
};

// 生成函数
const handleGenerate = async () => {
  if (requiresPrompt.value && !prompt.value.trim()) {
    toast.error('请输入提示词');
    return;
  }

  if (requiresImage.value && uploadedImages.value.length === 0) {
    toast.error('请上传至少一张图片');
    return;
  }

  // 检查必填参数
  for (const param of props.model.inputSchema) {
    if (isRequired(param) && !parameters.value[param.key] && param.key !== 'prompt') {
      toast.error(`请填写必填参数: ${param.description || param.key}`);
      return;
    }
  }

  upscaledComparisons.value = [];
  isGenerating.value = true;
  generationResult.value = null;

  try {
    const input: Record<string, any> = {
      ...parameters.value,
    };

    if (showPrompt.value || prompt.value.trim()) {
      input.prompt = prompt.value;
    }

    // 构建消息格式
    const messageContent: any[] = [];
    if (showPrompt.value && prompt.value.trim()) {
      messageContent.push({
        type: "text",
        text: prompt.value.trim()
      });
    }

    // 添加图片
    uploadedImages.value.forEach(image => {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: image.base64
        }
      });
    });

    if (messageContent.length > 0) {
      input.messages = [
        {
          role: "user",
          content: messageContent
        }
      ];
    }

    // 将已上传的图片信息传递给服务层（用于 GPT Image 编辑接口）
    input.uploadedImages = uploadedImages.value.map(image => ({
      file: image.file,
      url: image.url,
      base64: image.base64
    }));

    console.log('🚀 开始生成:', { model: props.model.id, input });
    
    const result = await generateImage(props.model, input);
    generationResult.value = result;

    if (result.success) {
      toast.success('生成完成！');
    } else {
      toast.error(result.error || '生成失败');
    }

  } catch (error: any) {
    console.error('生成过程出错:', error);
    toast.error(error.message || '生成过程中发生错误');
    generationResult.value = {
      success: false,
      error: error.message || '生成过程中发生错误'
    };
  } finally {
    isGenerating.value = false;
  }
};

// 清除结果
const clearResult = () => {
  generationResult.value = null;
  upscaledComparisons.value = [];
};

const setUpscalingState = (index: number, value: boolean) => {
  upscalingState.value = {
    ...upscalingState.value,
    [index]: value,
  };
};

const isUpscaling = (index: number) => upscalingState.value[index] === true;

const imageUrlToFile = async (imageUrl: string): Promise<File> => {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const extension = blob.type?.split('/')?.[1] || 'png';
  return new File([blob], `image-${Date.now()}.${extension}`, { type: blob.type || 'image/png' });
};

const handleUpscale = async (imageUrl: string, index: number) => {
  if (!upscaleModel.value) {
    toast.error('未找到高清化模型配置');
    return;
  }

  try {
    setUpscalingState(index, true);

    const file = await imageUrlToFile(imageUrl);
    const base64 = imageUrl.startsWith('data:') ? imageUrl : await fileToBase64(file);

    const result = await generateImage(upscaleModel.value, {
      uploadedImages: [
        {
          file,
          url: imageUrl,
          base64,
        },
      ],
    });

    if (result.success && result.images?.length) {
      toast.success('图片高清化完成');

      if (!generationResult.value) {
        generationResult.value = result;
        return;
      }

      if (generationResult.value.success) {
        const existingImages = generationResult.value.images ?? [];
        generationResult.value = {
          ...generationResult.value,
          images: [...existingImages, ...result.images],
        } as GenerateImageResponse;
      } else {
        generationResult.value = result;
      }

      const enhancedUrl = result.images[0].url;
      const exists = upscaledComparisons.value.some(pair => pair.original === imageUrl && pair.enhanced === enhancedUrl);
      if (!exists) {
        upscaledComparisons.value.push({
          original: imageUrl,
          enhanced: enhancedUrl,
        });
      }
    } else if (!result.success) {
      toast.error(result.error ?? '高清化失败');
    } else {
      toast.error('高清化接口未返回图片结果');
    }
  } catch (error: any) {
    console.error('高清化失败:', error);
    toast.error(error?.message || '高清化过程中发生错误');
  } finally {
    setUpscalingState(index, false);
  }
};

// 下载图片功能
const handleDownload = async (imageUrl: string, filename: string = 'image.png') => {
  try {
    // 检测是否为移动端
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (imageUrl.startsWith('data:')) {
      // 处理base64图片
      if (isIOS) {
        // iOS特殊处理
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        
        // 创建一个临时的图片元素
        const img = new Image();
        img.onload = () => {
          // 创建canvas来转换图片
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          // 转换为blob并下载
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }, 'image/png');
        };
        img.src = imageUrl;
      } else {
        // 其他平台直接下载
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // 处理网络图片
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    toast.success('图片下载成功！');
  } catch (error) {
    console.error('下载失败:', error);
    toast.error('下载失败，请重试');
  }
};

// 渲染参数控件
const renderParameterControl = (param: any) => {
  switch (param.type) {
    case 'string':
      if (param.key === 'prompt') return null; // prompt单独处理
      return 'input';
    case 'number':
      return 'slider';
    case 'boolean':
      return 'switch';
    case 'enum':
      return 'button-group';
    default:
      return 'input';
  }
};
</script>

<template>
  <div class="w-full max-w-6xl mx-auto space-y-6">
    <!-- 主要生成区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 左侧：输入控制区 -->
      <div class="space-y-6">
        <!-- 提示词输入 -->
        <Card v-if="showPrompt">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <ImageIcon class="h-5 w-5" />
              提示词
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="prompt">
                {{ requiresPrompt ? '描述您想要生成的内容 *' : '提示词（可选）' }}
              </Label>
              <Textarea
                id="prompt"
                v-model="prompt"
                :placeholder="requiresPrompt ? '请输入详细的提示词描述...' : '可根据需要输入说明信息'"
                rows="4"
                :disabled="isGenerating"
                class="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <!-- 图片上传 -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Upload class="h-5 w-5" />
              图片上传
              <Badge v-if="!requiresImage" variant="secondary">可选</Badge>
              <Badge v-else variant="default">必选</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <p class="text-sm text-muted-foreground">
              支持上传多张参考图，单张不超过 10MB。
              <span v-if="requiresImage">该模型需要至少上传一张图片。</span>
              <span v-else-if="maxUploadImages !== Infinity">最多 {{ maxUploadImages }} 张。</span>
            </p>

            <!-- 上传按钮 -->
            <div class="flex items-center justify-center w-full">
              <label
                for="image-upload"
                class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                :class="{ 'pointer-events-none opacity-50': isGenerating }"
              >
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload class="w-8 h-8 mb-2 text-muted-foreground" />
                  <p class="mb-2 text-sm text-muted-foreground">
                    <span class="font-semibold">点击上传</span> 或拖拽图片到此处
                  </p>
                  <p class="text-xs text-muted-foreground">支持 PNG, JPG, GIF (最大 10MB)</p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  class="hidden"
                  multiple
                  accept="image/*"
                  @change="handleFileUpload"
                  :disabled="isGenerating"
                />
              </label>
            </div>

            <!-- 已上传的图片预览 -->
            <div v-if="uploadedImages.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                v-for="(image, index) in uploadedImages"
                :key="index"
                class="relative group"
              >
                <div class="w-full h-20 bg-muted rounded-lg border overflow-hidden flex items-center justify-center">
                  <img
                    :src="image.url"
                    :alt="`上传的图片 ${index + 1}`"
                    class="max-w-full max-h-full object-contain"
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  class="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="removeImage(index)"
                  :disabled="isGenerating"
                >
                  <X class="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 动态参数配置 -->
        <Card v-if="hasAdditionalParameters">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Settings class="h-5 w-5" />
              参数配置
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div
              v-for="param in additionalParameters"
              :key="param.key"
              class="space-y-2"
            >
              <div class="flex items-center justify-between">
                <Label :for="param.key" class="text-sm font-medium">
                  {{ param.description || param.key }}
                  <span v-if="isRequired(param)" class="text-destructive">*</span>
                </Label>
                <Badge v-if="param.default !== undefined" variant="outline" class="text-xs">
                  默认: {{ param.default }}
                </Badge>
              </div>

              <!-- 字符串输入 -->
              <Input
                v-if="renderParameterControl(param) === 'input'"
                :id="param.key"
                :value="getParameterValue(param)"
                @input="updateParameter(param.key, ($event.target as HTMLInputElement).value)"
                :placeholder="param.description"
                :disabled="isGenerating"
              />

              <!-- 数字滑块 -->
              <div v-else-if="renderParameterControl(param) === 'slider'" class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span>{{ getParameterValue(param) }}</span>
                  <span class="text-muted-foreground">
                    {{ param.validation?.min || 0 }} - {{ param.validation?.max || 100 }}
                  </span>
                </div>
                <Slider
                  :model-value="[getParameterValue(param)]"
                  @update:model-value="(value) => updateParameter(param.key, value?.[0] || 0)"
                  :min="param.validation?.min || 0"
                  :max="param.validation?.max || (param.key === 'max_tokens' ? 4000 : param.key === 'temperature' ? 2 : 100)"
                  :step="param.key === 'temperature' ? 0.1 : 1"
                  :disabled="isGenerating"
                  class="w-full"
                />
              </div>

              <!-- 开关 -->
              <div v-else-if="renderParameterControl(param) === 'switch'" class="flex items-center space-x-2">
                <Switch
                  :id="param.key"
                  :checked="getParameterValue(param)"
                  @update:checked="updateParameter(param.key, $event)"
                  :disabled="isGenerating"
                />
                <Label :for="param.key" class="text-sm">
                  {{ getParameterValue(param) ? '开启' : '关闭' }}
                </Label>
              </div>

              <!-- 枚举参数按钮组 -->
              <div
                v-else-if="renderParameterControl(param) === 'button-group'"
                class="flex flex-wrap gap-2"
              >
                <Button
                  v-for="(option, optionIndex) in param.options"
                  :key="optionIndex"
                  size="sm"
                  type="button"
                  :variant="getParameterValue(param) === option ? 'default' : 'outline'"
                  @click="updateParameter(param.key, option)"
                  :disabled="isGenerating"
                >
                  {{ option }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 生成按钮 -->
        <div class="flex gap-3">
          <Button 
            @click="handleGenerate" 
            :disabled="
              isGenerating ||
              (requiresPrompt && !prompt.trim()) ||
              (requiresImage && uploadedImages.length === 0)
            "
            class="flex-1"
            size="lg"
          >
            <Loader2 v-if="isGenerating" class="mr-2 h-4 w-4 animate-spin" />
            {{ isGenerating ? '生成中...' : '开始生成' }}
          </Button>
          
          <Button 
            v-if="generationResult" 
            @click="clearResult" 
            variant="outline"
            :disabled="isGenerating"
            size="lg"
          >
            清除结果
          </Button>
        </div>
      </div>

      <!-- 右侧：结果展示区 -->
      <div class="space-y-6">
        <!-- 生成结果 -->
        <Card v-if="generationResult" class="min-h-[400px]">
          <CardHeader>
            <CardTitle>生成结果</CardTitle>
          </CardHeader>
          <CardContent>
            <!-- 成功结果 -->
            <div v-if="generationResult.success" class="space-y-6">
              <!-- 图片对比或单独显示 -->
              <div v-if="upscaledComparisons.length > 0" class="space-y-4">
                <div class="space-y-1">
                  <h3 class="text-lg font-semibold">高清化对比</h3>
                  <p class="text-sm text-muted-foreground">拖动中间的分隔线查看高清前后的差异，可分别下载前后图片。</p>
                </div>
                <div class="space-y-6">
                  <div
                    v-for="(pair, pairIndex) in upscaledComparisons"
                    :key="`upscaled-${pairIndex}`"
                    class="rounded-lg border p-4 bg-card"
                  >
                    <ImageComparison
                      :originalImage="pair.original"
                      :generatedImage="pair.enhanced"
                      @download="handleDownload"
                    />
                  </div>
                </div>
              </div>
              <div v-else-if="generationResult.images && generationResult.images.length > 0">
                <!-- 如果有上传的图片，显示对比效果 -->
                <div v-if="uploadedImages.length > 0 && generationResult.images.length > 0">
                  <ImageComparison
                    :originalImage="uploadedImages[0].url"
                    :generatedImage="generationResult.images[0].url"
                    @download="handleDownload"
                  />
                </div>
                <!-- 如果没有上传图片，只显示生成的图片 -->
                <div v-else class="space-y-4">
                  <div 
                    v-for="(image, index) in generationResult.images" 
                    :key="index"
                    class="relative group"
                  >
                    <div class="w-full max-w-2xl mx-auto bg-muted rounded-lg border overflow-hidden flex items-center justify-center min-h-[300px]">
                      <img 
                        :src="image.url" 
                        :alt="`生成的图像 ${index + 1}`"
                        class="max-w-full max-h-full object-contain shadow-md"
                        loading="lazy"
                      />
                    </div>
                    <!-- 高清化按钮 -->
                    <Button
                      v-if="hasUpscaleModel"
                      @click="handleUpscale(image.url, index)"
                      class="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md shadow-primary/40 hover:-translate-y-0.5"
                      size="sm"
                      variant="default"
                      :disabled="isUpscaling(index)"
                    >
                      <Loader2 v-if="isUpscaling(index)" class="h-4 w-4 mr-1 animate-spin" />
                      <span v-else class="flex items-center gap-1">
                        <Wand2 class="h-4 w-4" />
                        图片高清化
                      </span>
                    </Button>

                    <!-- 下载按钮 -->
                    <Button
                      @click="handleDownload(image.url, `generated-image-${index + 1}.png`)"
                      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      size="sm"
                      variant="secondary"
                    >
                      <Download class="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 错误结果 -->
            <div v-else class="space-y-3">
              <Label class="text-base font-semibold text-destructive">生成失败</Label>
              <div class="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <div class="text-sm">{{ generationResult.error }}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 空状态 -->
        <Card v-else class="min-h-[400px] flex items-center justify-center">
          <div class="text-center text-muted-foreground">
            <ImageIcon class="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p class="text-lg font-medium mb-2">等待生成</p>
            <p class="text-sm">输入提示词并点击生成按钮开始</p>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
