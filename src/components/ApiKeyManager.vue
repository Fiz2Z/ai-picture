<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, EyeOff, Check, Key, Plus, Trash2, RefreshCw, AlertCircle, ChevronDown, ChevronRight, Play } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { fal } from "@fal-ai/client";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 常量
const API_KEYS_STORAGE_KEY = 'fal-ai-api-keys';
const ACTIVE_KEY_INDEX_STORAGE_KEY = 'fal-ai-active-key-index';
const ACTIVE_KEY_STORAGE_KEY = 'fal-ai-active-key'; // 存储当前活动密钥的值
const CONFIG_FILE_PATH = import.meta.env.VITE_FAL_API_KEYS || '';

// 类型
interface ApiKeyInfo {
  key: string;
  name: string;
  isSystem?: boolean;
  balance?: number;
  lastChecked?: number;
  group?: string;
  isValid?: boolean;  // 密钥是否有效
  invalidReason?: string;  // 失效原因，如 'balance_exhausted'
  isLoading?: boolean;  // 密钥是否正在加载中
}

// 状态
const apiKeys = ref<ApiKeyInfo[]>([]);
const activeKeyIndex = ref<number>(-1);
const newKeyName = ref('');
const newKeyValue = ref('');
const isVisible = ref(false); // 用于添加密钥表单
const visibleKeyIndices = ref<Set<number>>(new Set()); // 用于记录哪些密钥是可见的
const isDialogOpen = ref(false);
const isSheetOpen = ref(false);
const activeTab = ref('keys');
const selectedGroup = ref('all'); // 当前选择的分组
const expandedGroups = ref<Set<string>>(new Set()); // 展开的分组

// 每个组的测试进度
const groupTestProgress = ref<Record<string, { current: number, total: number, isLoading: boolean }>>({});

// 当前是否为开发环境
const isDevelopment = import.meta.env.DEV;

// 监听 activeTab 变化，当切换到添加密钥标签时重置表单
watch(activeTab, (newValue) => {
  if (newValue === 'add') {
    // 重置表单字段
    newKeyName.value = '';
    newKeyValue.value = '';
    isVisible.value = false;
  }
});

// 计算属性
const activeKey = computed(() => {
  if (activeKeyIndex.value >= 0 && activeKeyIndex.value < apiKeys.value.length) {
    return apiKeys.value[activeKeyIndex.value];
  }
  return null;
});

const hasKeys = computed(() => apiKeys.value.length > 0);

