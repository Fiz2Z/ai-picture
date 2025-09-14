<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-vue-next';
import { useDarkMode } from '@/composables/useDarkMode';

const { isDark, toggleTheme } = useDarkMode();
</script>

<template>
  <Button
    @click="toggleTheme"
    variant="ghost"
    size="sm"
    class="w-9 h-9 p-0"
    :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
  >
    <Sun v-if="isDark" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
  </Button>
</template>
