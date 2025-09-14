<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import NavbarSheet from './NavbarSheet.vue';
import ThemeToggle from './ThemeToggle.vue';

// 导航项
const navItems = [
  {
    href: "/",
    label: "首页",
  },
  {
    href: "/models",
    label: "所有模型",
  },
];

// 当前路由信息
const route = useRoute();
const currentPath = computed(() => route.path);
const isActive = (path: string) => {
  if (path === '/') {
    return currentPath.value === '/';
  }
  return currentPath.value.startsWith(path);
};

// 移动端菜单通过NavbarSheet组件处理
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="container mx-auto px-4 flex h-16 items-center justify-between">
      <!-- Logo & 品牌 -->
      <div class="flex items-center gap-2">
        <RouterLink to="/" class="font-bold text-xl flex items-center gap-2">
          <img src="/logo.svg" alt="AI Picture Logo" class="h-8 w-8" />
          <span class="hidden sm:inline-block">AI Picture</span>
        </RouterLink>
      </div>

      <!-- 桌面端导航 -->
      <nav class="hidden md:flex items-center space-x-1">
        <!-- 主导航项 -->
        <template v-for="item in navItems" :key="item.href">
          <Button
            :as="RouterLink"
            :to="item.href"
            :variant="isActive(item.href) ? 'default' : 'ghost'"
            size="sm"
            class="text-base flex items-center gap-1"
          >
            {{ item.label }}
          </Button>
        </template>
      </nav>

      <!-- 右侧操作区域 -->
      <div class="flex items-center gap-2">
        <!-- 主题切换按钮 -->
        <ThemeToggle />
        
        <!-- 移动端菜单按钮 -->
        <div class="md:hidden">
          <NavbarSheet :navItems="navItems" />
        </div>
      </div>
    </div>
  </header>
</template>