// 方法
function configureFalClient(apiKey: string) {
  fal.config({
    credentials: apiKey,
  });
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

// 处理Sheet打开状态变化
function handleSheetOpenChange(open: boolean) {
  if (open) {
    // 当Sheet打开时，切换到密钥管理标签页
    activeTab.value = 'keys';
  }
}

// 计算属性 - 获取所有分组
const groups = computed(() => {
  const groupSet = new Set<string>();
  apiKeys.value.forEach(key => {
    if (key.group) {
      groupSet.add(key.group);
    }
  });
  return Array.from(groupSet);
});

// 按分组过滤密钥
const filteredKeys = computed(() => {
  if (selectedGroup.value === 'all') {
    return apiKeys.value;
  }
  return apiKeys.value.filter(key => key.group === selectedGroup.value);
});

// 切换分组展开状态
function toggleGroupExpanded(group: string) {
  const newExpandedGroups = new Set(expandedGroups.value);
  if (newExpandedGroups.has(group)) {
    newExpandedGroups.delete(group);
  } else {
    newExpandedGroups.add(group);
  }
  expandedGroups.value = newExpandedGroups;
}

// 加载API密钥
onMounted(async () => {
  // 加载本地存储的密钥
  const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
  const storedActiveIndex = localStorage.getItem(ACTIVE_KEY_INDEX_STORAGE_KEY);

  let keys: ApiKeyInfo[] = [];

  if (storedKeys) {
    try {
      keys = JSON.parse(storedKeys);
    } catch (error) {
      console.error('解析保存的API密钥失败:', error);
    }
  }

  // 从环境变量加载系统密钥
  if (CONFIG_FILE_PATH) {
    const systemKeys = CONFIG_FILE_PATH.split(',').map((key: string) => key.trim()).filter(Boolean);

    // 检查系统密钥是否已存在
    for (const systemKey of systemKeys) {
      const exists = keys.some(k => k.key === systemKey);
      if (!exists) {
        keys.push({
          key: systemKey,
          name: `密钥 ${keys.length + 1}`,
          isSystem: true,
          group: '默认组'
        });
      }
    }
  }

  apiKeys.value = keys;

  // 默认展开所有分组
  const groupSet = new Set<string>();
  keys.forEach(key => {
    if (key.group) {
      groupSet.add(key.group);
    }
  });
  expandedGroups.value = groupSet;

  // 设置活动密钥
  if (keys.length > 0) {
    let validKeyIndex = -1;

    // 先尝试使用存储的活动密钥索引
    if (storedActiveIndex && !isNaN(Number(storedActiveIndex))) {
      const index = Number(storedActiveIndex);
      if (index >= 0 && index < keys.length && keys[index].isValid !== false) {
        activeKeyIndex.value = index;
        validKeyIndex = index;
      }
    }

    // 如果存储的密钥无效或不存在，则尝试找到第一个有效的密钥
    if (validKeyIndex === -1) {
      // 寻找第一个有效的密钥
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].isValid !== false) {
          activeKeyIndex.value = i;
          validKeyIndex = i;
          break;
        }
      }

      // 如果所有密钥都失效，使用第一个密钥，但不显示提示
      if (validKeyIndex === -1) {
        activeKeyIndex.value = 0;
        console.warn('所有API密钥都失效，请验证或添加新的密钥');
      }
    }
  }

  // 配置FAL客户端
  if (activeKey.value) {
    configureFalClient(activeKey.value.key);
    // 同时存储当前活动密钥的值
    localStorage.setItem(ACTIVE_KEY_STORAGE_KEY, activeKey.value.key);
  }
});

// 新密钥的分组
const newKeyGroup = ref('');

// 添加新密钥
const addNewKey = () => {
  if (!newKeyValue.value.trim()) {
    toast.error('请输入有效的API密钥');
    return;
  }

  const trimmedKey = newKeyValue.value.trim();
  const name = newKeyName.value.trim() || `密钥 ${apiKeys.value.length + 1}`;
  const group = newKeyGroup.value.trim() || '默认组';

  // 检查是否已存在
  const exists = apiKeys.value.some(k => k.key === trimmedKey);
  if (exists) {
    toast.error('此API密钥已存在');
    return;
  }

  // 添加新密钥
  const newKeys = [...apiKeys.value, { key: trimmedKey, name, group }];
  apiKeys.value = newKeys;

  // 如果是第一个密钥，设为活动密钥
  if (newKeys.length === 1) {
    activeKeyIndex.value = 0;
    configureFalClient(trimmedKey);
  }

  // 保存到本地存储
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(newKeys));
  localStorage.setItem(ACTIVE_KEY_INDEX_STORAGE_KEY, activeKeyIndex.value.toString());

  // 展开新密钥的分组
  if (group && !expandedGroups.value.has(group)) {
    expandedGroups.value.add(group);
  }

  // 重置表单
  newKeyName.value = '';
  newKeyValue.value = '';
  newKeyGroup.value = '';
  isVisible.value = false;

  toast.success('API密钥已成功添加');

  // 切换回密钥管理标签页
  activeTab.value = 'keys';

  // 关闭对话框/抽屉
  isDialogOpen.value = false;
  isSheetOpen.value = false;
};

// 设置活动密钥
const setActiveKey = (index: number) => {
  if (index >= 0 && index < apiKeys.value.length) {
    // 检查密钥是否失效
    if (apiKeys.value[index].isValid === false) {
      toast.error(`无法激活失效的API密钥`);
      return;
    }

    activeKeyIndex.value = index;
    const key = apiKeys.value[index].key;
    configureFalClient(key);
    localStorage.setItem(ACTIVE_KEY_INDEX_STORAGE_KEY, index.toString());
    localStorage.setItem(ACTIVE_KEY_STORAGE_KEY, key); // 同时存储密钥值
    toast.success(`已激活: ${apiKeys.value[index].name}`);
  }
};

