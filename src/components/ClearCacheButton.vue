<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

// 需要清除的localStorage键
const KEYS_TO_CLEAR = [
  'fal-ai-active-key',
  'fal-ai-api-keys',
  'fal-ai-generations',
  'fal-ai-default-settings-fal-ai/flux-pro/v1.1',
  'fal-ai-default-settings-fal-ai/flux-pro/v1.1-ultra',
  'fal-ai-default-settings-fal-ai/flux-lora'
];

// 提示对话框的显示状态
const showTipDialog = ref(false);
const NEED_SHOW_CLEAR_TIP_KEY = 'needshowCleartip';

// 在组件挂载时检查是否需要显示提示对话框
onMounted(() => {
  const needShowTip = localStorage.getItem(NEED_SHOW_CLEAR_TIP_KEY);
  if (needShowTip !== 'false') {
    showTipDialog.value = true;
  }
});

// 清除缓存并刷新页面
const clearCacheAndReload = () => {
  try {
    // 清除指定的localStorage键
    KEYS_TO_CLEAR.forEach(key => {
      localStorage.removeItem(key);
    });

    toast.success('缓存已清除，页面将重新加载');

    // 延迟一下再刷新，让用户看到提示
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('清除缓存失败:', error);
    toast.error('清除缓存失败');
  }
};

// 不再显示提示对话框
const doNotShowAgain = () => {
  localStorage.setItem(NEED_SHOW_CLEAR_TIP_KEY, 'false');
  showTipDialog.value = false;
};

// 关闭提示对话框但不设置不再显示
const closeTipDialog = () => {
  showTipDialog.value = false;
};
</script>

<template>
  <!-- 清除缓存按钮 -->
  <Button
    variant="outline"
    size="sm"
    @click="clearCacheAndReload"
    title="清除缓存并刷新页面"
    class="gap-2"
  >
    <Trash2 class="h-4 w-4" />
    <span class="hidden sm:inline">清除缓存</span>
  </Button>

  <!-- 提示对话框 -->
  <Dialog v-model:open="showTipDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>重要提示</DialogTitle>
        <DialogDescription>
          请主动执行右上角的清除缓存按钮以加载最新的有效Key
        </DialogDescription>
      </DialogHeader>

      <div class="flex justify-end space-x-2 mt-4">
        <Button variant="outline" @click="closeTipDialog">关闭</Button>
        <Button @click="doNotShowAgain">我已知晓，不再提示</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
