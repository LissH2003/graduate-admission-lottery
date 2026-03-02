// 批次数据存储
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

const STORAGE_KEY = 'interview_batches';

// 获取所有批次
export const getAllBatches = (): Batch[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get batches:', error);
    return [];
  }
};

// 获取单个批次
export const getBatchById = (id: string): Batch | undefined => {
  const batches = getAllBatches();
  return batches.find((batch) => batch.id === id);
};

// 添加批次
export const addBatch = (batch: Batch): void => {
  try {
    const batches = getAllBatches();
    batches.unshift(batch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch (error) {
    console.error('Failed to add batch:', error);
  }
};

// 更新批次
export const updateBatch = (id: string, updates: Partial<Batch>): void => {
  try {
    const batches = getAllBatches();
    const index = batches.findIndex((batch) => batch.id === id);
    if (index !== -1) {
      batches[index] = { ...batches[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
    }
  } catch (error) {
    console.error('Failed to update batch:', error);
  }
};

// 删除批次
export const deleteBatch = (id: string): void => {
  try {
    const batches = getAllBatches();
    const filtered = batches.filter((batch) => batch.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete batch:', error);
  }
};

// 清空所有批次
export const clearAllBatches = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear batches:', error);
  }
};

// 更新批次统计信息
export const updateBatchStats = (batchId: string, totalGroups: number, totalCandidates: number): void => {
  updateBatch(batchId, { totalGroups, totalCandidates });
};