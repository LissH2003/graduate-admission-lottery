// 考生数据存储
export interface Candidate {
  id: string;
  groupId: string;
  name: string;
  idCard: string;
  registrationNo?: string;
  candidateNo?: string;
  phone?: string;
  status: 'waiting' | 'drawn' | 'absent';
  drawnNumber?: number;
  drawnTime?: string;
}

const STORAGE_KEY = 'interview_candidates';

// 获取所有考生
export const getAllCandidates = (): Candidate[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get candidates:', error);
    return [];
  }
};

// 获取单个考生
export const getCandidateById = (id: string): Candidate | undefined => {
  const candidates = getAllCandidates();
  return candidates.find((candidate) => candidate.id === id);
};

// 根据分组ID获取考生
export const getCandidatesByGroupId = (groupId: string): Candidate[] => {
  const candidates = getAllCandidates();
  return candidates.filter((candidate) => candidate.groupId === groupId);
};

// 根据批次ID获取所有考生（通过分组关联）
export const getCandidatesByBatchId = (batchId: string, groups: any[]): Candidate[] => {
  const batchGroupIds = groups.filter((g) => g.batchId === batchId).map((g) => g.id);
  const candidates = getAllCandidates();
  return candidates.filter((candidate) => batchGroupIds.includes(candidate.groupId));
};

// 添加考生
export const addCandidate = (candidate: Candidate): void => {
  try {
    const candidates = getAllCandidates();
    candidates.push(candidate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  } catch (error) {
    console.error('Failed to add candidate:', error);
  }
};

// 批量添加考生
export const addCandidates = (newCandidates: Candidate[]): void => {
  try {
    const candidates = getAllCandidates();
    candidates.push(...newCandidates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  } catch (error) {
    console.error('Failed to add candidates:', error);
  }
};

// 更新考生
export const updateCandidate = (id: string, updates: Partial<Candidate>): void => {
  try {
    const candidates = getAllCandidates();
    const index = candidates.findIndex((candidate) => candidate.id === id);
    if (index !== -1) {
      candidates[index] = { ...candidates[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    }
  } catch (error) {
    console.error('Failed to update candidate:', error);
  }
};

// 删除考生
export const deleteCandidate = (id: string): void => {
  try {
    const candidates = getAllCandidates();
    const filtered = candidates.filter((candidate) => candidate.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete candidate:', error);
  }
};

// 删除分组下的所有考生
export const deleteCandidatesByGroupId = (groupId: string): void => {
  try {
    const candidates = getAllCandidates();
    const filtered = candidates.filter((candidate) => candidate.groupId !== groupId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete candidates by group:', error);
  }
};

// 清空所有考生
export const clearAllCandidates = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear candidates:', error);
  }
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
