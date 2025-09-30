import { imageModels } from "./image-models";

// Export all models in a single array（按照定义顺序）
export const allModels = [...imageModels];

// Create model categories
export const modelCategories = [
  {
    title: '绘画模型',
    models: imageModels,
  },
];
