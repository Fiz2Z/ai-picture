import { supabase, currentUserId, isCurrentUserRecord } from '@/lib/supabase';
import type { Generation, SupabaseGeneration } from '@/types/flux';

// 表名
const GENERATIONS_TABLE = 'generations';

// 本地存储键
const GENERATIONS_STORAGE_KEY = 'fal-ai-generations';

/**
 * 将前端Generation对象转换为Supabase存储格式
 */
export const toSupabaseGeneration = (generation: Generation): Omit<SupabaseGeneration, 'created_at'> => {
  return {
    id: generation.id,
    user_id: currentUserId,
    model_id: generation.modelId,
    model_name: generation.modelName,
    prompt: generation.prompt,
    parameters: generation.parameters,
    output: generation.output
  };
};

/**
 * 将Supabase记录转换为前端Generation对象
 */
export const fromSupabaseGeneration = (record: SupabaseGeneration): Generation => {
  return {
    id: record.id,
    modelId: record.model_id,
    modelName: record.model_name,
    prompt: record.prompt,
    parameters: record.parameters,
    output: record.output,
    timestamp: new Date(record.created_at).getTime(),
    userId: record.user_id,
    isCurrentUser: isCurrentUserRecord(record.user_id)
  };
};

/**
 * 保存生成记录到Supabase
 */
export const saveGeneration = async (generation: Generation): Promise<void> => {
  try {
    // 添加用户ID
    generation.userId = currentUserId;

    // 保存到Supabase
    const { error } = await supabase
      .from(GENERATIONS_TABLE)
      .insert(toSupabaseGeneration(generation));

    if (error) {
      console.error('保存生成记录到Supabase失败:', error);
      // 如果Supabase保存失败，仍然保存到本地
      saveGenerationToLocal(generation);
    } else {
      console.log('生成记录已保存到Supabase');

      // 同时更新本地存储
      const localGenerations = getLocalGenerations();
      localGenerations.unshift(generation);
      localStorage.setItem(GENERATIONS_STORAGE_KEY, JSON.stringify(localGenerations));
    }
  } catch (error) {
    console.error('保存生成记录时发生错误:', error);
    // 出错时保存到本地
    saveGenerationToLocal(generation);
  }
};

/**
 * 保存生成记录到本地存储
 */
const saveGenerationToLocal = (generation: Generation): void => {
  try {
    const localGenerations = getLocalGenerations();
    localGenerations.unshift(generation);
    localStorage.setItem(GENERATIONS_STORAGE_KEY, JSON.stringify(localGenerations));
    console.log('生成记录已保存到本地存储');
  } catch (error) {
    console.error('保存生成记录到本地存储失败:', error);
  }
};

/**
 * 获取本地存储的生成记录
 */
export const getLocalGenerations = (): Generation[] => {
  try {
    const savedGenerations = localStorage.getItem(GENERATIONS_STORAGE_KEY);
    if (savedGenerations) {
      return JSON.parse(savedGenerations);
    }
  } catch (error) {
    console.error('解析本地生成记录失败:', error);
  }
  return [];
};

/**
 * 从Supabase获取生成记录
 * @param page 页码，从1开始
 * @param pageSize 每页记录数量
 * @param currentUserOnly 是否只返回当前用户的记录
 */
export const fetchGenerations = async (page = 1, pageSize = 20, currentUserOnly = false): Promise<{ generations: Generation[], total: number }> => {
  try {
    // 计算分页的起始位置
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 构建查询
    let countQuery = supabase
      .from(GENERATIONS_TABLE)
      .select('id', { count: 'exact' });

    let dataQuery = supabase
      .from(GENERATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    // 如果只查询当前用户的记录
    if (currentUserOnly) {
      countQuery = countQuery.eq('user_id', currentUserId);
      dataQuery = dataQuery.eq('user_id', currentUserId);
    }

    // 并行执行两个查询
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ]);

    // 处理错误
    if (countResult.error || dataResult.error) {
      console.error('从Supabase获取生成记录失败:', countResult.error || dataResult.error);
      // 如果获取失败，返回本地记录
      const localGenerations = getLocalGenerations();
      return {
        generations: localGenerations.slice(from, from + pageSize),
        total: localGenerations.length
      };
    }

    // 如果没有数据
    if (!dataResult.data || dataResult.data.length === 0) {
      console.log('Supabase中没有生成记录，返回本地记录');
      const localGenerations = getLocalGenerations();
      return {
        generations: localGenerations.slice(from, from + pageSize),
        total: localGenerations.length
      };
    }

    // 转换记录格式并标记当前用户
    const generations = dataResult.data.map(record => fromSupabaseGeneration(record as SupabaseGeneration));

    // 更新本地存储
    const localGenerations = getLocalGenerations();
    const mergedGenerations = mergeGenerations(generations, localGenerations);
    localStorage.setItem(GENERATIONS_STORAGE_KEY, JSON.stringify(mergedGenerations));

    return {
      generations: generations,
      total: countResult.count || generations.length
    };
  } catch (error) {
    console.error('获取生成记录时发生错误:', error);
    // 出错时返回本地记录
    const localGenerations = getLocalGenerations();
    // 计算分页的起始位置
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return {
      generations: localGenerations.slice(startIndex, endIndex),
      total: localGenerations.length
    };
  }
};

/**
 * 合并本地和远程生成记录，避免重复
 */
const mergeGenerations = (remoteGenerations: Generation[], localGenerations: Generation[]): Generation[] => {
  const idSet = new Set(remoteGenerations.map(gen => gen.id));
  const uniqueLocalGenerations = localGenerations.filter(gen => !idSet.has(gen.id));
  return [...remoteGenerations, ...uniqueLocalGenerations];
};

/**
 * 删除生成记录
 * @param id 记录ID
 */
export const deleteGeneration = async (id: string): Promise<void> => {
  try {
    // 从Supabase删除
    const { error } = await supabase
      .from(GENERATIONS_TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', currentUserId); // 确保只能删除自己的记录

    if (error) {
      console.error('从Supabase删除生成记录失败:', error);
    } else {
      console.log('生成记录已从Supabase删除');
    }

    // 同时从本地存储删除
    const localGenerations = getLocalGenerations();
    const updatedGenerations = localGenerations.filter(gen => gen.id !== id);
    localStorage.setItem(GENERATIONS_STORAGE_KEY, JSON.stringify(updatedGenerations));
  } catch (error) {
    console.error('删除生成记录时发生错误:', error);
  }
};

/**
 * 清空当前用户的所有生成记录
 */
export const clearAllGenerations = async (): Promise<void> => {
  try {
    // 从Supabase删除当前用户的所有记录
    const { error } = await supabase
      .from(GENERATIONS_TABLE)
      .delete()
      .eq('user_id', currentUserId);

    if (error) {
      console.error('从Supabase清空生成记录失败:', error);
    } else {
      console.log('所有生成记录已从Supabase清空');
    }

    // 清空本地存储
    localStorage.setItem(GENERATIONS_STORAGE_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('清空生成记录时发生错误:', error);
  }
};
