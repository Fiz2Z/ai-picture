<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, ChevronRight, Maximize } from "lucide-vue-next"; // 导入 Maximize 图标
import { Skeleton } from "@/components/ui/skeleton";
import type { Image } from "@/types/flux";

const props = defineProps<{
  result: Image[] | null;
  isGenerating: boolean;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'upscale-image', imageUrl: string): void; // 新增超分事件
}>();

// 监听结果变化，重置当前索引
watch(() => props.result, (newResult) => {
  if (newResult) {
    currentIndex.value = 0;
    isImageLoading.value = false;
  }
}, { deep: true });

// 当前显示的图片索引
const currentIndex = ref(0);

// 图片加载状态
const isImageLoading = ref(false);

// 计算当前显示的图片
const currentImage = computed(() => {
  if (!props.result || props.result.length === 0) return null;
  // 确保索引在有效范围内
  if (currentIndex.value >= props.result.length) {
    currentIndex.value = props.result.length - 1;
  }
  if (currentIndex.value < 0) {
     currentIndex.value = 0;
  }
  return props.result[currentIndex.value];
});

// 计算是否有上一张图片
const hasPrevious = computed(() => {
  return !!props.result && currentIndex.value > 0;
});

// 计算是否有下一张图片
const hasNext = computed(() => {
  return !!props.result && currentIndex.value < props.result.length - 1;
});

// 监听当前图片索引变化
watch(currentIndex, () => {
  isImageLoading.value = true;
});

// 图片加载完成事件
const handleImageLoaded = () => {
  isImageLoading.value = false;
};

// 显示上一张图片
const showPrevious = () => {
  if (hasPrevious.value && !isImageLoading.value) {
    currentIndex.value--;
  }
};

// 显示下一张图片
const showNext = () => {
  if (hasNext.value && !isImageLoading.value) {
    currentIndex.value++;
  }
};

// 直接选择特定图片
const selectImage = (index: number) => {
  if (index !== currentIndex.value) {
    currentIndex.value = index;
  }
};

// 打开图片
const openImage = (url: string) => {
  window.open(url, '_blank');
};
</script>

<template>
  <Card class="h-full relative">
    <!-- 图片索引指示器和下载按钮放在卡片右上角 -->
    <div class="absolute top-2 right-2 z-30 flex items-center gap-2">
      <div v-if="result && result.length > 1" class="text-sm text-muted-foreground">
        {{ currentIndex + 1 }} / {{ result.length }}
      </div>
       <!-- 新增：超分按钮 -->
       <!-- 修改：超分按钮显示文字 -->
       <Button
         v-if="currentImage"
         variant="outline"
         size="sm"  
         @click.stop="currentImage && emit('upscale-image', currentImage.url)"
         title="提升图像清晰度 (超分)"
         class="gap-1" 
       >
         <Maximize class="h-4 w-4" /> 
         <span>4x超分</span> 
       </Button>
         <Button
        v-if="currentImage"
        variant="outline"
        size="icon"
        @click.stop="currentImage && openImage(currentImage.url)"
        title="下载图像"
        class="h-9 w-9"
      >
        <Download class="h-4 w-4" />
      </Button>
    </div>

    <CardHeader class="flex flex-col space-y-2">
      <div class="flex flex-row items-center">
        <div>
          <CardTitle>生成的图像</CardTitle>
          <CardDescription>您的AI生成的艺术作品将显示在这里</CardDescription>
        </div>
      </div>

      <!-- 缩略图预览行 -->
      <div v-if="result && result.length > 1" class="flex gap-2 overflow-x-auto py-1 px-1 -mx-1 justify-center">
        <div
          v-for="(image, index) in result"
          :key="index"
          class="relative flex-shrink-0 cursor-pointer rounded-md overflow-hidden transition-all"
          :class="{
            'ring-2 ring-primary': index === currentIndex,
            'opacity-70 hover:opacity-100': index !== currentIndex
          }"
          style="height: 50px;"
          :style="{
            width: image.width && image.height ? `${Math.round(50 * (image.width / image.height))}px` : '50px',
            height: '50px'
          }"
          @click="selectImage(index)"
        >
          <img
            :src="image.url"
            :alt="`缩略图 ${index + 1}`"
            class="h-full w-full object-contain"
          />
          <div
            class="absolute inset-0 flex items-center justify-center bg-background/40 text-xs font-medium"
            :class="{ 'hidden': index !== currentIndex }"
          >
            {{ index + 1 }}
          </div>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <!-- 生成中的骨架屏 -->
      <div v-if="isGenerating" class="relative h-[469px] rounded-lg overflow-hidden">
        <Skeleton class="absolute inset-0 h-full w-full" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mb-2"></div>
            <p class="text-muted-foreground">正在生成图像...</p>
          </div>
        </div>
      </div>
      <!-- 已生成的图像 -->
      <div v-else-if="currentImage" class="relative rounded-lg overflow-hidden flex justify-center items-center" style="min-height: 469px;">
        <!-- 加载中的骨架屏 -->
        <Skeleton v-if="isImageLoading" class="absolute inset-0 h-full w-full z-10" />

        <div
          class="relative max-h-[781px] max-w-full"
          :style="{
            width: currentImage.width ? `${currentImage.width}px` : 'auto',
            height: currentImage.height ? `${currentImage.height}px` : 'auto',
            maxWidth: '100%',
            maxHeight: '781px'
          }"
        >
          <img
            :src="currentImage.url"
            alt="生成的图像"
            :width="currentImage.width"
            :height="currentImage.height"
            class="rounded-lg w-full h-full object-contain"
            @load="handleImageLoaded"
            :class="{ 'opacity-0': isImageLoading }"
          />
        </div>

        <!-- 导航按钮 -->
        <div v-if="result && result.length > 1" class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-20">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
            :disabled="!hasPrevious || isImageLoading"
            @click="showPrevious"
            title="上一张"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
            :disabled="!hasNext || isImageLoading"
            @click="showNext"
            title="下一张"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- 未生成状态 -->
      <div v-else class="flex items-center justify-center h-[469px] bg-muted rounded-lg">
        <p class="text-muted-foreground">尚未生成图像</p>
      </div>
    </CardContent>
  </Card>
</template>