// 删除密钥
const deleteKey = (index: number) => {
  if (index >= 0 && index < apiKeys.value.length) {
    // 不允许删除系统密钥
    if (apiKeys.value[index].isSystem) {
      toast.error('系统密钥不能删除');
      return;
    }

    const newKeys = [...apiKeys.value];
    newKeys.splice(index, 1);
    apiKeys.value = newKeys;

    // 如果删除的是活动密钥，重新设置活动密钥
    if (index === activeKeyIndex.value) {
      if (newKeys.length > 0) {
        activeKeyIndex.value = 0;
        configureFalClient(newKeys[0].key);
        localStorage.setItem(ACTIVE_KEY_INDEX_STORAGE_KEY, '0');
        localStorage.setItem(ACTIVE_KEY_STORAGE_KEY, newKeys[0].key);
      } else {
        activeKeyIndex.value = -1;
        localStorage.removeItem(ACTIVE_KEY_INDEX_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_KEY_STORAGE_KEY);
      }
    } else if (index < activeKeyIndex.value) {
      // 如果删除的密钥在活动密钥之前，需要调整活动密钥索引
      activeKeyIndex.value--;
    }

    // 保存到本地存储
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(newKeys));
    localStorage.setItem(ACTIVE_KEY_INDEX_STORAGE_KEY, activeKeyIndex.value.toString());

    toast.success('API密钥已删除');
  }
};

// 测试API密钥可用性
const checkBalance = async (index: number) => {
  if (index >= 0 && index < apiKeys.value.length) {
    // 设置当前密钥的加载状态
    const newKeys = [...apiKeys.value];
    newKeys[index] = {
      ...newKeys[index],
      isLoading: true
    };
    apiKeys.value = newKeys;

    try {
      // 临时配置FAL客户端
      fal.config({
        credentials: apiKeys.value[index].key,
      });

      // 调用any-llm模型测试API密钥可用性
      await fal.subscribe("fal-ai/any-llm", {
        input: {
          system_prompt: "You are a helpful assistant.",
          prompt: "Hello, this is a test message to verify API key validity.",
          model: "anthropic/claude-3.7-sonnet" as any,
        },
      });

      // 如果没有抛出错误，说明API密钥有效
      // 更新密钥状态
      const updatedKeys = [...apiKeys.value];
      updatedKeys[index] = {
        ...updatedKeys[index],
        lastChecked: Date.now(),
        isValid: true,  // 标记为有效
        invalidReason: undefined,  // 清除失效原因
        isLoading: false  // 结束加载状态
      };
      apiKeys.value = updatedKeys;

      // 保存到本地存储
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(updatedKeys));

      toast.success(`API密钥有效`);
    } catch (error) {
      console.error('API密钥验证失败:', error);

      // 更新密钥状态
      const updatedKeys = [...apiKeys.value];
      updatedKeys[index] = {
        ...updatedKeys[index],
        lastChecked: Date.now(),
        isValid: false,  // 标记为无效
        isLoading: false  // 结束加载状态
      };

      // 检查是否是余额不足错误
      let errorMessage = '验证失败';

      if (error && typeof error === 'object') {
        // 检查是否包含余额不足信息
        const errorString = JSON.stringify(error);
        if (errorString.includes('Exhausted balance')) {
          errorMessage = '失效';
          updatedKeys[index].invalidReason = 'balance_exhausted';
        }
      }

      // 保存到本地存储
      apiKeys.value = updatedKeys;
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(updatedKeys));

      toast.error(`API密钥${errorMessage}`);
    } finally {
      // 恢复活动密钥的配置
      if (activeKey.value) {
        configureFalClient(activeKey.value.key);
      }
    }
  }
};



// 格式化最后检查时间 - 不再使用
// const formatLastChecked = (timestamp?: number) => {
//   if (!timestamp) return '从未检查';
//   return new Date(timestamp).toLocaleString();
// };

