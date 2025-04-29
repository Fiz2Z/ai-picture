<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-vue-next";
import { modelCategories } from '@/router/models';

// 搜索功能
const searchQuery = ref('');
const activeTab = ref('all');

// 过滤模型
const filteredModels = (categoryModels: any[]) => {
  if (!searchQuery.value) return categoryModels;

  return categoryModels.filter(model =>
    model.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    model.id.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
};
</script>

<template>
  <ScrollArea class="h-[calc(100vh-4rem)] w-full">
    <main class="container mx-auto py-8 px-4">
    <div class="flex flex-col items-center space-y-8">
      <h1 class="text-4xl font-bold text-center">FAL.AI 模型库</h1>
      <p class="text-muted-foreground text-center max-w-2xl">
        浏览所有可用的AI模型，选择最适合您需求的模型
      </p>

      <!-- 搜索栏 -->
      <div class="w-full max-w-md relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="搜索模型..."
          class="pl-10"
        />
      </div>

      <!-- 模型分类标签页 -->
      <Tabs v-model="activeTab" class="w-full max-w-4xl">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="all">所有模型</TabsTrigger>
          <TabsTrigger value="flux">Flux 模型</TabsTrigger>
        </TabsList>

        <!-- 所有模型 -->
        <TabsContent value="all" class="mt-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <RouterLink
              v-for="model in filteredModels(modelCategories.flatMap(cat => cat.models))"
              :key="model.id"
              :to="`/models/${model.id.replace(/\//g, '-')}`"
              class="block"
            >
              <Card class="h-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                <CardHeader>
                  <CardTitle>{{ model.name }}</CardTitle>
                  <CardDescription class="truncate">{{ model.id }}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p class="text-sm text-muted-foreground">
                    {{ model.inputSchema.length }} 输入参数 | {{ model.outputSchema.length }} 输出参数
                  </p>
                </CardContent>
              </Card>
            </RouterLink>
          </div>
        </TabsContent>

        <!-- Flux 模型 -->
        <TabsContent value="flux" class="mt-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <RouterLink
              v-for="model in filteredModels(modelCategories[0].models)"
              :key="model.id"
              :to="`/models/${model.id.replace(/\//g, '-')}`"
              class="block"
            >
              <Card class="h-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                <CardHeader>
                  <CardTitle>{{ model.name }}</CardTitle>
                  <CardDescription class="truncate">{{ model.id }}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p class="text-sm text-muted-foreground">
                    {{ model.inputSchema.length }} 输入参数 | {{ model.outputSchema.length }} 输出参数
                  </p>
                </CardContent>
              </Card>
            </RouterLink>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </main>
  </ScrollArea>
</template>
