<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { modelCategories } from '@/router/models';
import { Menu } from 'lucide-vue-next';

// 导航项
const props = defineProps<{
  navItems: Array<{
    href: string;
    label: string;
    icon?: any;
  }>;
}>();

// 使用props中的navItems
const { navItems } = props;

// 当前路由信息
const route = useRoute();
const currentPath = computed(() => route.path);
const isActive = (path: string) => {
  if (path === '/') {
    return currentPath.value === '/';
  }
  return currentPath.value.startsWith(path);
};

// Sheet状态
const isOpen = ref(false);

// 关闭Sheet
const closeSheet = () => {
  isOpen.value = false;
};
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        class="md:hidden"
        aria-label="菜单"
      >
        <Menu class="h-6 w-6" />
      </Button>
    </SheetTrigger>

    <SheetContent side="right" class="w-[300px] sm:w-[400px]">
      <SheetHeader>
        <SheetTitle>菜单</SheetTitle>
        <SheetDescription>
          导航和设置
        </SheetDescription>
      </SheetHeader>

      <div class="py-6">
        <nav class="flex flex-col space-y-4">
          <!-- 主导航项 -->
          <RouterLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            class="py-2 text-base font-medium flex items-center gap-2"
            :class="isActive(item.href) ? 'text-primary' : 'text-foreground'"
            @click="closeSheet"
          >
            <component :is="item.icon" v-if="item.icon" class="h-5 w-5" />
            {{ item.label }}
          </RouterLink>

          <!-- 模型库 -->
          <div class="py-2">
            <div class="font-medium mb-2">模型库</div>
            <div class="pl-4 space-y-2">
              <template v-for="(category, index) in modelCategories" :key="index">
                <template v-for="model in category.models.slice(0, 3)" :key="model.id">
                  <RouterLink
                    :to="`/models/${model.id.replace(/\//g, '-')}`"
                    class="block py-1 text-sm text-muted-foreground hover:text-foreground"
                    @click="closeSheet"
                  >
                    {{ model.name }}
                  </RouterLink>
                </template>
              </template>
              <RouterLink
                to="/models"
                class="block py-1 text-sm font-medium text-primary"
                @click="closeSheet"
              >
                查看全部模型
              </RouterLink>
            </div>
          </div>

          <!-- 其他链接可以在这里添加 -->
          <div class="pt-4 border-t">
            <div class="text-sm text-muted-foreground">
              使用 Fal.AI 生成您的图像
            </div>
          </div>
        </nav>
      </div>
    </SheetContent>
  </Sheet>
</template>
