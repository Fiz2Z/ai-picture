<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Card, CardContent } from "@/components/ui/card"; // 移除未使用的 CardHeader, CardTitle, CardDescription
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Trash2, Maximize } from "lucide-vue-next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from 'date-fns/locale';
import { toast } from 'vue-sonner';
import { fetchSuperscaleRecords, deleteSuperscaleRecord } from '@/services/superscale-history'; // 导入新的服务函数
import type { SuperscaledImage } from '@/types/flux'; // 导入类型

const superscaledImages = ref<SuperscaledImage[]>([]);
const searchQuery = ref('');
const lightboxOpen = ref(false);
const currentLightboxImage = ref<SuperscaledImage | null>(null);
const isLoading = ref(false); // 添加 isLoading 状态

onMounted(async () => {
  isLoading.value = true;
  try {
    superscaledImages.value = await fetchSuperscaleRecords();
    // fetchSuperscaleRecords 内部已经排序
  } catch (error) {
    console.error('加载超分图片失败:', error);
    toast.error('加载超分图片失败');
    superscaledImages.value = [];
  } finally {
     isLoading.value = false;
  }
});

const filteredImages = computed(() => {
  if (!searchQuery.value) {
    return superscaledImages.value;
  }
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return superscaledImages.value.filter(img =>
    img.id.toLowerCase().includes(lowerCaseQuery) ||
    img.originalImageUrl.toLowerCase().includes(lowerCaseQuery) ||
    img.superscaledImageUrl.toLowerCase().includes(lowerCaseQuery) ||
    (img.checkpoint && img.checkpoint.toLowerCase().includes(lowerCaseQuery))
  );
});

const openLightbox = (image: SuperscaledImage) => {
  currentLightboxImage.value = image;
  lightboxOpen.value = true;
};

const closeLightbox = () => {
  lightboxOpen.value = false;
  currentLightboxImage.value = null;
};

const downloadImage = (url: string) => {
  window.open(url, '_blank');
};

const deleteImage = async (id: string) => {
    const confirmed = window.confirm("确定要删除这张超分图片记录吗？");
    if (!confirmed) {
        return;
    }

    const imageToDelete = superscaledImages.value.find(img => img.id === id);
    if (!imageToDelete) return;

    const originalIndex = superscaledImages.value.findIndex(img => img.id === id);
    if (originalIndex !== -1) {
        superscaledImages.value.splice(originalIndex, 1); // Optimistic UI update
    }

    const deleteResult = await deleteSuperscaleRecord(id);

    if (deleteResult.success) {
        toast.success('图片记录已从数据库删除');
    } else {
        console.error('从 Supabase 删除图片失败:', deleteResult.error);
        toast.error('删除图片失败，请稍后再试。');
        // Revert UI update if deletion failed
        if (originalIndex !== -1 && imageToDelete) {
           superscaledImages.value.splice(originalIndex, 0, imageToDelete);
        }
    }
};

const formatDate = (timestamp: number) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: zhCN });
};
</script>

<template>
  <ScrollArea class="h-[calc(100vh-4rem)] w-full">
    <main class="container mx-auto py-8 px-4">
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 class="text-2xl sm:text-3xl font-bold">超分图片列表</h1>
          <div class="relative w-full sm:w-auto">
            <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="搜索图片..."
              class="pl-8 h-9 w-full sm:w-[250px]"
            />
          </div>
        </div>

        <div v-if="isLoading" class="text-center py-16">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mb-4"></div>
          <p class="text-muted-foreground">正在加载超分图片...</p>
        </div>

        <Card v-else-if="!isLoading && filteredImages.length > 0">
          <CardContent class="p-0">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
              <div
                v-for="image in filteredImages"
                :key="image.id"
                class="group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md"
              >
                <div class="aspect-square overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    :src="image.superscaledImageUrl"
                    alt="Superscaled image"
                    loading="lazy" 
                    class="h-full w-full object-contain transition-transform group-hover:scale-105"
                  />
                </div>
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div class="flex justify-between items-end">
                    <div class="text-xs text-white space-y-1">
                      <Badge variant="secondary" class="text-[10px] px-1.5 py-0.5">
                        {{ formatDate(image.timestamp) }}
                      </Badge>
                      <div v-if="image.checkpoint" class="flex items-center gap-1">
                        <span>Checkpoint:</span>
                        <Badge variant="outline" class="text-[10px] px-1.5 py-0.5 border-white/50 text-white bg-black/30">{{ image.checkpoint }}</Badge>
                      </div>
                      <div v-if="image.overlappingTiles !== undefined" class="flex items-center gap-1">
                         <span>重叠块:</span>
                         <Badge variant="outline" class="text-[10px] px-1.5 py-0.5 border-white/50 text-white bg-black/30">{{ image.overlappingTiles ? '是' : '否' }}</Badge>
                      </div>
                       <div v-if="image.originalWidth && image.originalHeight && image.upscaledWidth && image.upscaledHeight" class="text-[10px]">
                         {{image.originalWidth}}x{{image.originalHeight}} -> {{image.upscaledWidth}}x{{image.upscaledHeight}}
                       </div>
                    </div>
                    <div class="flex flex-col items-end gap-1.5">
                       <Button
                         variant="outline"
                         size="icon"
                         class="h-7 w-7 bg-black/50 border-white/30 text-white hover:bg-black/70"
                         title="放大查看"
                         @click.stop="openLightbox(image)"
                       >
                         <Maximize class="h-3.5 w-3.5" />
                       </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        class="h-7 w-7 bg-black/50 border-white/30 text-white hover:bg-black/70"
                        title="下载超分图片"
                        @click.stop="downloadImage(image.superscaledImageUrl)"
                      >
                        <Download class="h-3.5 w-3.5" />
                      </Button>
                       <Button
                        variant="destructive"
                        size="icon"
                        class="h-7 w-7 bg-red-600/70 border-red-400/50 text-white hover:bg-red-600"
                        title="删除记录"
                        @click.stop="deleteImage(image.id)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div v-else-if="!isLoading && filteredImages.length === 0" class="text-center py-16">
          <p class="text-muted-foreground">还没有超分图片</p>
          <p class="text-sm text-muted-foreground mt-1">请先在生成历史或其他地方对图片进行超分操作</p>
        </div>
      </div>
    </main>

    <Dialog v-model:open="lightboxOpen" @update:open="closeLightbox">
      <DialogContent class="max-w-screen-xl w-[95vw] h-[90vh] p-2 sm:p-4 gap-0 overflow-hidden flex flex-col">
        <DialogHeader class="flex-shrink-0">
           <DialogTitle class="text-center truncate">
             {{ currentLightboxImage ? `超分图片预览 (来自 ${currentLightboxImage.originalImageUrl.split('/').pop()})` : '图片预览' }}
           </DialogTitle>
        </DialogHeader>
        <div class="flex-1 flex items-center justify-center bg-muted/50 rounded-md overflow-hidden min-h-0">
          <img
            v-if="currentLightboxImage"
            :src="currentLightboxImage.superscaledImageUrl"
            alt="Superscaled image"
            class="max-h-full max-w-full object-contain"
          />
        </div>
        <div class="flex justify-center gap-2 mt-2 flex-shrink-0">
           <Button
             v-if="currentLightboxImage"
             variant="default"
             @click="downloadImage(currentLightboxImage.superscaledImageUrl)"
           >
             <Download class="h-4 w-4 mr-2" />
             下载图片
           </Button>
          <Button variant="outline" @click="closeLightbox">关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  </ScrollArea>
</template>