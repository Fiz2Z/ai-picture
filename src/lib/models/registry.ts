import type { Model, ModelParameter, ModelParameterType, PropertyDefinition } from "@/types/flux"; // **新增导入 ModelParameter, ModelParameterType, PropertyDefinition**
import * as textToText from "./flux/text-to-text";

// Get all exported models from text-to-text
const textToTextModels = Object.values(textToText).filter(
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

// 定义你的新模型 Jimeng 3.0
const jimengModel: Model = {
  id: 'jimeng-3.0', // 给你的模型一个唯一的ID
  name: 'Jimeng 3.0', // 显示在界面的模型名称
  description: '一个由您提供的第三方图像生成模型', // 模型的简要描述
  apiEndpoint: 'https://jimeng.yuccc.cc/v1/images/generations', // 新模型的API地址
  inputSchema: [ // 定义模型接受的参数
    {
      key: 'prompt',
      type: 'string' as ModelParameterType, // **明确类型**
      required: true,
      description: '文本提示词',
      default: ''
    } as ModelParameter, // **明确对象类型**
    {
      key: 'negativePrompt',
      type: 'string' as ModelParameterType, // **明确类型**
      description: '负面提示词',
      default: ''
    } as ModelParameter, // **明确对象类型**
    {
      key: 'width',
      type: 'number' as ModelParameterType, // **明确类型**
      required: true,
      description: '图像宽度',
      default: 1024,
      min: 512,
      max: 2048,
      step: 64
    } as ModelParameter, // **明确对象类型**
    {
      key: 'height',
      type: 'number' as ModelParameterType, // **明确类型**
      required: true,
      description: '图像高度',
      default: 1024,
      min: 512,
      max: 2048,
      step: 64
    } as ModelParameter, // **明确对象类型**
    {
      key: 'sample_strength',
      type: 'number' as ModelParameterType, // **明确类型**
      description: '采样强度',
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.01
    } as ModelParameter // **明确对象类型**
  ],
  outputSchema: [ // 定义模型输出的结构
    {
      key: 'images',
      type: 'array' as ModelParameterType, // **明确类型**
      description: '生成的图像列表',
      items: { // **items 内部也需要类型明确**
        type: 'object' as ModelParameterType, // **明确类型**
        properties: {
          url: {
            type: 'string' as ModelParameterType // **明确类型**
          } as PropertyDefinition // **明确对象类型**
        }
      } as any, // <-- 这里我们遇到一个复杂结构。items 的类型定义在 ModelParameter 里比较简化。为了避免更复杂的类型修改，这里可以暂时使用 any 或者更精确的类型 (但需要修改 ModelParameter 的 items 定义)。先用 any 试试能否通过。
    } as ModelParameter, // **明确对象类型**
    {
      key: 'created', // 响应中的创建时间
      type: 'number' as ModelParameterType, // **明确类型**
      description: '生成创建时间戳'
    } as ModelParameter // **明确对象类型**
  ],
  // 添加一个属性来标识这不是一个FalAI模型，可能在UI或其他地方有用
  isThirdParty: true,
  // 添加一个 category 属性，方便分类，比如可以创建一个新的分类 '第三方模型'
  category: '第三方模型'
};

// 将新模型添加到 allModels 数组中
export const allModels = [...textToTextModels, jimengModel];

// 创建模型分类 (这里我们直接修改现有的，添加一个新分类)
// 注意：这部分在 src/router/models.ts 中也有，我们在这里修改，然后在 src/router/models.ts 中调整分类逻辑
export const modelCategories = [
  {
    title: 'Flux 模型',
    models: allModels.filter(model => model.id.includes('flux'))
  },
  {
    title: '第三方模型', // 新的分类标题
    models: allModels.filter(model => model.id.includes('jimeng')) // 根据新模型的ID过滤
  }
];

// // Export all models in a single array
// export const allModels = [...textToTextModels]; // 这行之前已经确认是多余的并删除，保留注释表示已处理