// 测试一个组内的所有API Key
const testGroupKeys = async (group: string) => {
  // 获取该组的所有密钥
  const groupKeys = apiKeys.value.filter(key => key.group === group);
  const total = groupKeys.length;

  if (total === 0) return;

  // 初始化进度
  groupTestProgress.value[group] = {
    current: 0,
    total,
    isLoading: true
  };

  // 并发测试所有密钥，每次最多5个
  const batchSize = 5;
  const batches = Math.ceil(total / batchSize);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, total);
    const batch = groupKeys.slice(start, end);

    // 并发测试这一批密钥
    await Promise.all(batch.map(async (key) => {
      // 找到该密钥在原数组中的索引
      const keyIndex = apiKeys.value.findIndex(k => k.key === key.key);
      if (keyIndex === -1) return;

      // 测试密钥
      await checkBalance(keyIndex);

      // 更新进度
      groupTestProgress.value[group].current++;
    }));
  }

  // 测试完成
  groupTestProgress.value[group].isLoading = false;
  toast.success(`组 "${group}" 的所有密钥测试完成`);
};

// 切换密码可见性
const toggleVisibility = () => {
  isVisible.value = !isVisible.value;
};

// 切换特定密钥的可见性
const toggleKeyVisibility = (index: number) => {
  const newVisibleIndices = new Set(visibleKeyIndices.value);
  if (newVisibleIndices.has(index)) {
    newVisibleIndices.delete(index);
  } else {
    newVisibleIndices.add(index);
  }
  visibleKeyIndices.value = newVisibleIndices;
};

// 检查密钥是否可见
const isKeyVisible = (index: number): boolean => {
  return visibleKeyIndices.value.has(index);
};
</script>

