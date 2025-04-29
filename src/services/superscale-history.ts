import { supabase, currentUserId } from '@/lib/supabase'; // 导入 Supabase 客户端和 currentUserId (来自 localStorage)
import type { SuperscaledImage } from '@/types/flux'; // 导入我们之前定义的类型

// 定义从 Supabase 获取的数据类型
export interface SupabaseSuperscaledImage {
  id: string;
  user_id: string; // 注意：这里存储的是 localStorage 生成的 UUID
  original_image_url: string;
  superscaled_image_url: string;
  created_at: string;
  original_width?: number;
  original_height?: number;
  upscaled_width?: number;
  upscaled_height?: number;
  checkpoint?: string;
  overlapping_tiles?: boolean;
  request_id?: string;
}

/**
 * 将超分记录保存到 Supabase
 * @param record 要保存的超分图片信息 (不包含 id 和 timestamp)
 * @returns Promise<{ success: boolean; error?: any }>
 */
 // --- 参数类型恢复为 Omit<..., 'id' | 'timestamp'> ---
export async function saveSuperscaleRecord(record: Omit<SuperscaledImage, 'id' | 'timestamp'> & { requestId?: string }): Promise<{ success: boolean; error?: any }> {
  // --- 直接使用 currentUserId (来自 localStorage) ---
  if (!currentUserId) {
    // 理论上 currentUserId 总会生成一个，但以防万一
    console.error('保存超分记录失败：无法获取用户ID');
    return { success: false, error: '无法获取用户ID' };
  }

  const recordToInsert = {
    user_id: currentUserId, // 使用 localStorage 的 UUID
    original_image_url: record.originalImageUrl,
    superscaled_image_url: record.superscaledImageUrl,
    original_width: record.originalWidth,
    original_height: record.originalHeight,
    upscaled_width: record.upscaledWidth,
    upscaled_height: record.upscaledHeight,
    checkpoint: record.checkpoint,
    overlapping_tiles: record.overlappingTiles,
    request_id: record.requestId,
  };

  console.log('💾 正在保存超分记录到 Supabase:', recordToInsert);

  const { error } = await supabase
    .from('superscaled_images')
    .insert([recordToInsert]);

  if (error) {
    // --- 错误处理保持不变，因为外键约束已移除 ---
    console.error('❌ 保存超分记录到 Supabase 失败:', error);
    return { success: false, error };
  }

  console.log('✅ 超分记录已成功保存到 Supabase');
  return { success: true };
}

/**
 * 从 Supabase 获取当前用户的超分记录
 * @returns Promise<SuperscaledImage[]>
 */
export async function fetchSuperscaleRecords(): Promise<SuperscaledImage[]> {
  // --- 直接使用 currentUserId (来自 localStorage) ---
  if (!currentUserId) {
    console.warn('获取超分记录：无法获取用户ID');
    return [];
  }

  console.log('⬇️ 正在从 Supabase 获取超分记录...');

  const { data, error } = await supabase
    .from('superscaled_images')
    .select('*')
    // .eq('user_id', currentUserId) // 使用 localStorage 的 UUID 进行过滤
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 从 Supabase 获取超分记录失败:', error);
    return [];
  }

  console.log(`✅ 成功获取 ${data?.length ?? 0} 条超分记录`);

  const formattedData: SuperscaledImage[] = data?.map(item => ({
    id: item.id,
    originalImageUrl: item.original_image_url,
    superscaledImageUrl: item.superscaled_image_url,
    timestamp: new Date(item.created_at).getTime(),
    originalWidth: item.original_width,
    originalHeight: item.original_height,
    upscaledWidth: item.upscaled_width,
    upscaledHeight: item.upscaled_height,
    checkpoint: item.checkpoint,
    overlappingTiles: item.overlapping_tiles,
    requestId: item.request_id,
  })) || [];

  return formattedData;
}

 /**
  * 从 Supabase 删除指定的超分记录
  * @param id 要删除的记录 ID
  * @returns Promise<{ success: boolean; error?: any }>
  */
 export async function deleteSuperscaleRecord(id: string): Promise<{ success: boolean; error?: any }> {
   // --- 直接使用 currentUserId (来自 localStorage) ---
   if (!currentUserId) {
     console.error('删除超分记录失败：无法获取用户ID');
     return { success: false, error: '无法获取用户ID' };
   }

   console.log(`🗑️ 正在从 Supabase 删除超分记录: ${id}`);

   const { error } = await supabase
     .from('superscaled_images')
     .delete()
     .eq('id', id)
    //  .eq('user_id', currentUserId); // 使用 localStorage 的 UUID 进行过滤

   if (error) {
     console.error(`❌ 删除超分记录 ${id} 失败:`, error);
     return { success: false, error };
   }

   console.log(`✅ 超分记录 ${id} 已成功删除`);
   return { success: true };
 }