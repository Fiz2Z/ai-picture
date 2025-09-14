import type { Model } from "@/types/flux";
import * as openrouterModels from "./openrouter/image-models";

// Get all exported models from OpenRouter
const openrouterModelsList = Object.values(openrouterModels).filter(
  (value): value is Model => {
    return (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      "id" in value &&
      "inputSchema" in value &&
      "outputSchema" in value
    );
  }
);

// Export all models in a single array
export const allModels = [...openrouterModelsList];

// Create model categories
export const modelCategories = [
  {
    title: '多模态模型',
    models: allModels.filter(model => model.category === '多模态模型')
  }
];