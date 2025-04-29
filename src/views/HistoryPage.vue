<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { Generation } from "@/types/flux";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, Trash2, X, Calendar, Image as ImageIcon, Clock, User, Users, Check, Loader2, ChevronLeft, ChevronRight, Share2, Copy, Expand } from "lucide-vue-next";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from 'date-fns/locale';
import { fetchGenerations, deleteGeneration, clearAllGenerations } from "@/services/generation-history";
// import { isCurrentUserRecord } from "@/lib/supabase";

// 状态
const generations = ref<Generation[]>([]);
const searchQuery = ref('');
const selectedModel = ref<string>('all');
const selectedTab = ref('grid');
const lightboxOpen = ref(false);
const currentImageIndex = ref(0);
const currentGeneration = ref<Generation | null>(null);
const isNSFW = ref(false);
const isDeleting = ref(false);
const selectedGenerations = ref<Set<string>>(new Set());
const sortOrder = ref<'newest' | 'oldest'>('newest');
const isLoading = ref(false);
const showOnlyMine = ref(true);
const isPromptExpanded = ref(false);
const isCopied = ref(false);

// Lightbox 图片加载状态
const isLightboxImageLoading = ref(false);
const lightboxImageSize = ref(0);

// 分页相关状态
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value));

// 跳转到指定页相关状态
const goToPageInput = ref('');
const isValidPageInput = computed(() => {
  if (goToPageInput.value === '') return false;
  const pageNum = Number(goToPageInput.value);
  return !isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages.value;
});

// 图片加载状态
const loadingImages = ref<Set<string>>(new Set());
const imageMetadata = ref<Map<string, { size: number, priority: number }>>(new Map());

// 图片加载完成
const imageLoaded = (id: string) => {
  loadingImages.value.delete(id);
};

// 图片开始加载
const imageLoading = (id: string) => {
  loadingImages.value.add(id);
};

// 检查图片是否正在加载
const isImageLoading = (id: string) => loadingImages.value.has(id);

// 不再使用 HEAD 请求获取图片大小，改为使用懒加载和 IntersectionObserver

// 在生成历史加载后初始化图片加载状态
const initImageLoadingState = () => {
  loadingImages.value.clear();
  imageMetadata.value.clear();

  // 初始化所有图片的加载状态
  generations.value.forEach((gen, index) => {
    if (gen.output.images[0].url) {
      // 使用索引作为优先级，这样图片将按照它们在列表中的顺序加载
      imageMetadata.value.set(gen.id, {
        size: 0,
        priority: index
      });
    }
  });

  console.log('图片加载状态初始化完成');
};

// 响应式设计
const isMobile = ref(false);

// 检测设备类型
onMounted(() => {
  checkDeviceType();
  window.addEventListener('resize', checkDeviceType);
});

function checkDeviceType() {
  isMobile.value = window.innerWidth < 768;
}

// 加载生成历史
onMounted(async () => {
  await loadGenerations();
});

// 监听筛选条件变化，重新加载生成历史
watch([showOnlyMine, currentPage, sortOrder, searchQuery, selectedModel], async (newValues, oldValues) => {
  // 如果是搜索条件变化，重置到第一页
  if (newValues[0] !== oldValues[0] || newValues[2] !== oldValues[2] || newValues[3] !== oldValues[3] || newValues[4] !== oldValues[4]) {
    currentPage.value = 1;
  }
  await loadGenerations();
});

// 加载生成历史
async function loadGenerations() {
  isLoading.value = true;
  loadingImages.value.clear(); // 清空加载状态

  try {
    const result = await fetchGenerations(currentPage.value, pageSize.value, showOnlyMine.value);
    generations.value = result.generations;
    totalItems.value = result.total;

    // 初始化图片加载状态
    initImageLoadingState();

    // 标记所有图片为加载中
    generations.value.forEach(gen => {
      if (gen.output.images[0].url) {
        imageLoading(gen.id);
      }
    });
  } catch (error) {
    console.error('加载生成历史失败:', error);
  } finally {
    isLoading.value = false;
  }
}

// 切换页码
function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}

