// 批次数据存储 - Supabase 实现（保持同步 API）
import { supabase } from '../lib/supabase';
import { batchToCamel, batchToSnake, type BatchSnake } from '../lib/transforms';
import { getCurrentAcademyId } from '../lib/academy';

export interface Batch {
  id: string;
  name: string;
  year: string;
  semester: string;
  academy: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  totalGroups: number;
  totalCandidates: number;
}

// 内存缓存
let batchesCache: Batch[] | null = null;

// 从 Supabase 加载数据到缓存（带学院过滤）
const loadFromSupabase = async (): Promise<Batch[]> => {
  try {
    const academyId = getCurrentAcademyId();
    if (!academyId) {
      console.log('未选择学院，跳过加载批次数据');
      return [];
    }
    
    const { data, error } = await supabase
      .from('lottery_batches')
      .select('*')
      .eq('academy_id', academyId!)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load batches from Supabase:', error);
      return [];
    }

    return (data || []).map((batch) => batchToCamel(batch as BatchSnake));
  } catch (error) {
    console.error('Failed to load batches:', error);
    return [];
  }
};

// 确保缓存已初始化
const ensureCache = async (): Promise<Batch[]> => {
  if (batchesCache === null) {
    batchesCache = await loadFromSupabase();
  }
  return batchesCache || [];
};

// 同步获取缓存
const getCacheSync = (): Batch[] => {
  return batchesCache || [];
};

// ========== 初始化 API ==========

// 手动初始化（登录后调用）
export const initBatchStorage = async (): Promise<void> => {
  await ensureCache();
};

// ========== 同步 API（保持与原 contract 一致）==========

// 获取所有批次
export const getAllBatches = (): Batch[] => {
  return getCacheSync();
};

// 获取单个批次
export const getBatchById = (id: string): Batch | undefined => {
  const batches = getCacheSync();
  return batches.find((batch) => batch.id === id);
};

// 添加批次（ID 由数据库自动生成）
export const addBatch = async (batch: Omit<Batch, 'id'>): Promise<string | null> => {
  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法添加批次');
    return null;
  }

  const snakeBatch = batchToSnake(batch as Batch);
  const { id: _, ...insertData } = snakeBatch as any;
  
  const { data, error } = await supabase
    .from('lottery_batches')
    .insert({ ...insertData, academy_id: academyId })
    .select('id')
    .single();
    
  if (error) {
    console.error('Failed to add batch to Supabase:', error);
    return null;
  }
  
  const realId = (data as any).id;
  const batches = getCacheSync();
  batches.unshift({ ...batch as Batch, id: realId });
  batchesCache = batches;
  
  return realId;
};

// 更新批次（带学院过滤）
export const updateBatch = (id: string, updates: Partial<Batch>): void => {
  const batches = getCacheSync();
  const index = batches.findIndex((batch) => batch.id === id);
  if (index !== -1) {
    batches[index] = { ...batches[index], ...updates };
    batchesCache = batches;
  }

  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法更新批次');
    return;
  }
  
  const snakeUpdates = batchToSnake(updates);
  supabase
    .from('lottery_batches')
    .update(snakeUpdates as never)
    .eq('id', id)
    .eq('academy_id', academyId!)
    .then(({ error }) => {
      if (error) console.error('Failed to update batch in Supabase:', error);
    });
};

// 删除批次（带学院过滤）
export const deleteBatch = (id: string): void => {
  const batches = getCacheSync();
  batchesCache = batches.filter((batch) => batch.id !== id);

  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法删除批次');
    return;
  }
  
  supabase
    .from('lottery_batches')
    .delete()
    .eq('id', id)
    .eq('academy_id', academyId!)
    .then(({ error }) => {
      if (error) console.error('Failed to delete batch from Supabase:', error);
    });
};

// 清空所有批次（带学院过滤）
export const clearAllBatches = (): void => {
  batchesCache = [];

  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法清空批次');
    return;
  }
  
  supabase
    .from('lottery_batches')
    .delete()
    .eq('academy_id', academyId!)
    .then(({ error }) => {
      if (error) console.error('Failed to clear batches from Supabase:', error);
    });
};

// 更新批次统计信息
export const updateBatchStats = (batchId: string, totalGroups: number, totalCandidates: number): void => {
  updateBatch(batchId, { totalGroups, totalCandidates });
};

// ========== 异步 API（用于强制刷新）==========

// 强制从 Supabase 刷新数据
export const refreshBatches = async (): Promise<Batch[]> => {
  batchesCache = await loadFromSupabase();
  return batchesCache;
};
