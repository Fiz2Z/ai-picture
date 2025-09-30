<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { modelCategories, allModels } from "@/router/models";
import { ArrowRight, Sparkles, Zap, Image } from "lucide-vue-next";
import { useRouter } from 'vue-router';

// 取前3个模型作为推荐
const featuredModels = modelCategories.flatMap(cat => cat.models).slice(0, 3);

const router = useRouter();

// 跳转到第一个模型
const startGeneration = () => {
  if (allModels.length > 0) {
    const firstModel = allModels[0];
    const routeId = firstModel.id.replace(/\//g, '-');
    router.push(`/models/${routeId}`);
  }
};
</script>

<template>
  <ScrollArea class="h-[calc(100vh-4rem)] w-full">
    <main class="container mx-auto py-8 px-4">
    <div class="flex flex-col items-center space-y-12">
      <!-- 英雄区域 -->
      <div class="w-full max-w-5xl text-center py-12">
        <h1 class="text-5xl font-bold mb-6">AI Picture 聚合平台</h1>
        <p class="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          一站整合 OpenAI、Google Gemini 等主流图像模型，提供生成、编辑、高清化等全流程能力，让创作更高效、更简单。
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <Button size="lg" @click="startGeneration">
            开始生成
          </Button>
          <Button size="lg" variant="outline" asChild>
            <RouterLink to="/models">浏览所有模型</RouterLink>
          </Button>
        </div>
      </div>

      <!-- 特点区域 -->
      <div class="w-full max-w-5xl">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Sparkles class="h-8 w-8 text-primary mb-2" />
              <CardTitle>多模型聚合</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">整合不同厂商的最新图像模型，任选最佳效果，无需在多个平台之间切换。</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Zap class="h-8 w-8 text-primary mb-2" />
              <CardTitle>智能生成与编辑</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">文本生成、局部重绘、图像编辑一站完成，创作流程更顺畅。</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Image class="h-8 w-8 text-primary mb-2" />
              <CardTitle>一键高清化</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">内置无损放大能力，随时将作品升级为高分辨率版本。</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- 推荐模型 -->
      <div class="w-full max-w-5xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold">推荐模型</h2>
          <Button variant="ghost" asChild>
            <RouterLink to="/models" class="flex items-center gap-2">
              查看全部 <ArrowRight class="h-4 w-4" />
            </RouterLink>
          </Button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <RouterLink
            v-for="model in featuredModels"
            :key="model.id"
            :to="`/models/${model.id.replace(/\//g, '-')}`"
            class="block"
          >
            <Card class="h-full flex flex-col transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
              <CardHeader>
                <CardTitle>{{ model.name }}</CardTitle>
                <CardDescription class="truncate">{{ model.id }}</CardDescription>
              </CardHeader>
              <CardContent class="flex-1">
                <p class="text-sm text-muted-foreground line-clamp-3">
                  {{ model.description || '先进的图像生成模型' }}
                </p>
              </CardContent>
              <CardFooter class="mt-auto">
                <Button variant="secondary" class="w-full">开始生成</Button>
              </CardFooter>
            </Card>
          </RouterLink>
        </div>
      </div>
    </div>
  </main>
  </ScrollArea>
</template>