// 跳转到指定页
function goToPage() {
  if (!isValidPageInput.value) return;

  const pageNum = Number(goToPageInput.value);
  changePage(pageNum);

  // 清空输入框
  goToPageInput.value = '';
}

// 计算属性
const filteredGenerations = computed(() => {
  let filtered = generations.value.filter(gen => {
    const matchesSearch = searchQuery.value === '' ||
      gen.prompt.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesModel = selectedModel.value === 'all' || gen.modelId === selectedModel.value;
    return matchesSearch && matchesModel;
  });

  // 排序
  filtered = [...filtered].sort((a, b) => {
    if (sortOrder.value === 'newest') {
      return b.timestamp - a.timestamp;
    } else {
      return a.timestamp - b.timestamp;
    }
  });

  return filtered;
});

const uniqueModels = computed(() => {
  const models = new Set(generations.value.map(gen => gen.modelId));
  return Array.from(models);
});

const isAllSelected = computed(() => {
  return filteredGenerations.value.length > 0 &&
    filteredGenerations.value.every(gen => selectedGenerations.value.has(gen.id));
});

const hasSelected = computed(() => selectedGenerations.value.size > 0);

// 当前图片在列表中的索引
const currentGenerationIndex = computed(() => {
  if (!currentGeneration.value) return -1;
  return filteredGenerations.value.findIndex(gen => gen.id === currentGeneration.value?.id);
});

// 是否有上一张图片
const hasPreviousImage = computed(() => {
  // 如果当前图片有多张图片，先检查是否有上一张图片
  if (currentGeneration.value && currentImageIndex.value > 0) {
    return true;
  }

  // 如果是第一张图片，检查是否有上一个生成记录
  if (currentGenerationIndex.value > 0) {
    return true;
  }

  // 如果当前页是第一页，检查是否有上一页
  return currentPage.value > 1;
});

// 是否有下一张图片
const hasNextImage = computed(() => {
  // 如果当前图片有多张图片，先检查是否有下一张图片
  if (currentGeneration.value && currentImageIndex.value < (currentGeneration.value.output.images.length - 1)) {
    return true;
  }

  // 如果是最后一张图片，检查是否有下一个生成记录
  if (currentGenerationIndex.value < filteredGenerations.value.length - 1) {
    return true;
  }

  // 如果当前页是最后一页，检查是否有下一页
  return currentPage.value < totalPages.value;
});

// 方法
const openLightbox = async (generation: Generation, imageIndex: number = 0) => {
  if (isDeleting.value) return;

  // 设置加载状态
  isLightboxImageLoading.value = true;
  lightboxImageSize.value = 0; // 不再使用大小信息，但保留变量以避免其他代码报错

  currentGeneration.value = generation;
  currentImageIndex.value = imageIndex;
  isNSFW.value = generation.output.has_nsfw_concepts?.[imageIndex] || false;
  lightboxOpen.value = true;
};

// Lightbox 图片加载完成
const lightboxImageLoaded = () => {
  isLightboxImageLoading.value = false;
};

const closeLightbox = () => {
  lightboxOpen.value = false;
};

const downloadImage = (url: string) => {
  window.open(url, '_blank');
};

// 分享图片和提示词
const shareImage = () => {
  if (!currentGeneration.value) return;

  const prompt = currentGeneration.value.prompt;
  const imageUrl = currentGeneration.value.output.images[currentImageIndex.value].url;
  const shareText = `${prompt}\n![Fal.ai](${imageUrl})`;

  // 复制到剪贴板
  navigator.clipboard.writeText(shareText).then(() => {
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  });
};

// 切换提示词展开/收起状态
const togglePromptExpanded = () => {
  isPromptExpanded.value = !isPromptExpanded.value;
};

