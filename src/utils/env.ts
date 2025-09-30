// 环境变量工具函数
declare global {
  interface Window {
    APP_CONFIG?: {
      VITE_IMAGE_API_URL?: string;
      VITE_IMAGE_API_KEY?: string;
    };
  }
}

/**
 * 获取环境变量值
 * 优先使用运行时配置，fallback到构建时环境变量
 */
export function getEnvVar(key: keyof NonNullable<Window['APP_CONFIG']>): string | undefined {
  // 1. 尝试从运行时配置获取
  if (typeof window !== 'undefined' && window.APP_CONFIG) {
    const value = window.APP_CONFIG[key];
    // 如果值不是占位符模板，则使用它
    if (value && !value.startsWith('${') && !value.endsWith('}')) {
      return value;
    }
  }

  // 2. Fallback到构建时环境变量
  switch (key) {
    case 'VITE_IMAGE_API_URL':
      return import.meta.env.VITE_IMAGE_API_URL;
    case 'VITE_IMAGE_API_KEY':
      return import.meta.env.VITE_IMAGE_API_KEY;
    default:
      return undefined;
  }
}

// 便捷的环境变量获取函数
export const ENV = {
  IMAGE_API_URL: () => getEnvVar('VITE_IMAGE_API_URL') || 'https://api.gpt.ge',
  IMAGE_API_KEY: () => getEnvVar('VITE_IMAGE_API_KEY'),
};
