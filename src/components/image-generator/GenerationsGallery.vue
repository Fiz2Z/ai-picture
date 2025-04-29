<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Generation } from "@/types/flux";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Download, Search } from "lucide-vue-next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  generations: Generation[];
}>();

// 状态
const searchQuery = ref('');
const selectedModel = ref<string>('all');
const lightboxOpen = ref(false);
const currentImageIndex = ref(0);
const currentGeneration = ref<Generation | null>(null);
const isNSFW = ref(false);

// 计算属性
const filteredGenerations = computed(() => {
  return props.generations.filter(gen => {
    const matchesSearch = searchQuery.value === '' ||
      gen.prompt.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesModel = selectedModel.value === 'all' || gen.modelId === selectedModel.value;
    return matchesSearch && matchesModel;
  });
});

const uniqueModels = computed(() => {
  const models = new Set(props.generations.map(gen => gen.modelId));
  return Array.from(models);
});

// 方法
const openLightbox = (generation: Generation, imageIndex: number = 0) => {
  currentGeneration.value = generation;
  currentImageIndex.value = imageIndex;
  isNSFW.value = generation.output.has_nsfw_concepts?.[imageIndex] || false;
  lightboxOpen.value = true;
};

const closeLightbox = () => {
  lightboxOpen.value = false;
};

const downloadImage = (url: string) => {
  window.open(url, '_blank');
};

const formatDate = (timestamp: number) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: zhCN });
};

const hasNextImage = computed(() => {
  if (!currentGeneration.value) return false;
  return currentImageIndex.value < currentGeneration.value.output.images.length - 1;
});

const hasPreviousImage = computed(() => {
  return currentImageIndex.value > 0;
});

const nextImage = () => {
  if (hasNextImage.value) {
    currentImageIndex.value++;
    if (currentGeneration.value) {
      isNSFW.value = currentGeneration.value.output.has_nsfw_concepts?.[currentImageIndex.value] || false;
    }
  }
};

const previousImage = () => {
  if (hasPreviousImage.value) {
    currentImageIndex.value--;
    if (currentGeneration.value) {
      isNSFW.value = currentGeneration.value.output.has_nsfw_concepts?.[currentImageIndex.value] || false;
    }
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row justify-between gap-4">
      <h2 class="text-2xl font-bold">生成历史</h2>
      <div class="flex flex-col sm:flex-row gap-2">
        <div class="relative">
          <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索提示词..."
            class="pl-8 h-9"
          />
        </div>
        <Select v-model="selectedModel">
          <SelectTrigger class="w-[180px] h-9">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有模型</SelectItem>
            <SelectItem v-for="model in uniqueModels" :key="model" :value="model">
              {{ model.split('/').pop() }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Card v-if="filteredGenerations.length > 0">
      <CardContent class="p-0">
        <ScrollArea class="h-[500px]">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            <div
              v-for="generation in filteredGenerations"
              :key="generation.id"
              class="group relative overflow-hidden rounded-lg border cursor-pointer"
              @click="openLightbox(generation)"
            >
              <div class="aspect-square overflow-hidden">
                <img
                  :src="generation.output.images[0].url"
                  :alt="generation.prompt"
                  class="h-full w-full object-cover transition-all group-hover:scale-105"
                />
              </div>
              <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div>
                  <p class="text-white text-sm line-clamp-3">{{ generation.prompt }}</p>
                </div>
                <div class="flex justify-between items-center">
                  <Badge variant="outline" class="bg-black/50 text-white border-white/20">
                    {{ formatDate(generation.timestamp) }}
                  </Badge>
                  <div class="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      class="h-7 w-7 bg-black/50 border-white/20"
                      @click.stop="downloadImage(generation.output.images[0].url)"
                    >
                      <Download class="h-3.5 w-3.5 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>

    <div v-else class="text-center py-8">
      <p class="text-muted-foreground">没有找到生成历史</p>
    </div>

    <!-- Lightbox Dialog -->
    <Dialog v-model:open="lightboxOpen" @update:open="closeLightbox">
      <DialogContent class="max-w-screen-lg w-full h-[90vh] p-0 gap-0 overflow-hidden">
        <div class="relative h-full flex flex-col overflow-hidden">
          <!-- Top Bar -->
          <div class="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div class="flex items-center gap-4">
              <div v-if="currentGeneration" class="flex items-center gap-2">
                <Switch
                  id="nsfw-gallery"
                  v-model="isNSFW"
                />
                <Label for="nsfw-gallery" class="text-white">NSFW</Label>
              </div>
            </div>
            <Button variant="ghost" size="icon" class="text-white" @click="closeLightbox">
              <X class="h-5 w-5" />
            </Button>
          </div>

          <!-- Image Display -->
          <div class="flex-1 flex items-center justify-center bg-black/90 overflow-hidden">
            <img
              v-if="currentGeneration && currentGeneration.output.images[currentImageIndex]"
              :src="currentGeneration.output.images[currentImageIndex].url"
              :alt="currentGeneration.prompt"
              class="max-h-full max-w-full object-contain p-4"
            />
          </div>

          <!-- Bottom Bar -->
          <div class="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div class="flex justify-between items-center">
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="bg-black/30 border-white/20 text-white"
                  :disabled="!hasPreviousImage"
                  @click="previousImage"
                >
                  上一张
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="bg-black/30 border-white/20 text-white"
                  :disabled="!hasNextImage"
                  @click="nextImage"
                >
                  下一张
                </Button>
              </div>
              <div class="flex gap-2">
                <Button
                  v-if="currentGeneration"
                  variant="outline"
                  size="sm"
                  class="bg-black/30 border-white/20 text-white"
                  @click="downloadImage(currentGeneration.output.images[currentImageIndex].url)"
                >
                  <Download class="h-4 w-4 mr-2" />
                  下载
                </Button>
              </div>
            </div>
            <div v-if="currentGeneration" class="mt-2">
              <p class="text-white text-sm">{{ currentGeneration.prompt }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" class="bg-black/30 border-white/20 text-white">
                  种子: {{ currentGeneration.output.seed }}
                </Badge>
                <Badge variant="outline" class="bg-black/30 border-white/20 text-white">
                  {{ currentGeneration.modelName }}
                </Badge>
                <Badge variant="outline" class="bg-black/30 border-white/20 text-white">
                  {{ formatDate(currentGeneration.timestamp) }}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