// 更新NSFW状态
const updateNSFWStatus = (value: boolean) => {
  if (!currentGeneration.value) return;

  // 更新当前图片的NSFW状态
  if (!currentGeneration.value.output.has_nsfw_concepts) {
    currentGeneration.value.output.has_nsfw_concepts = [];
  }

  currentGeneration.value.output.has_nsfw_concepts[currentImageIndex.value] = value;

  // 更新列表中的生成记录
  const index = generations.value.findIndex(gen => gen.id === currentGeneration.value?.id);
  if (index !== -1) {
    if (!generations.value[index].output.has_nsfw_concepts) {
      generations.value[index].output.has_nsfw_concepts = [];
    }
    generations.value[index].output.has_nsfw_concepts[currentImageIndex.value] = value;
  }

  // TODO: 如果需要将更新同步到服务器，可以在这里添加代码
};

const formatDate = (timestamp: number) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: zhCN });
};

const formatFullDate = (timestamp: number) => {
  return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
};

// 不再需要格式化文件大小的函数

const nextImage = async () => {
  if (!hasNextImage.value) return;

  // 设置加载状态
  isLightboxImageLoading.value = true;

  // 如果当前图片有下一张
  if (currentGeneration.value && currentImageIndex.value < (currentGeneration.value.output.images.length - 1)) {
    currentImageIndex.value++;
    if (currentGeneration.value) {
      isNSFW.value = currentGeneration.value.output.has_nsfw_concepts?.[currentImageIndex.value] || false;

      // 不再获取图片大小
      lightboxImageSize.value = 0; // 保留变量以避免其他代码报错
    }
  }
  // 如果是最后一张图片，切换到下一个生成记录
  else if (currentGenerationIndex.value < filteredGenerations.value.length - 1) {
    const nextGeneration = filteredGenerations.value[currentGenerationIndex.value + 1];
    openLightbox(nextGeneration, 0);
  }
  // 如果当前页是最后一页，加载下一页
  else if (currentPage.value < totalPages.value) {
    // 关闭当前 Lightbox
    lightboxOpen.value = false;

    // 加载下一页
    currentPage.value++;
    await loadGenerations();

    // 打开下一页的第一张图片
    if (filteredGenerations.value.length > 0) {
      openLightbox(filteredGenerations.value[0], 0);
    }
  }
};

const previousImage = async () => {
  if (!hasPreviousImage.value) return;

  // 设置加载状态
  isLightboxImageLoading.value = true;

  // 如果当前图片有上一张
  if (currentGeneration.value && currentImageIndex.value > 0) {
    currentImageIndex.value--;
    if (currentGeneration.value) {
      isNSFW.value = currentGeneration.value.output.has_nsfw_concepts?.[currentImageIndex.value] || false;

      // 不再获取图片大小
      lightboxImageSize.value = 0; // 保留变量以避免其他代码报错
    }
  }
  // 如果是第一张图片，切换到上一个生成记录的最后一张图片
  else if (currentGenerationIndex.value > 0) {
    const prevGeneration = filteredGenerations.value[currentGenerationIndex.value - 1];
    const lastImageIndex = prevGeneration.output.images.length - 1;
    openLightbox(prevGeneration, lastImageIndex);
  }
  // 如果当前页是第一页，加载上一页
  else if (currentPage.value > 1) {
    // 关闭当前 Lightbox
    lightboxOpen.value = false;

    // 加载上一页
    currentPage.value--;
    await loadGenerations();

    // 打开上一页的最后一张图片
    if (filteredGenerations.value.length > 0) {
      const lastGeneration = filteredGenerations.value[filteredGenerations.value.length - 1];
      const lastImageIndex = lastGeneration.output.images.length - 1;
      openLightbox(lastGeneration, lastImageIndex);
    }
  }
};

const toggleSelection = (id: string) => {
  if (isDeleting.value) {
    if (selectedGenerations.value.has(id)) {
      selectedGenerations.value.delete(id);
    } else {
      selectedGenerations.value.add(id);
    }
  }
};

const toggleAllSelection = () => {
  if (isAllSelected.value) {
    selectedGenerations.value.clear();
  } else {
    filteredGenerations.value.forEach(gen => {
      selectedGenerations.value.add(gen.id);
    });
  }
};

const toggleDeleteMode = () => {
  isDeleting.value = !isDeleting.value;
  if (!isDeleting.value) {
    selectedGenerations.value.clear();
  }
};

