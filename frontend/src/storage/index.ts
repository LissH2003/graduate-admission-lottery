// 统一的存储工具函数
import * as batchStorage from './batchStorage';
import * as groupStorage from './groupStorage';
import * as candidateStorage from './candidateStorage';
import * as examRoomStorage from './examRoomStorage';
import * as volunteerStorage from './volunteerStorage';
import * as userStorage from './userStorage';

// 导出所有存储模块
export {
  batchStorage,
  groupStorage,
  candidateStorage,
  examRoomStorage,
  volunteerStorage,
  userStorage,
};

// 清空所有数据（保留管理员账号）
export const clearAllData = (): void => {
  batchStorage.clearAllBatches();
  groupStorage.clearAllGroups();
  candidateStorage.clearAllCandidates();
  examRoomStorage.clearAllExamRooms();
  volunteerStorage.clearAllVolunteers(); // 会保留管理员
};

// 获取系统统计数据
export const getSystemStats = () => {
  const batches = batchStorage.getAllBatches();
  const groups = groupStorage.getAllGroups();
  const candidates = candidateStorage.getAllCandidates();
  const rooms = examRoomStorage.getAllExamRooms();
  const volunteers = volunteerStorage.getAllVolunteers();

  return {
    totalBatches: batches.length,
    totalGroups: groups.length,
    totalCandidates: candidates.length,
    totalExamRooms: rooms.length,
    totalVolunteers: volunteers.filter((v) => v.username !== 'admin').length,
    activeBatches: batches.filter((b) => b.status === 'active').length,
    waitingCandidates: candidates.filter((c) => c.status === 'waiting').length,
    drawnCandidates: candidates.filter((c) => c.status === 'drawn').length,
  };
};

// 数据导出（用于备份）
export const exportAllData = () => {
  return {
    batches: batchStorage.getAllBatches(),
    groups: groupStorage.getAllGroups(),
    candidates: candidateStorage.getAllCandidates(),
    examRooms: examRoomStorage.getAllExamRooms(),
    volunteers: volunteerStorage.getAllVolunteers(),
    exportTime: new Date().toISOString(),
  };
};

// 数据导入（用于恢复）
export const importAllData = (data: any): void => {
  if (data.batches) {
    localStorage.setItem('interview_batches', JSON.stringify(data.batches));
  }
  if (data.groups) {
    localStorage.setItem('interview_groups', JSON.stringify(data.groups));
  }
  if (data.candidates) {
    localStorage.setItem('interview_candidates', JSON.stringify(data.candidates));
  }
  if (data.examRooms) {
    localStorage.setItem('interview_exam_rooms', JSON.stringify(data.examRooms));
  }
  if (data.volunteers) {
    localStorage.setItem('interview_volunteers', JSON.stringify(data.volunteers));
  }
};
