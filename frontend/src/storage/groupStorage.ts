// 分组数据存储
export interface Group {
  id: string;
  batchId: string;
  batchName: string;
  name: string;
  description: string;
  candidateCount: number;
  createdAt: string;
  
  // 考场和时间配置
  examRoomId: string; // 关联的考场ID
  examRoomName?: string; // 考场名称（冗余字段，方便显示）
  date: string; // 面试日期（格式：YYYY-MM-DD）
  time: string; // 面试开始时间（格式：HH:mm）
  endTime: string; // 面试结束时间（格式：HH:mm）
  
  // 志愿者配置
  volunteerIds?: string[]; // 分配的志愿者ID数组
}

const STORAGE_KEY = 'interview_groups';

// 获取所有分组
export const getAllGroups = (): Group[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get groups:', error);
    return [];
  }
};

// 获取单个分组
export const getGroupById = (id: string): Group | undefined => {
  const groups = getAllGroups();
  return groups.find((group) => group.id === id);
};

// 根据批次ID获取分组
export const getGroupsByBatchId = (batchId: string): Group[] => {
  const groups = getAllGroups();
  return groups.filter((group) => group.batchId === batchId);
};

// 根据考场ID获取分组
export const getGroupsByExamRoomId = (examRoomId: string): Group[] => {
  const groups = getAllGroups();
  return groups.filter((group) => group.examRoomId === examRoomId);
};

// 添加分组
export const addGroup = (group: Group): void => {
  try {
    const groups = getAllGroups();
    groups.push(group);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (error) {
    console.error('Failed to add group:', error);
  }
};

// 更新分组
export const updateGroup = (id: string, updates: Partial<Group>): void => {
  try {
    const groups = getAllGroups();
    const index = groups.findIndex((group) => group.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    }
  } catch (error) {
    console.error('Failed to update group:', error);
  }
};

// 删除分组
export const deleteGroup = (id: string): void => {
  try {
    const groups = getAllGroups();
    const filtered = groups.filter((group) => group.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete group:', error);
  }
};

// 删除批次下的所有分组
export const deleteGroupsByBatchId = (batchId: string): void => {
  try {
    const groups = getAllGroups();
    const filtered = groups.filter((group) => group.batchId !== batchId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete groups by batch:', error);
  }
};

// 清空所有分组
export const clearAllGroups = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear groups:', error);
  }
};

// 更新分组考生数量
export const updateGroupCandidateCount = (groupId: string, count: number): void => {
  updateGroup(groupId, { candidateCount: count });
};

// 分配志愿者给分组
export const assignVolunteersToGroup = (groupId: string, volunteerIds: string[]): void => {
  updateGroup(groupId, { volunteerIds });
};

// 获取志愿者被分配的所有分组
export const getGroupsByVolunteerId = (volunteerId: string): Group[] => {
  const groups = getAllGroups();
  return groups.filter((group) => group.volunteerIds && group.volunteerIds.includes(volunteerId));
};