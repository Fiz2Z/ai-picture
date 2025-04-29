import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// 从环境变量获取Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 获取或创建用户ID
export const getUserId = (): string => {
  // 尝试从localStorage获取用户ID
  let userId = localStorage.getItem('fal-ai-user-id');
  
  // 如果不存在，创建一个新的UUID并保存
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('fal-ai-user-id', userId);
  }
  
  return userId;
};

// 当前用户ID
export const currentUserId = getUserId();

// 检查是否是当前用户的记录
export const isCurrentUserRecord = (userId: string): boolean => {
  return userId === currentUserId;
};