<template>
  <!-- 桌面端对话框 -->
  <Dialog v-model:open="isDialogOpen">
    <DialogTrigger asChild>
      <Button variant="outline" size="sm" class="gap-2 hidden md:flex">
        <Key class="h-4 w-4" />
        <span v-if="activeKey" class="flex items-center gap-2">
          {{ activeKey.name }}
          <Badge v-if="activeKey.isSystem" variant="outline" class="ml-1">系统</Badge>
        </span>
        <span v-else>设置API密钥</span>
      </Button>
    </DialogTrigger>

    <DialogContent class="sm:max-w-[500px] overflow-hidden">
      <DialogHeader>
        <DialogTitle>管理API密钥</DialogTitle>
        <DialogDescription>
          添加、管理和激活您的FAL.AI API密钥
        </DialogDescription>
      </DialogHeader>

      <div class="w-full">
        <div class="mb-4">
          <Tabs v-model="activeTab" class="w-full">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="keys">密钥管理</TabsTrigger>
              <TabsTrigger value="add">添加密钥</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <!-- 密钥管理标签页 -->
        <div v-if="activeTab === 'keys'" class="space-y-4 py-4">
          <!-- 分组选择器 -->
          <div class="mb-4">
            <Select v-model="selectedGroup">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择分组" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有分组</SelectItem>
                <SelectItem v-for="group in groups" :key="group" :value="group">{{ group }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea v-if="hasKeys" class="h-[60vh] max-h-[500px]">
            <div class="space-y-4 pr-4">
            <!-- 分组显示 -->
            <template v-if="selectedGroup === 'all'">
              <div v-for="group in groups" :key="group" class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <div
                    class="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    @click="toggleGroupExpanded(group)"
                  >
                    <ChevronDown v-if="expandedGroups.has(group)" class="h-4 w-4" />
                    <ChevronRight v-else class="h-4 w-4" />
                    <h3 class="font-medium">{{ group }}</h3>
                    <Badge variant="outline" class="ml-2">
                      {{ apiKeys.filter(k => k.group === group).length }}
                    </Badge>
                  </div>

                  <!-- 测试组内所有密钥的按钮，只在开发环境中显示 -->
                  <Button
                    v-if="isDevelopment"
                    variant="outline"
                    size="sm"
                    class="h-7 gap-1"
                    @click="testGroupKeys(group)"
                    :disabled="groupTestProgress[group]?.isLoading"
                  >
                    <Play v-if="!groupTestProgress[group]?.isLoading" class="h-3 w-3" />
                    <RefreshCw v-else class="h-3 w-3 animate-spin" />
                    <span v-if="!groupTestProgress[group]?.isLoading">测试组</span>
                    <span v-else>{{ groupTestProgress[group]?.current }}/{{ groupTestProgress[group]?.total }}</span>
                  </Button>
                </div>

                <div v-if="expandedGroups.has(group)" class="space-y-2 pl-2">
                  <Card
                    v-for="(key, index) in apiKeys.filter(k => k.group === group)"
                    :key="index"
                    :class="{'border-primary': index === activeKeyIndex}"
                    class="mb-2 !p-0 !py-0"
                  >
                    <div
                      class="p-3 flex items-center justify-between cursor-pointer transition-colors"
                      @click="key.isValid !== false && setActiveKey(index)"
                      :class="{
                        'opacity-70': key.isValid === false,
                        'hover:bg-accent/50': index !== activeKeyIndex && key.isValid !== false,
                        'bg-accent/20': index === activeKeyIndex
                      }"
                    >
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-1 flex-wrap">
                            <span class="font-medium truncate">{{ key.name }}</span>
                            <Badge v-if="key.isSystem" variant="outline" class="text-xs">系统</Badge>
                            <Badge v-if="index === activeKeyIndex" variant="default" class="text-xs">活动</Badge>
                            <Badge v-if="key.isValid === false" variant="destructive" class="text-xs">失效</Badge>

                          </div>
                          <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Button
                              v-if="!key.isSystem"
                              variant="ghost"
                              size="icon"
                              class="h-4 w-4 p-0 flex-shrink-0"
                              @click.stop="toggleKeyVisibility(index)"
                              :title="isKeyVisible(index) ? '隐藏API密钥' : '显示API密钥'"
                            >
                              <EyeOff v-if="isKeyVisible(index)" class="h-3 w-3" />
                              <Eye v-else class="h-3 w-3" />
                            </Button>
                            <span class="break-all max-w-[250px] inline-block">{{ key.isSystem ? maskKey(key.key) : (isKeyVisible(index) ? key.key : maskKey(key.key)) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex gap-1">

                        <Button
                          variant="outline"
                          size="icon"
                          class="h-7 w-7"
                          @click="checkBalance(index)"
                          :disabled="key.isLoading"
                          title="验证密钥"
                        >
                          <RefreshCw v-if="key.isLoading" class="h-3 w-3 animate-spin" />
                          <RefreshCw v-else class="h-3 w-3" />
                        </Button>
                        <Button
                          v-if="!key.isSystem"
                          variant="destructive"
                          size="icon"
                          class="h-7 w-7"
                          @click="deleteKey(index)"
                          title="删除"
                        >
                          <Trash2 class="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </template>

            <!-- 当选择特定分组时显示 -->
            <template v-else>
              <Card
                v-for="(key, index) in filteredKeys"
                :key="index"
                :class="{'border-primary': index === activeKeyIndex}"
                class="mb-2 !p-0 !py-0"
              >
                <div class="p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1 flex-wrap">
                        <span class="font-medium truncate">{{ key.name }}</span>
                        <Badge v-if="key.isSystem" variant="outline" class="text-xs">系统</Badge>
                        <Badge v-if="index === activeKeyIndex" variant="default" class="text-xs">活动</Badge>
                        <Badge v-if="key.isValid === false" variant="destructive" class="text-xs">失效</Badge>

                      </div>
                      <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Button
                          v-if="!key.isSystem"
                          variant="ghost"
                          size="icon"
                          class="h-4 w-4 p-0 flex-shrink-0"
                          @click="toggleKeyVisibility(index)"
                          :title="isKeyVisible(index) ? '隐藏API密钥' : '显示API密钥'"
                        >
                          <EyeOff v-if="isKeyVisible(index)" class="h-3 w-3" />
                          <Eye v-else class="h-3 w-3" />
                        </Button>
                        <span class="break-all max-w-[250px] inline-block">{{ key.isSystem ? maskKey(key.key) : (isKeyVisible(index) ? key.key : maskKey(key.key)) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <Button
                      v-if="index !== activeKeyIndex"
                      variant="outline"
                      size="icon"
                      class="h-7 w-7"
                      @click="setActiveKey(index)"
                      title="激活"
                    >
                      <Check class="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      class="h-7 w-7"
                      @click="checkBalance(index)"
                      :disabled="key.isLoading"
                      title="验证密钥"
                    >
                      <RefreshCw v-if="key.isLoading" class="h-3 w-3 animate-spin" />
                      <RefreshCw v-else class="h-3 w-3" />
                    </Button>
                    <Button
                      v-if="!key.isSystem"
                      variant="destructive"
                      size="icon"
                      class="h-7 w-7"
                      @click="deleteKey(index)"
                      title="删除"
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            </template>
            </div>
          </ScrollArea>

          <div v-else class="text-center py-4">
            <AlertCircle class="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p class="text-muted-foreground">没有找到API密钥</p>
            <p class="text-sm text-muted-foreground mt-1">请添加一个新的API密钥</p>
          </div>
        </div>

        <!-- 添加密钥标签页 -->
        <div v-if="activeTab === 'add'" class="space-y-4 py-4">
          <div class="space-y-4">
            <div class="space-y-2">
              <label for="key-name" class="text-sm font-medium">密钥名称</label>
              <Input
                id="key-name"
                v-model="newKeyName"
                placeholder="例如: 个人账户"
              />
            </div>

            <div class="space-y-2">
              <label for="key-value" class="text-sm font-medium">API密钥</label>
              <div class="relative">
                <Input
                  id="key-value"
                  :type="isVisible ? 'text' : 'password'"
                  v-model="newKeyValue"
                  placeholder="输入您的FAL.AI API密钥"
                  class="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  class="absolute right-0 top-0 h-full"
                  @click="toggleVisibility"
                  :title="isVisible ? '隐藏API密钥' : '显示API密钥'"
                >
                  <EyeOff v-if="isVisible" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </Button>
              </div>
              <p class="text-sm text-muted-foreground mt-1">
                您可以在 <a href="https://fal.ai/dashboard/keys" target="_blank" class="text-primary hover:underline">FAL.AI 控制面板</a> 中获取API密钥
              </p>
            </div>

            <div class="space-y-2">
              <label for="key-group" class="text-sm font-medium">分组</label>
              <div class="relative">
                <Input
                  id="key-group"
                  v-model="newKeyGroup"
                  placeholder="输入分组名称或选择现有分组"
                  list="group-options"
                />
                <datalist id="group-options">
                  <option v-for="group in groups" :key="group" :value="group">{{ group }}</option>
                </datalist>
              </div>
              <p class="text-sm text-muted-foreground mt-1">
                分组可以帮助您更好地组织和管理大量密钥
              </p>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button v-if="activeTab === 'add'" @click="addNewKey" class="gap-2">
          <Plus class="h-4 w-4" />
          添加密钥
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 移动端抽屉 -->
  <Sheet v-model:open="isSheetOpen" @update:open="handleSheetOpenChange">
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" class="gap-2 md:hidden">
        <Key class="h-4 w-4" />
        <span v-if="activeKey" class="flex items-center gap-1">
          {{ activeKey.name }}
          <Badge v-if="activeKey.isSystem" variant="outline" class="text-xs">系统</Badge>
        </span>
        <span v-else>API密钥</span>
      </Button>
    </SheetTrigger>

    <SheetContent side="bottom" class="h-[90vh] flex flex-col overflow-hidden">
      <SheetHeader>
        <SheetTitle>管理API密钥</SheetTitle>
        <SheetDescription>
          添加、管理和激活您的FAL.AI API密钥
        </SheetDescription>
      </SheetHeader>

      <div class="w-full mt-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div class="mb-2">
          <Tabs v-model="activeTab" class="w-full">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="keys">密钥管理</TabsTrigger>
              <TabsTrigger value="add">添加密钥</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <!-- 密钥管理标签页 -->
        <div v-if="activeTab === 'keys'" class="space-y-2 py-2 flex-1 overflow-y-auto pr-2 min-h-0 h-[calc(90vh-180px)]" style="overflow-y: auto !important;">
          <!-- 分组选择器 -->
          <div class="mb-4">
            <Select v-model="selectedGroup">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择分组" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有分组</SelectItem>
                <SelectItem v-for="group in groups" :key="group" :value="group">{{ group }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="hasKeys" class="space-y-2">
            <!-- 分组显示 -->
            <template v-if="selectedGroup === 'all'">
              <div v-for="group in groups" :key="group" class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <div
                    class="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    @click="toggleGroupExpanded(group)"
                  >
                    <ChevronDown v-if="expandedGroups.has(group)" class="h-4 w-4" />
                    <ChevronRight v-else class="h-4 w-4" />
                    <h3 class="font-medium">{{ group }}</h3>
                    <Badge variant="outline" class="ml-2">
                      {{ apiKeys.filter(k => k.group === group).length }}
                    </Badge>
                  </div>

                  <!-- 测试组内所有密钥的按钮，只在开发环境中显示 -->
                  <Button
                    v-if="isDevelopment"
                    variant="outline"
                    size="sm"
                    class="h-7 gap-1"
                    @click="testGroupKeys(group)"
                    :disabled="groupTestProgress[group]?.isLoading"
                  >
                    <Play v-if="!groupTestProgress[group]?.isLoading" class="h-3 w-3" />
                    <RefreshCw v-else class="h-3 w-3 animate-spin" />
                    <span v-if="!groupTestProgress[group]?.isLoading">测试组</span>
                    <span v-else>{{ groupTestProgress[group]?.current }}/{{ groupTestProgress[group]?.total }}</span>
                  </Button>
                </div>

                <div v-if="expandedGroups.has(group)" class="space-y-2 pl-2">
                  <Card
                    v-for="(key, index) in apiKeys.filter(k => k.group === group)"
                    :key="index"
                    :class="{'border-primary': index === activeKeyIndex}"
                    class="mb-2 !p-0 !py-0"
                  >
                    <div
                      class="p-3 flex items-center justify-between cursor-pointer transition-colors"
                      @click="key.isValid !== false && setActiveKey(index)"
                      :class="{
                        'opacity-70': key.isValid === false,
                        'hover:bg-accent/50': index !== activeKeyIndex && key.isValid !== false,
                        'bg-accent/20': index === activeKeyIndex
                      }"
                    >
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-1 flex-wrap">
                            <span class="font-medium truncate">{{ key.name }}</span>
                            <Badge v-if="key.isSystem" variant="outline" class="text-xs">系统</Badge>
                            <Badge v-if="index === activeKeyIndex" variant="default" class="text-xs">活动</Badge>
                            <Badge v-if="key.isValid === false" variant="destructive" class="text-xs">失效</Badge>

                          </div>
                          <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Button
                              v-if="!key.isSystem"
                              variant="ghost"
                              size="icon"
                              class="h-4 w-4 p-0 flex-shrink-0"
                              @click.stop="toggleKeyVisibility(index)"
                              :title="isKeyVisible(index) ? '隐藏API密钥' : '显示API密钥'"
                            >
                              <EyeOff v-if="isKeyVisible(index)" class="h-3 w-3" />
                              <Eye v-else class="h-3 w-3" />
                            </Button>
                            <span class="break-all max-w-[250px] inline-block">{{ key.isSystem ? maskKey(key.key) : (isKeyVisible(index) ? key.key : maskKey(key.key)) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex gap-1">

                        <Button
                          variant="outline"
                          size="icon"
                          class="h-7 w-7"
                          @click="checkBalance(index)"
                          :disabled="key.isLoading"
                          title="验证密钥"
                        >
                          <RefreshCw v-if="key.isLoading" class="h-3 w-3 animate-spin" />
                          <RefreshCw v-else class="h-3 w-3" />
                        </Button>
                        <Button
                          v-if="!key.isSystem"
                          variant="destructive"
                          size="icon"
                          class="h-7 w-7"
                          @click="deleteKey(index)"
                          title="删除"
                        >
                          <Trash2 class="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </template>

            <!-- 当选择特定分组时显示 -->
            <template v-else>
              <Card
                v-for="(key, index) in filteredKeys"
                :key="index"
                :class="{'border-primary': index === activeKeyIndex}"
                class="mb-2 !p-0 !py-0"
              >
                <div class="p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1 flex-wrap">
                        <span class="font-medium truncate">{{ key.name }}</span>
                        <Badge v-if="key.isSystem" variant="outline" class="text-xs">系统</Badge>
                        <Badge v-if="index === activeKeyIndex" variant="default" class="text-xs">活动</Badge>
                        <Badge v-if="key.isValid === false" variant="destructive" class="text-xs">失效</Badge>

                      </div>
                      <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Button
                          v-if="!key.isSystem"
                          variant="ghost"
                          size="icon"
                          class="h-4 w-4 p-0 flex-shrink-0"
                          @click="toggleKeyVisibility(index)"
                          :title="isKeyVisible(index) ? '隐藏API密钥' : '显示API密钥'"
                        >
                          <EyeOff v-if="isKeyVisible(index)" class="h-3 w-3" />
                          <Eye v-else class="h-3 w-3" />
                        </Button>
                        <span class="break-all max-w-[250px] inline-block">{{ key.isSystem ? maskKey(key.key) : (isKeyVisible(index) ? key.key : maskKey(key.key)) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <Button
                      v-if="index !== activeKeyIndex"
                      variant="outline"
                      size="icon"
                      class="h-7 w-7"
                      @click="setActiveKey(index)"
                      title="激活"
                    >
                      <Check class="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      class="h-7 w-7"
                      @click="checkBalance(index)"
                      :disabled="key.isLoading"
                      title="验证密钥"
                    >
                      <RefreshCw v-if="key.isLoading" class="h-3 w-3 animate-spin" />
                      <RefreshCw v-else class="h-3 w-3" />
                    </Button>
                    <Button
                      v-if="!key.isSystem"
                      variant="destructive"
                      size="icon"
                      class="h-7 w-7"
                      @click="deleteKey(index)"
                      title="删除"
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            </template>
          </div>

          <div v-else class="text-center py-4">
            <AlertCircle class="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p class="text-muted-foreground">没有找到API密钥</p>
            <p class="text-sm text-muted-foreground mt-1">请添加一个新的API密钥</p>
          </div>
        </div>

        <!-- 添加密钥标签页 -->
        <div v-if="activeTab === 'add'" class="space-y-2 py-2 flex-1 overflow-y-auto pr-2 min-h-0 h-[calc(90vh-180px)]" style="overflow-y: auto !important;">
          <div class="space-y-4">
            <div class="space-y-2">
              <label for="mobile-key-name" class="text-sm font-medium">密钥名称</label>
              <Input
                id="mobile-key-name"
                v-model="newKeyName"
                placeholder="例如: 个人账户"
              />
            </div>

            <div class="space-y-2">
              <label for="mobile-key-value" class="text-sm font-medium">API密钥</label>
              <div class="relative">
                <Input
                  id="mobile-key-value"
                  :type="isVisible ? 'text' : 'password'"
                  v-model="newKeyValue"
                  placeholder="输入您的FAL.AI API密钥"
                  class="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  class="absolute right-0 top-0 h-full"
                  @click="toggleVisibility"
                  :title="isVisible ? '隐藏API密钥' : '显示API密钥'"
                >
                  <EyeOff v-if="isVisible" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </Button>
              </div>
              <p class="text-sm text-muted-foreground mt-1">
                您可以在 <a href="https://fal.ai/dashboard/keys" target="_blank" class="text-primary hover:underline">FAL.AI 控制面板</a> 中获取API密钥
              </p>
            </div>

            <div class="space-y-2">
              <label for="mobile-key-group" class="text-sm font-medium">分组</label>
              <div class="relative">
                <Input
                  id="mobile-key-group"
                  v-model="newKeyGroup"
                  placeholder="输入分组名称或选择现有分组"
                  list="mobile-group-options"
                />
                <datalist id="mobile-group-options">
                  <option v-for="group in groups" :key="group" :value="group">{{ group }}</option>
                </datalist>
              </div>
              <p class="text-sm text-muted-foreground mt-1">
                分组可以帮助您更好地组织和管理大量密钥
              </p>
            </div>
          </div>
        </div>
      </div>

      <SheetFooter class="mt-2">
        <Button v-if="activeTab === 'add'" @click="addNewKey" class="gap-2 w-full">
          <Plus class="h-4 w-4" />
          添加密钥
        </Button>
        <Button v-else variant="outline" @click="() => isSheetOpen = false" class="w-full">
          关闭
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
