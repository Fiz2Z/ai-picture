import type { RouteRecordRaw } from 'vue-router';
import { allModels, modelCategories } from '@/lib/models/registry'; // **修改导入语句**

// 为每个模型创建路由配置
export const modelRoutes: RouteRecordRaw[] = allModels.map(model => {
  const routeId = model.id.replace(/\//g, '-');
  return {
    path: `/models/${routeId}`,
    name: `Model-${routeId}`,
    // 注意：这里的组件路径是写死的 FluxModelPage.vue，我们稍后可能需要调整它以支持非Flux模型
    component: () => import('@/views/FluxModelPage.vue'),
    props: { modelId: routeId },
    meta: {
      title: `${model.name} - FAL.AI`,
      model
    }
  };
});

// 获取模型信息的辅助函数
export function getModelById(id: string) {
  // 这里的逻辑是好的，不需要修改
  return allModels.find(model => model.id.replace(/\//g, '-') === id);
}

// **重新导出 modelCategories**
export { modelCategories };