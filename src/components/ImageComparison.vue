<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Button } from '@/components/ui/button';
import { Download, Move } from 'lucide-vue-next';

const props = defineProps<{
  originalImage: string;
  generatedImage: string;
}>();

const emit = defineEmits<{
  download: [url: string, filename: string];
}>();

const containerRef = ref<HTMLDivElement>();
const sliderPosition = ref(50); // 滑块位置百分比
const isDragging = ref(false);

// 处理鼠标/触摸事件
const handleStart = (event: MouseEvent | TouchEvent) => {
  isDragging.value = true;
  updatePosition(event);
  
  // 防止默认行为和事件冒泡
  event.preventDefault();
  event.stopPropagation();
};

const handleMove = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;
  updatePosition(event);
  event.preventDefault();
};

const handleEnd = () => {
  isDragging.value = false;
};

// 更新滑块位置
const updatePosition = (event: MouseEvent | TouchEvent) => {
  if (!containerRef.value) return;
  
  const rect = containerRef.value.getBoundingClientRect();
  let clientX: number;
  
  if (event instanceof MouseEvent) {
    clientX = event.clientX;
  } else {
    clientX = event.touches[0].clientX;
  }
  
  const x = clientX - rect.left;
  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
  sliderPosition.value = percentage;
};

// 下载原图
const downloadOriginal = () => {
  emit('download', props.originalImage, 'original-image.png');
};

// 下载生成图
const downloadGenerated = () => {
  emit('download', props.generatedImage, 'generated-image.png');
};

// 添加全局事件监听器
onMounted(() => {
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('touchend', handleEnd);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMove);
  document.removeEventListener('mouseup', handleEnd);
  document.removeEventListener('touchmove', handleMove);
  document.removeEventListener('touchend', handleEnd);
});
</script>

<template>
  <div class="space-y-4">
    <!-- 对比容器 -->
    <div
      ref="containerRef"
      class="relative w-full max-w-2xl mx-auto overflow-hidden rounded-lg shadow-lg border bg-muted cursor-col-resize select-none"
      style="aspect-ratio: 4/3; min-height: 300px;"
      @mousedown="handleStart"
      @touchstart="handleStart"
    >
      <!-- 生成的图片 (背景) -->
      <img
        :src="generatedImage"
        alt="生成的图片"
        class="absolute inset-0 w-full h-full object-contain"
        draggable="false"
      />
      
      <!-- 原始图片 (前景，通过clip-path裁剪) -->
      <img
        :src="originalImage"
        alt="原始图片"
        class="absolute inset-0 w-full h-full object-contain"
        :style="{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }"
        draggable="false"
      />
      
      <!-- 分割线 -->
      <div
        class="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 flex items-center justify-center"
        :style="{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }"
      >
        <!-- 拖拽手柄 -->
        <div class="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-col-resize hover:bg-gray-50 transition-colors">
          <Move class="w-4 h-4 text-gray-600" />
        </div>
      </div>
      
      <!-- 标签 -->
      <div class="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
        原图
      </div>
      <div class="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
        生成图
      </div>
    </div>
    
    <!-- 下载按钮 -->
    <div class="flex flex-wrap gap-2 justify-center">
      <Button
        @click="downloadOriginal"
        variant="outline"
        size="sm"
        class="flex items-center gap-2"
      >
        <Download class="w-4 h-4" />
        下载原图
      </Button>
      <Button
        @click="downloadGenerated"
        variant="outline"
        size="sm"
        class="flex items-center gap-2"
      >
        <Download class="w-4 h-4" />
        下载生成图
      </Button>
    </div>
    
    <!-- 使用说明 -->
    <div class="text-center text-sm text-muted-foreground">
      <p>拖动中间的分割线来对比原图和生成图的效果</p>
    </div>
  </div>
</template>

<style scoped>
/* 确保在移动端也能正常拖拽 */
.cursor-col-resize {
  cursor: col-resize;
}

/* 移动端触摸优化 */
@media (pointer: coarse) {
  .cursor-col-resize {
    cursor: grab;
  }
  
  .cursor-col-resize:active {
    cursor: grabbing;
  }
}

/* 防止图片被选中 */
img {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
