// 分组数据存储 - Supabase 实现（保持同步 API）
import { supabase } from '../lib/supabase';
import { groupToCamel, groupToSnake, type GroupSnake } from '../lib/transforms';
import { getCurrentAcademyId } from '../lib/academy';

export interface Group {
  id: string;
  batchId: string;
  batchName: string;
  name: string;
  description: string;
  candidateCount: number;
  createdAt: string;
  examRoomId: string;
  examRoomName?: string;
  date: string;
  time: string;
  endTime: string;
  volunteerIds?: string[];
}

// 内存缓存
let groupsCache: Group[] | null = null;

// 从 Supabase 加载数据到缓存（包括关联表数据，带学院过滤）
const loadFromSupabase = async (): Promise<Group[]> => {
  try {
    const academyId = getCurrentAcademyId();
    if (!academyId) {
      console.log('未选择学院，跳过加载分组数据');
      return [];
    }
    
    // 获取分组列表（带学院过滤）
    const { data: groupsData, error: groupsError } = await supabase
      .from('lottery_groups')
      .select('*')
      .eq('academy_id', academyId!)
      .order('created_at', { ascending: false });
      
    if (groupsError) {
      console.error('Failed to load groups from Supabase:', groupsError);
      return [];
    }
    
    // 获取分组-志愿者关联
    const { data: gvData, error: gvError } = await supabase
      .from('lottery_group_volunteers')
      .select('*');
      
    if (gvError) {
      console.error('Failed to load group-volunteer relations:', gvError);
    }
    
    // 合并数据
    const groups = (groupsData || []).map((g: any) => {
      const groupId = g.id;
      const volunteerIds = (gvData || [])
        .filter((gv: any) => gv.group_id === groupId)
        .map((gv: any) => gv.volunteer_id);
      
      const group = groupToCamel({ ...g, volunteer_ids: volunteerIds } as GroupSnake);
      // 确保 examRoomId 不为 null，保留 volunteerIds
      return {
        ...group,
        examRoomId: group.examRoomId || '',
        description: group.description || '',
        volunteerIds: volunteerIds,
      } as Group;
    });
    
    return groups;
  } catch (error) {
    console.error('Failed to load groups:', error);
    return [];
  }
};

// 确保缓存已初始化
const ensureCache = async (): Promise<Group[]> => {
  if (groupsCache === null) {
    groupsCache = await loadFromSupabase();
  }
  return groupsCache || [];
};

// 同步获取缓存
const getCacheSync = (): Group[] => {
  return groupsCache || [];
};

// ========== 初始化 API ==========

// 手动初始化（登录后调用）
export const initGroupStorage = async (): Promise<void> => {
  await ensureCache();
};

// ========== 同步 API（保持与原 contract 一致）==========

// 获取所有分组
export const getAllGroups = (): Group[] => {
  return getCacheSync();
};

// 获取单个分组
export const getGroupById = (id: string): Group | undefined => {
  const groups = getCacheSync();
  return groups.find((group) => group.id === id);
};

// 根据批次ID获取分组
export const getGroupsByBatchId = (batchId: string): Group[] => {
  const groups = getCacheSync();
  return groups.filter((group) => group.batchId === batchId);
};

// 根据考场ID获取分组
export const getGroupsByExamRoomId = (examRoomId: string): Group[] => {
  const groups = getCacheSync();
  return groups.filter((group) => group.examRoomId === examRoomId);
};

// 添加分组（ID 由数据库自动生成）
export const addGroup = async (group: Omit<Group, 'id'>): Promise<string | null> => {
  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法添加分组');
    return null;
  }

  // 分离志愿者关联数据
  const { volunteerIds, ...groupData } = group;
  const snakeGroup = groupToSnake(groupData as Group);
  
  // 删除 id 字段，让数据库自动生成
  const { id: _, ...insertData } = snakeGroup as any;
  
  const { data, error } = await supabase
    .from('lottery_groups')
    .insert({ ...insertData, academy_id: academyId })
    .select('id')
    .single();
    
  if (error) {
    console.error('Failed to add group to Supabase:', error);
    return null;
  }
  
  // 用数据库返回的真实 ID 更新本地缓存
  const realId = (data as any).id;
  const groups = getCacheSync();
  groups.push({ ...group as Group, id: realId });
  groupsCache = groups;
  
  // 同步志愿者分配到关联表
  if (volunteerIds && volunteerIds.length > 0) {
    volunteerIds.forEach((volunteerId) => {
      supabase
        .from('lottery_group_volunteers')
        .insert({
          group_id: realId,
          volunteer_id: volunteerId,
        } as never)
        .then(({ error }) => {
          if (error) console.error('Failed to assign volunteer to group:', error);
        });
    });
  }
  
  return realId;
};

