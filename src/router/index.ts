// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { modelRoutes } from './models';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: 'AI Picture' // 首页标题
    }
  },
  {
    path: '/models',
    name: 'Models',
    component: () => import('@/views/ModelsPage.vue'),
    meta: {
      title: '所有模型 - AI Picture' // 修改标题，保持一致性
    }
  },
  // 动态添加所有模型路由
  ...modelRoutes,
  // 你的 404 错误页面是重定向到首页，这没问题
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 添加滚动行为，切换路由时滚动到顶部
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// 全局前置守卫 - 设置页面标题
router.beforeEach((to, _from, next) => {
  // 设置页面标题，使用更健壮的方式
  const defaultTitle = 'AI Picture';
  document.title = (to.meta.title as string) || defaultTitle;
  next();
});

export default router;