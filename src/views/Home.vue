<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { modelCategories } from "@/router/models";
import { ArrowRight, Sparkles, Zap, Image } from "lucide-vue-next";

// 取前3个模型作为推荐
const featuredModels = modelCategories.flatMap(cat => cat.models).slice(0, 3);
</script>

<template>
  <ScrollArea class="h-[calc(100vh-4rem)] w-full">
    <main class="container mx-auto py-8 px-4">
    <div class="flex flex-col items-center space-y-12">
      <!-- 英雄区域 -->
      <div class="w-full max-w-5xl text-center py-12">
        <h1 class="text-5xl font-bold mb-6">FAL.AI Web 界面</h1>
        <p class="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          使用FAL.AI强大的AI模型生成惊人的图像，简单、快速、高效
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <RouterLink to="/models">浏览所有模型</RouterLink>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <RouterLink to="/models/fal-ai-flux-pro-v1.1">开始生成</RouterLink>
          </Button>
        </div>
      </div>

      <!-- 特点区域 -->
      <div class="w-full max-w-5xl">
        <h2 class="text-3xl font-bold text-center mb-8">为什么选择我们</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Sparkles class="h-8 w-8 text-primary mb-2" />
              <CardTitle>高质量生成</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">使用最新的AI模型生成高质量、高清晰度的图像</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Zap class="h-8 w-8 text-primary mb-2" />
              <CardTitle>快速响应</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">优化的API调用和并行处理，确保生成速度极快</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Image class="h-8 w-8 text-primary mb-2" />
              <CardTitle>多样化模型</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground">支持多种模型和参数调整，满足不同需求</p>
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
              <CardFooter>
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
