// 考生数据存储 - Supabase 实现（保持同步 API）
import { supabase } from '../lib/supabase';
import { candidateToCamel, candidateToSnake, type CandidateSnake } from '../lib/transforms';
import { getCurrentAcademyId } from '../lib/academy';

export interface Candidate {
  id: string;
  groupId: string;
  name: string;
  idCard: string;
  registrationNo?: string;
  candidateNo?: string;
  phone?: string;
  status: 'waiting' | 'drawn' | 'absent' | 'completed';
  drawnNumber?: number;
  drawnTime?: string;
}

// 内存缓存
let candidatesCache: Candidate[] | null = null;

// 从 Supabase 加载数据到缓存（带学院过滤 - 通过 group -> batch 关联）
const loadFromSupabase = async (): Promise<Candidate[]> => {
  try {
    const academyId = getCurrentAcademyId();
    if (!academyId) {
      console.log('未选择学院，跳过加载考生数据');
      return [];
    }
    
    // 首先获取本学院的所有分组ID
    const { data: groupData, error: groupError } = await supabase
      .from('lottery_groups')
      .select('id')
      .eq('academy_id', academyId!);
      
    if (groupError) {
      console.error('Failed to load groups for candidate filter:', groupError);
      return [];
    }
    
    const groupIds = (groupData || []).map((g: { id: string }) => g.id);
    
    if (groupIds.length === 0) {
      return []; // 本学院没有分组，直接返回空数据
    }
    
    // 查询这些分组下的所有考生
    const { data, error } = await supabase
      .from('lottery_candidates')
      .select('*')
      .in('group_id', groupIds); // 关键：只查本学院分组的考生
    
    if (error) {
      console.error('Failed to load candidates from Supabase:', error);
      return [];
    }
    
    return (data || []).map((item) => candidateToCamel(item as CandidateSnake));
  } catch (error) {
    console.error('Failed to load candidates:', error);
    return [];
  }
};

// 确保缓存已初始化
const ensureCache = async (): Promise<Candidate[]> => {
  if (candidatesCache === null) {
    candidatesCache = await loadFromSupabase();
  }
  return candidatesCache || [];
};

// 同步获取缓存
const getCacheSync = (): Candidate[] => {
  return candidatesCache || [];
};

// ========== 初始化 API ==========

// 手动初始化（登录后调用）
export const initCandidateStorage = async (): Promise<void> => {
  await ensureCache();
};

// ========== 同步 API（保持与原 contract 一致）==========

// 获取所有考生
export const getAllCandidates = (): Candidate[] => {
  return getCacheSync();
};

// 获取单个考生
export const getCandidateById = (id: string): Candidate | undefined => {
  const candidates = getCacheSync();
  return candidates.find((candidate) => candidate.id === id);
};

// 根据分组ID获取考生
export const getCandidatesByGroupId = (groupId: string): Candidate[] => {
  const candidates = getCacheSync();
  return candidates.filter((candidate) => candidate.groupId === groupId);
};

// 根据批次ID获取所有考生（通过分组关联）
export const getCandidatesByBatchId = (batchId: string, groups: any[]): Candidate[] => {
  const batchGroupIds = groups.filter((g) => g.batchId === batchId).map((g) => g.id);
  const candidates = getCacheSync();
  return candidates.filter((candidate) => batchGroupIds.includes(candidate.groupId));
};

// 添加考生（ID 由数据库自动生成）
export const addCandidate = async (candidate: Omit<Candidate, 'id'>): Promise<string | null> => {
  const snakeCandidate = candidateToSnake(candidate as Candidate);
  // 删除 id 字段，让数据库自动生成
  const { id: _, ...insertData } = snakeCandidate as any;
  
  const { data, error } = await supabase
    .from('lottery_candidates')
    .insert(insertData)
    .select('id')
    .single();
    
  if (error) {
    console.error('Failed to add candidate to Supabase:', error);
    return null;
  }
  
  // 用数据库返回的真实 ID 更新本地缓存
  const realId = (data as any).id;
  const candidates = getCacheSync();
  candidates.push({ ...candidate as Candidate, id: realId });
  candidatesCache = candidates;
  
  return realId;
};

// 批量添加考生（ID 由数据库自动生成）
export const addCandidates = async (newCandidates: Omit<Candidate, 'id'>[]): Promise<string[]> => {
  if (newCandidates.length === 0) return [];
  
  const snakeCandidates = newCandidates.map((c) => {
    const { id: _, ...data } = candidateToSnake(c as Candidate) as any;
    return data;
  });
  
  const { data, error } = await supabase
    .from('lottery_candidates')
    .insert(snakeCandidates as never)
    .select('id');
    
  if (error) {
    console.error('Failed to add candidates to Supabase:', error);
    return [];
  }
  
  // 用数据库返回的真实 ID 更新本地缓存
  const realIds = (data as any[]).map((d, i) => {
    const id = d.id;
    const candidates = getCacheSync();
    candidates.push({ ...newCandidates[i] as Candidate, id });
    candidatesCache = candidates;
    return id;
  });
  
  return realIds;
};

// 更新考生
export const updateCandidate = (id: string, updates: Partial<Candidate>): void => {
  const candidates = getCacheSync();
  const index = candidates.findIndex((candidate) => candidate.id === id);
  if (index !== -1) {
    candidates[index] = { ...candidates[index], ...updates };
    candidatesCache = candidates;
  }
  
  const snakeUpdates = candidateToSnake(updates);
  supabase
    .from('lottery_candidates')
    .update(snakeUpdates as never)
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.error('Failed to update candidate in Supabase:', error);
    });
};

// 删除考生
export const deleteCandidate = (id: string): void => {
  const candidates = getCacheSync();
  candidatesCache = candidates.filter((candidate) => candidate.id !== id);
  
  supabase
    .from('lottery_candidates')
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.error('Failed to delete candidate from Supabase:', error);
    });
};

// 删除分组下的所有考生
export const deleteCandidatesByGroupId = (groupId: string): void => {
  const candidates = getCacheSync();
  candidatesCache = candidates.filter((candidate) => candidate.groupId !== groupId);
  
  supabase
    .from('lottery_candidates')
    .delete()
    .eq('group_id', groupId)
    .then(({ error }) => {
      if (error) console.error('Failed to delete candidates by group from Supabase:', error);
    });
};

// 清空所有考生（带学院过滤 - 通过 group 关联）
export const clearAllCandidates = (): void => {
  candidatesCache = [];
  
  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法清空考生');
    return;
  }
  
  // 通过子查询删除本学院的所有考生
  const groupIdsQuery = supabase.from('lottery_groups').select('id').eq('academy_id', academyId!);
  supabase
    .from('lottery_candidates')
    .delete()
    .in('group_id', groupIdsQuery as never)
    .then(({ error }) => {
      if (error) console.error('Failed to clear candidates from Supabase:', error);
    });
};

// 获取分组考生统计
export const getGroupCandidateStats = (groupId: string) => {
  const candidates = getCandidatesByGroupId(groupId);
  return {
    total: candidates.length,
    waiting: candidates.filter((c) => c.status === 'waiting').length,
    drawn: candidates.filter((c) => c.status === 'drawn').length,
    absent: candidates.filter((c) => c.status === 'absent').length,
  };
};

// ========== 异步 API（用于强制刷新）==========

// 强制从 Supabase 刷新数据
export const refreshCandidates = async (): Promise<Candidate[]> => {
  candidatesCache = await loadFromSupabase();
  return candidatesCache;
};
