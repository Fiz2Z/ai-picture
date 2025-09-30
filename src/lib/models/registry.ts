import type { Model } from "@/types/flux";
import * as imageModels from "./image-models";

const extractModels = (module: Record<string, unknown>): Model[] =>
  Object.values(module).filter((value): value is Model => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      'id' in value &&
      'inputSchema' in value &&
      'outputSchema' in value
    );
  });

// Get all exported models
const imageModelsList = extractModels(imageModels);

// Export all models in a single array
export const allModels = [...imageModelsList];

// Create model categories
export const modelCategories = [
  {
    title: '绘画模型',
    models: imageModelsList,
  },
];
