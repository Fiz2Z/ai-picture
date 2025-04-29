<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, Key } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { fal } from "@fal-ai/client";

const API_KEY_STORAGE_KEY = 'fal-ai-api-key';

function configureFalClient(apiKey: string) {
  fal.config({
    credentials: apiKey,
  });
}

const isVisible = ref(false);
const apiKey = ref('');
const hasStoredKey = ref(false);
const isInputVisible = ref(false);

onMounted(() => {
  const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (storedKey) {
    apiKey.value = storedKey;
    hasStoredKey.value = true;
    configureFalClient(storedKey);
  }
});

const handleSave = () => {
  if (!apiKey.value.trim()) {
    toast.error('请输入有效的API密钥');
    return;
  }

  const trimmedKey = apiKey.value.trim();
  localStorage.setItem(API_KEY_STORAGE_KEY, trimmedKey);
  configureFalClient(trimmedKey);
  hasStoredKey.value = true;
  isInputVisible.value = false;
  toast.success('API密钥已成功保存');
};

const toggleVisibility = () => {
  isVisible.value = !isVisible.value;
};
</script>

<template>
  <div class="flex items-center gap-2">
    <template v-if="!isInputVisible">
      <Button
        variant="outline"
        size="sm"
        @click="isInputVisible = true"
        class="gap-2"
      >
        <Key class="h-4 w-4" />
        <span v-if="hasStoredKey" class="flex items-center gap-2">
          API密钥已保存
          <Check class="h-4 w-4 text-green-500" />
        </span>
        <span v-else>设置API密钥</span>
      </Button>
    </template>

    <template v-else>
      <div class="relative">
        <Input
          :type="isVisible ? 'text' : 'password'"
          v-model="apiKey"
          placeholder="输入您的FAL.AI API密钥"
          class="pr-8 w-[300px]"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        @click="toggleVisibility"
        :title="isVisible ? '隐藏API密钥' : '显示API密钥'"
      >
        <EyeOff v-if="isVisible" class="h-4 w-4" />
        <Eye v-else class="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        @click="handleSave"
      >
        保存
      </Button>
      <Button
        variant="ghost"
        size="sm"
        @click="isInputVisible = false"
      >
        取消
      </Button>
    </template>
  </div>
</template>
