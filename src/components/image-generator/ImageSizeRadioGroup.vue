<script setup lang="ts">
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { computed } from 'vue';

// 导入 SVG 图标
import imageSize11 from "@/assets/images/paintings/image-size-1-1.svg";
import imageSize12 from "@/assets/images/paintings/image-size-1-2.svg";
import imageSize32 from "@/assets/images/paintings/image-size-3-2.svg";
import imageSize34 from "@/assets/images/paintings/image-size-3-4.svg";
import imageSize169 from "@/assets/images/paintings/image-size-16-9.svg";
import imageSize916 from "@/assets/images/paintings/image-size-9-16.svg";

// SVG 图标映射
const svgMap: Record<string, string> = {
  'image-size-1-1': imageSize11,
  'image-size-1-2': imageSize12,
  'image-size-3-2': imageSize32,
  'image-size-3-4': imageSize34,
  'image-size-16-9': imageSize169,
  'image-size-9-16': imageSize916,
};

const props = defineProps<{
  value: string;
  options: unknown[];
  paramKey: string;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
}>();

// 图像尺寸选项映射
const sizeOptions = computed(() => {
  return props.options.map(optionValue => {
    // 将 unknown 类型转换为字符串
    const option = String(optionValue);

    // 获取比例值
    let ratio = '';
    let svgName = '';
    let isHD = false;

    if (option.includes('square_hd')) {
      ratio = '1:1';
      svgName = 'image-size-1-1';
      isHD = true;
    } else if (option.includes('square')) {
      ratio = '1:1';
      svgName = 'image-size-1-1';
    } else if (option.includes('portrait_4_3')) {
      ratio = '3:4';
      svgName = 'image-size-3-4';
    } else if (option.includes('portrait_16_9')) {
      ratio = '9:16';
      svgName = 'image-size-9-16';
    } else if (option.includes('landscape_4_3')) {
      ratio = '4:3';
      svgName = 'image-size-3-4'; // 反过来使用
    } else if (option.includes('landscape_16_9')) {
      ratio = '16:9';
      svgName = 'image-size-16-9';
    } else if (option === '21:9') {
      ratio = '21:9';
      svgName = 'image-size-16-9'; // 使用类似的
    } else if (option === '16:9') {
      ratio = '16:9';
      svgName = 'image-size-16-9';
    } else if (option === '4:3') {
      ratio = '4:3';
      svgName = 'image-size-3-2'; // 使用类似的
    } else if (option === '1:1') {
      ratio = '1:1';
      svgName = 'image-size-1-1';
    } else if (option === '3:4') {
      ratio = '3:4';
      svgName = 'image-size-3-4';
    } else if (option === '9:16') {
      ratio = '9:16';
      svgName = 'image-size-9-16';
    } else if (option === '9:21') {
      ratio = '9:21';
      svgName = 'image-size-9-16'; // 使用类似的
    } else if (option === '1:2') {
      ratio = '1:2';
      svgName = 'image-size-1-2';
    } else if (option === '3:2') {
      ratio = '3:2';
      svgName = 'image-size-3-2';
    }

    return {
      value: option,
      ratio,
      svgName,
      isHD
    };
  });
});

const handleChange = (value: string) => {
  console.log('RadioGroup value changed:', value);
  emit('update:value', value);
};
</script>

<template>
  <div class="space-y-2 w-full">
    <Label>图片尺寸</Label>
    <div class="rounded-md border border-input overflow-hidden bg-background">
      <RadioGroup :value="value" @update:value="handleChange" class="flex !gap-0">
        <div v-for="option in sizeOptions" :key="option.value" class="flex-1 relative">
          <RadioGroupItem :value="option.value" :id="`size-${option.value}`" class="peer sr-only" />
          <Label
            :for="`size-${option.value}`"
            class="flex flex-col items-center justify-center h-full py-2 px-1 border-r border-input last:border-r-0 bg-muted/10 hover:bg-muted/20 relative cursor-pointer"
            :class="{ 'bg-muted/20': value === option.value }"
            @click="handleChange(option.value)"
          >
            <div
              class="absolute inset-0 border-2 border-black opacity-0 pointer-events-none z-10"
              :class="{
                'opacity-100': value === option.value,
                'rounded-l-md': value === option.value && option.value === sizeOptions[0].value,
                'rounded-r-md': value === option.value && option.value === sizeOptions[sizeOptions.length - 1].value
              }"
              aria-hidden="true"
            ></div>
            <img :src="svgMap[option.svgName]" :alt="`${option.ratio} aspect ratio`" class="h-6 w-6 mb-1" />
            <span class="text-xs whitespace-nowrap">{{ option.ratio }}{{ option.isHD ? ' HD' : '' }}</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  </div>
</template>