const deleteSelected = async () => {
  if (selectedGenerations.value.size === 0) return;

  isLoading.value = true;
  try {
    // 删除选中的记录
    for (const id of selectedGenerations.value) {
      await deleteGeneration(id);
    }

    // 重新加载生成历史
    await loadGenerations();

    selectedGenerations.value.clear();
    isDeleting.value = false;
  } catch (error) {
    console.error('删除生成记录失败:', error);
  } finally {
    isLoading.value = false;
  }
};

const clearAllHistory = async () => {
  if (confirm('确定要清空所有生成历史吗？此操作不可撤销。')) {
    isLoading.value = true;
    try {
      await clearAllGenerations();
      await loadGenerations();
      selectedGenerations.value.clear();
      isDeleting.value = false;
    } catch (error) {
      console.error('清空生成历史失败:', error);
    } finally {
      isLoading.value = false;
    }
  }
};
</script>

<template>
  <ScrollArea class="h-[calc(100vh-4rem)] w-full">
    <div class="container mx-auto py-8 px-4">
      <div class="flex flex-col space-y-6">
      <!-- 标题和操作栏 -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 class="text-3xl font-bold">生成历史</h1>

        <div class="flex flex-wrap gap-2">
          <Button
            v-if="!isDeleting"
            variant="outline"
            size="sm"
            @click="toggleDeleteMode"
            class="gap-2"
          >
            <Trash2 class="h-4 w-4" />
            选择删除
          </Button>

          <Button
            v-else
            variant="destructive"
            size="sm"
            @click="toggleDeleteMode"
            class="gap-2"
          >
            <X class="h-4 w-4" />
            取消选择
          </Button>

          <Button
            v-if="isDeleting && hasSelected"
            variant="destructive"
            size="sm"
            @click="deleteSelected"
            class="gap-2"
          >
            <Trash2 class="h-4 w-4" />
            删除选中 ({{ selectedGenerations.size }})
          </Button>

          <Button
            v-if="generations.length > 0 && !isDeleting"
            variant="outline"
            size="sm"
            @click="clearAllHistory"
            class="gap-2"
          >
            <Trash2 class="h-4 w-4" />
            清空历史
          </Button>
        </div>
      </div>

      <!-- 筛选和搜索 -->
      <div class="flex flex-col sm:flex-row justify-between gap-4">
        <div class="flex flex-wrap gap-2">
          <div class="w-[200px]">
            <Tabs v-model="selectedTab" class="w-full">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="grid">网格</TabsTrigger>
                <TabsTrigger value="list">列表</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Select v-model="sortOrder">
            <SelectTrigger class="w-[120px]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">最新优先</SelectItem>
              <SelectItem value="oldest">最早优先</SelectItem>
            </SelectContent>
          </Select>

          <!-- 只显示我的记录开关 -->
          <div class="flex items-center space-x-2">
            <Switch id="show-only-mine" v-model="showOnlyMine" />
            <Label for="show-only-mine" class="flex items-center gap-1">
              <User v-if="showOnlyMine" class="h-4 w-4" />
              <Users v-else class="h-4 w-4" />
              <span>只显示我的</span>
            </Label>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <div class="relative">
            <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="搜索提示词..."
              class="pl-8 w-[200px]"
            />
          </div>

          <Select v-model="selectedModel">
            <SelectTrigger class="w-[180px]">
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

      <!-- 网格视图 -->
      <div v-if="selectedTab === 'grid'">
        <!-- 加载中状态 -->
        <div v-if="isLoading" class="space-y-4">
          <div class="flex justify-center items-center py-4">
            <Loader2 class="h-8 w-8 animate-spin text-primary" />
            <span class="ml-2 text-lg">正在加载生成历史...</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div v-for="i in 8" :key="i" class="aspect-square rounded-lg overflow-hidden">
              <Skeleton class="h-full w-full" />
            </div>
          </div>
        </div>

        <!-- 有数据状态 -->
        <Card v-else-if="filteredGenerations.length > 0">
          <CardContent class="p-4">
            <div v-if="isDeleting" class="flex justify-between items-center mb-4">
              <Button
                variant="outline"
                size="sm"
                @click="toggleAllSelection"
                class="gap-2"
              >
                {{ isAllSelected ? '取消全选' : '全选' }}
              </Button>

              <span class="text-sm text-muted-foreground">
                已选择 {{ selectedGenerations.size }} 项
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                v-for="generation in filteredGenerations"
                :key="generation.id"
                class="group relative overflow-hidden rounded-lg border cursor-pointer"
                @click="isDeleting ? toggleSelection(generation.id) : openLightbox(generation)"
              >
                <!-- 选择框 -->
                <div
                  v-if="isDeleting"
                  class="absolute top-2 right-2 z-10 flex items-center justify-center h-6 w-6 rounded-full"
                  :class="selectedGenerations.has(generation.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                >
                  <Check v-if="selectedGenerations.has(generation.id)" class="h-4 w-4" />
                </div>

                <div class="aspect-square overflow-hidden relative">
                  <!-- 图片加载中状态 -->
                  <Skeleton
                    v-if="isImageLoading(generation.id)"
                    class="h-full w-full absolute inset-0 z-10"
                  />

                  <!-- 图片加载中提示 -->
                  <div
                    v-if="isImageLoading(generation.id)"
                    class="absolute bottom-2 left-2 z-30 bg-black/50 text-white text-xs px-2 py-1 rounded-md"
                  >
                    加载中...
                  </div>

                  <!-- 图片 -->
                  <img
                    v-if="generation.output.images[0].url"
                    :src="generation.output.images[0].url"
                    :alt="generation.prompt"
                    :class="[
                      'h-full w-full object-cover transition-all group-hover:scale-105 relative z-0',
                      generation.output.has_nsfw_concepts?.[0] ? 'blur-xl' : ''
                    ]"
                    @load="imageLoaded(generation.id)"
                    @error="imageLoaded(generation.id)"
                    loading="lazy"
                  />

                  <!-- NSFW 标记 -->
                  <div
                    v-if="generation.output.has_nsfw_concepts?.[0]"
                    class="absolute top-2 right-2 z-20 bg-red-500/80 text-white text-xs px-2 py-1 rounded-md"
                  >
                    NSFW
                  </div>
                </div>
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  <div>
                    <div class="flex justify-between items-center mb-1">
                      <Badge v-if="generation.isCurrentUser" variant="outline" class="bg-primary/80 text-white border-primary/20 flex items-center gap-1">
                        <User class="h-3 w-3" />
                        我的
                      </Badge>
                      <Badge v-else variant="outline" class="bg-black/50 text-white border-white/20 flex items-center gap-1">
                        <Users class="h-3 w-3" />
                        其他用户
                      </Badge>
                    </div>
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

            <!-- 分页器 -->
            <div v-if="totalPages > 1" class="mt-6 flex justify-center">
              <div class="flex items-center gap-2 flex-wrap justify-center">
                <!-- 上一页 -->
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="currentPage <= 1"
                  @click="changePage(currentPage - 1)"
                  class="gap-1"
                >
                  <ChevronLeft class="h-4 w-4" />
                  上一页
                </Button>

                <!-- 页码信息 -->
                <span class="px-2">
                  {{ currentPage }} / {{ totalPages }}
                </span>

                <!-- 下一页 -->
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="currentPage >= totalPages"
                  @click="changePage(currentPage + 1)"
                  class="gap-1"
                >
                  下一页
                  <ChevronRight class="h-4 w-4" />
                </Button>

                <!-- 跳转到指定页 -->
                <div class="flex items-center gap-2 ml-2">
                  <input
                    v-model="goToPageInput"
                    type="number"
                    min="1"
                    :max="totalPages"
                    class="flex h-8 w-16 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="页码"
                    @keyup.enter="goToPage"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    @click="goToPage"
                    :disabled="!isValidPageInput"
                  >
                    跳转
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 无数据状态 -->
        <div v-else class="text-center py-8">
          <p class="text-muted-foreground">没有找到生成历史</p>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-if="selectedTab === 'list'">
        <Card v-if="filteredGenerations.length > 0">
          <CardContent class="p-4">
            <div v-if="isDeleting" class="flex justify-between items-center mb-4">
              <Button
                variant="outline"
                size="sm"
                @click="toggleAllSelection"
                class="gap-2"
              >
                {{ isAllSelected ? '取消全选' : '全选' }}
              </Button>

              <span class="text-sm text-muted-foreground">
                已选择 {{ selectedGenerations.size }} 项
              </span>
            </div>

            <div class="space-y-4">
              <div
                v-for="generation in filteredGenerations"
                :key="generation.id"
                class="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                @click="isDeleting ? toggleSelection(generation.id) : openLightbox(generation)"
              >
                <!-- 选择框 -->
                <div
                  v-if="isDeleting"
                  class="absolute top-2 right-2 z-10 flex items-center justify-center h-6 w-6 rounded-full"
                  :class="selectedGenerations.has(generation.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                >
                  <Check v-if="selectedGenerations.has(generation.id)" class="h-4 w-4" />
                </div>

                <!-- 缩略图 -->
                <div class="w-full sm:w-32 h-32 overflow-hidden rounded-md flex-shrink-0">
                  <img
                    :src="generation.output.images[0].url"
                    :alt="generation.prompt"
                    class="h-full w-full object-cover"
                  />
                </div>

                <!-- 详情 -->
                <div class="flex-1 flex flex-col">
                  <h3 class="font-medium line-clamp-2">{{ generation.prompt }}</h3>

                  <div class="mt-2 flex flex-wrap gap-2">
                    <Badge v-if="generation.isCurrentUser" variant="default" class="flex items-center gap-1 bg-primary text-primary-foreground">
                      <User class="h-3 w-3" />
                      我的
                    </Badge>
                    <Badge v-else variant="secondary" class="flex items-center gap-1">
                      <Users class="h-3 w-3" />
                      其他用户
                    </Badge>

                    <Badge variant="outline" class="flex items-center gap-1">
                      <Calendar class="h-3 w-3" />
                      {{ formatFullDate(generation.timestamp) }}
                    </Badge>

                    <Badge variant="outline" class="flex items-center gap-1">
                      <ImageIcon class="h-3 w-3" />
                      {{ generation.modelName }}
                    </Badge>

                    <Badge variant="outline" class="flex items-center gap-1">
                      <Clock class="h-3 w-3" />
                      种子: {{ generation.output.seed }}
                    </Badge>
                  </div>

                  <div class="mt-auto pt-2 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      class="gap-1"
                      @click.stop="downloadImage(generation.output.images[0].url)"
                    >
                      <Download class="h-3.5 w-3.5" />
                      下载
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div v-else class="text-center py-8">
          <p class="text-muted-foreground">没有找到生成历史</p>
        </div>
      </div>

      <!-- Lightbox Dialog -->
      <Dialog v-model:open="lightboxOpen" @update:open="closeLightbox">
        <DialogContent
          :class="[
            'p-0 gap-0 overflow-hidden bg-card',
            isMobile ? 'w-full h-[100vh] max-w-none' : 'max-w-screen-lg w-full h-[90vh]'
          ]"
        >
          <DialogTitle class="sr-only">图片预览</DialogTitle>
          <DialogDescription class="sr-only">查看生成的图片和相关信息</DialogDescription>
          <div class="relative h-full flex flex-col overflow-hidden">
            <!-- Top Bar -->
            <div class="flex justify-between items-center p-4 border-b">
              <div class="flex items-center gap-4">
                <div v-if="currentGeneration" class="flex items-center gap-2">
                  <Switch
                    id="nsfw"
                    v-model="isNSFW"
                    @update:modelValue="updateNSFWStatus"
                  />
                  <Label for="nsfw">NSFW</Label>
                </div>
              </div>
            </div>

            <!-- Image Display -->
            <div class="flex-1 flex items-center justify-center bg-muted overflow-hidden relative">
              <!-- 加载中状态 - 无图片 -->
              <div v-if="!currentGeneration || !currentGeneration.output.images[currentImageIndex]" class="text-center">
                <Loader2 class="h-10 w-10 animate-spin text-primary mx-auto mb-2" />
                <p>正在加载图片...</p>
              </div>

              <!-- 加载中状态 - 有图片但正在加载 -->
              <div
                v-else-if="isLightboxImageLoading"
                class="absolute inset-0 flex items-center justify-center z-10 bg-muted/80"
              >
                <div class="text-center">
                  <Skeleton
                    class="h-40 w-40 mx-auto mb-4 rounded-lg"
                  />
                  <p class="text-sm text-muted-foreground">正在加载图片...</p>
                </div>
              </div>

              <!-- 图片 -->
              <img
                v-if="currentGeneration && currentGeneration.output.images[currentImageIndex]"
                :src="currentGeneration.output.images[currentImageIndex].url"
                :alt="currentGeneration.prompt"
                :class="[
                  'object-contain',
                  isMobile ? 'max-h-[70vh] p-2' : 'max-h-full max-w-full p-4',
                  isLightboxImageLoading ? 'opacity-30' : 'opacity-100'
                ]"
                class="transition-opacity duration-300"
                @load="lightboxImageLoaded"
                @error="lightboxImageLoaded"
              />
            </div>

            <!-- Bottom Bar -->
            <div class="border-t p-4">
              <!-- 控制按钮 -->
              <div class="flex justify-between items-center mb-4">
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    :size="isMobile ? 'icon' : 'sm'"
                    :disabled="!hasPreviousImage"
                    @click="previousImage"
                  >
                    <ChevronLeft v-if="isMobile" class="h-4 w-4" />
                    <span v-else>上一张</span>
                  </Button>
                  <Button
                    variant="outline"
                    :size="isMobile ? 'icon' : 'sm'"
                    :disabled="!hasNextImage"
                    @click="nextImage"
                  >
                    <span v-if="!isMobile">下一张</span>
                    <ChevronRight v-else class="h-4 w-4" />
                  </Button>
                </div>
                <div class="flex gap-2">
                  <!-- 展开提示词按钮 -->
                  <Button
                    v-if="currentGeneration"
                    variant="outline"
                    :size="isMobile ? 'icon' : 'sm'"
                    @click="togglePromptExpanded"
                  >
                    <Expand class="h-4 w-4" />
                    <span v-if="!isMobile" class="ml-2">
                      {{ isPromptExpanded ? '收起' : '展开' }}
                    </span>
                  </Button>

                  <!-- 分享按钮 -->
                  <Button
                    v-if="currentGeneration"
                    variant="outline"
                    :size="isMobile ? 'icon' : 'sm'"
                    @click="shareImage"
                  >
                    <span v-if="isCopied">
                      <Copy class="h-4 w-4" />
                    </span>
                    <span v-else>
                      <Share2 class="h-4 w-4" />
                    </span>
                    <span v-if="!isMobile" class="ml-2">
                      {{ isCopied ? '已复制' : '分享' }}
                    </span>
                  </Button>

                  <!-- 下载按钮 -->
                  <Button
                    v-if="currentGeneration"
                    variant="outline"
                    :size="isMobile ? 'icon' : 'sm'"
                    @click="downloadImage(currentGeneration.output.images[currentImageIndex].url)"
                  >
                    <Download class="h-4 w-4" />
                    <span v-if="!isMobile" class="ml-2">下载</span>
                  </Button>
                </div>
              </div>

              <!-- 提示词和元数据 -->
              <div v-if="currentGeneration" class="space-y-2">
                <!-- 提示词 -->
                <div>
                  <p
                    :class="[
                      'text-sm break-words',
                      isPromptExpanded ? '' : 'line-clamp-2'
                    ]"
                  >
                    {{ currentGeneration.prompt }}
                  </p>
                </div>

                <!-- 元数据标签 -->
                <div class="flex flex-wrap gap-2">
                  <Badge variant="outline" class="text-xs">
                    种子: {{ currentGeneration.output.seed }}
                  </Badge>
                  <Badge variant="outline" class="text-xs">
                    {{ currentGeneration.modelName.split('/').pop() }}
                  </Badge>
                  <Badge variant="outline" class="text-xs">
                    {{ formatDate(currentGeneration.timestamp) }}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  </ScrollArea>
</template>
