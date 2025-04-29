<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ImageGenerator from "@/components/ImageGenerator.vue";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getModelById } from "@/router/models";
import type { Model } from "@/types/flux";

const props = defineProps<{
  modelId?: string;
}>();

const route = useRoute();
const router = useRouter();

// 优先使用props中的modelId，如果没有则使用路由参数
const modelId = computed(() => props.modelId || route.params.modelId as string);

// 从模型库中获取模型
const model = computed<Model | null>(() => {
  // 如果路由元数据中已经有模型信息，直接使用
  if (route.meta.model) {
    return route.meta.model as Model;
  }

  // 否则通过ID查找模型
  const foundModel = getModelById(modelId.value);

  if (!foundModel) {
    // 如果找不到模型，重定向到模型列表页
    router.push('/models');
    return null;
  }

  return foundModel;
});
</script>

<template>
  <ScrollArea class="h-[calc(100vh-4rem)] w-full">
    <main v-if="model" class="container mx-auto py-8 px-4">
    <div class="flex flex-col items-center space-y-8">
      <h1 class="text-4xl font-bold text-center">{{ model.name }}</h1>
      <p class="text-muted-foreground text-center max-w-2xl">
        使用 {{ model.name }} 生成图像
      </p>
      <ImageGenerator :model="model" />
    </div>
  </main>
  </ScrollArea>
</template>