// 更新分组（带学院过滤）
export const updateGroup = (id: string, updates: Partial<Group>): void => {
  const groups = getCacheSync();
  const index = groups.findIndex((group) => group.id === id);
  if (index !== -1) {
    groups[index] = { ...groups[index], ...updates };
    groupsCache = groups;
  }
  
  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法更新分组');
    return;
  }
  
  const { volunteerIds, ...groupData } = updates;
  const snakeUpdates = groupToSnake(groupData as Group);
  
  supabase
    .from('lottery_groups')
    .update(snakeUpdates as never)
    .eq('id', id)
    .eq('academy_id', academyId!)
    .then(({ error }) => {
      if (error) console.error('Failed to update group in Supabase:', error);
    });
  
  // 如果有志愿者更新，同步到关联表
  if (volunteerIds !== undefined) {
    // 先删除旧关联
    supabase
      .from('lottery_group_volunteers')
      .delete()
      .eq('group_id', id)
      .then(() => {
        // 添加新关联
        if (volunteerIds.length > 0) {
          volunteerIds.forEach((volunteerId) => {
            supabase
              .from('lottery_group_volunteers')
              .insert({
                group_id: id,
                volunteer_id: volunteerId,
              } as never)
              .then(({ error }) => {
                if (error) console.error('Failed to update volunteer assignment:', error);
              });
          });
        }
      });
  }
};

// 删除分组（带学院过滤）
export const deleteGroup = (id: string): void => {
  const groups = getCacheSync();
  groupsCache = groups.filter((group) => group.id !== id);

  // 先删除关联表数据
  supabase
    .from('lottery_group_volunteers')
    .delete()
    .eq('group_id', id)
    .then(() => {
      // 再删除分组
      supabase
        .from('lottery_groups')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Failed to delete group from Supabase:', error);
        });
    });
};

// 删除批次下的所有分组（带学院过滤）
export const deleteGroupsByBatchId = (batchId: string): void => {
  const groups = getCacheSync();
  const groupIds = groups.filter((g) => g.batchId === batchId).map((g) => g.id);
  
  groupsCache = groups.filter((group) => group.batchId !== batchId);
  
  if (groupIds.length > 0) {
    supabase
      .from('lottery_group_volunteers')
      .delete()
      .in('group_id', groupIds)
      .then(() => {
        supabase
          .from('lottery_groups')
          .delete()
          .eq('batch_id', batchId)
          .then(({ error }) => {
            if (error) console.error('Failed to delete groups by batch from Supabase:', error);
          });
      });
  }
};

// 清空所有分组（带学院过滤）
export const clearAllGroups = (): void => {
  groupsCache = [];
  
  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法清空分组');
    return;
  }
  
  const groupIdsQuery = supabase.from('lottery_groups').select('id').eq('academy_id', academyId!);
  supabase
    .from('lottery_group_volunteers')
    .delete()
    .in('group_id', groupIdsQuery as never)
    .then(() => {
      supabase
        .from('lottery_groups')
        .delete()
        .eq('academy_id', academyId!)
        .then(({ error }) => {
          if (error) console.error('Failed to clear groups from Supabase:', error);
        });
    });
};

// 更新分组考生数量
export const updateGroupCandidateCount = (groupId: string, count: number): void => {
  updateGroup(groupId, { candidateCount: count });
};

// ========== 异步 API（用于强制刷新）==========

// 强制从 Supabase 刷新数据
export const refreshGroups = async (): Promise<Group[]> => {
  groupsCache = await loadFromSupabase();
  return groupsCache;
};

// 分配志愿者给分组（兼容旧代码）
export const assignVolunteersToGroup = (groupId: string, volunteerIds: string[]): void => {
  updateGroup(groupId, { volunteerIds });
};

// 根据志愿者ID获取分组（兼容旧代码）
export const getGroupsByVolunteerId = (volunteerId: string): Group[] => {
  const groups = getCacheSync();
  return groups.filter((g) => g.volunteerIds?.includes(volunteerId) || false);
};
