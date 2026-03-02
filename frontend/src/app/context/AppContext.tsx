// 全局数据管理Context - 串联管理端和志愿者端所有功能
import React, { createContext, useContext, useState, ReactNode } from 'react';

// ==================== 数据类型定义 ====================

// 批次类型
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

// 分组类型
export interface Group {
  id: string;
  batchId: string;
  batchName: string;
  name: string;
  description: string;
  candidateCount: number;
  createdAt: string;
}

// 考生类型
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

// 考场类型
export interface ExamRoom {
  id: string;
  groupId: string;
  groupName: string;
  academy: string;
  date: string;
  time: string;
  location: string;
  currentCount: number;
  maxCount: number;
  supervisor: string;
  status: 'pending' | 'inProgress' | 'completed' | 'error';
}

// 志愿者类型
export interface Volunteer {
  id: string;
  username: string;
  name: string;
  phone: string;
  assignedRooms: string[]; // 分配的考场ID列表
  createdAt: string;
  status: 'active' | 'inactive';
}

// 当前用户类型
export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'volunteer';
}

// ==================== Context接口定义 ====================

interface AppContextType {
  // 用户状态
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  
  // 批次管理
  batches: Batch[];
  addBatch: (batch: Batch) => void;
  updateBatch: (id: string, batch: Partial<Batch>) => void;
  deleteBatch: (id: string) => void;
  
  // 分组管理
  groups: Group[];
  addGroup: (group: Group) => void;
  updateGroup: (id: string, group: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  getGroupsByBatch: (batchId: string) => Group[];
  
  // 考生管理
  candidates: Candidate[];
  addCandidate: (candidate: Candidate) => void;
  updateCandidate: (id: string, candidate: Partial<Candidate>) => void;
  deleteCandidate: (id: string) => void;
  getCandidatesByGroup: (groupId: string) => Candidate[];
  batchImportCandidates: (groupId: string, candidates: Candidate[]) => void;
  
  // 考场管理
  examRooms: ExamRoom[];
  addExamRoom: (room: ExamRoom) => void;
  updateExamRoom: (id: string, room: Partial<ExamRoom>) => void;
  deleteExamRoom: (id: string) => void;
  
  // 志愿者管理
  volunteers: Volunteer[];
  addVolunteer: (volunteer: Volunteer) => void;
  updateVolunteer: (id: string, volunteer: Partial<Volunteer>) => void;
  deleteVolunteer: (id: string) => void;
  getVolunteerByUsername: (username: string) => Volunteer | undefined;
  
  // 当前选中的考场（用于志愿者端和抽签控制台）
  selectedExamRoom: ExamRoom | null;
  setSelectedExamRoom: (room: ExamRoom | null) => void;
  
  // 当前选中的分组（用于志愿者端抽签控制台）
  selectedGroup: any | null;
  setSelectedGroup: (group: any | null) => void;
}

// ==================== 创建Context ====================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ==================== Mock初始数据 ====================

// 清空初始数据，让用户自己创建测试数据
const initialBatches: Batch[] = [];

const initialGroups: Group[] = [];

const initialCandidates: Candidate[] = [];

const initialExamRooms: ExamRoom[] = [];

const initialVolunteers: Volunteer[] = [
  // 保留一个默认管理员账号用于首次登录
  {
    id: 'admin-default',
    username: 'admin',
    name: '系统管理员',
    phone: '13800000000',
    assignedRooms: [],
    createdAt: new Date().toLocaleString('zh-CN'),
    status: 'active',
  },
];

// ==================== Provider组件 ====================

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 用户状态
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  
  // 数据状态
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [examRooms, setExamRooms] = useState<ExamRoom[]>(initialExamRooms);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(initialVolunteers);
  const [selectedExamRoom, setSelectedExamRoom] = useState<ExamRoom | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  // ==================== 批次管理方法 ====================
  
  const addBatch = (batch: Batch) => {
    setBatches([...batches, batch]);
  };

  const updateBatch = (id: string, updatedBatch: Partial<Batch>) => {
    setBatches(batches.map((b) => (b.id === id ? { ...b, ...updatedBatch } : b)));
  };

  const deleteBatch = (id: string) => {
    // 删除批次时，同时删除相关的分组
    const groupsToDelete = groups.filter((g) => g.batchId === id);
    groupsToDelete.forEach((g) => deleteGroup(g.id));
    setBatches(batches.filter((b) => b.id !== id));
  };

  // ==================== 分组管理方法 ====================
  
  const addGroup = (group: Group) => {
    setGroups([...groups, group]);
    // 更新批次的分组计数
    updateBatch(group.batchId, {
      totalGroups: groups.filter((g) => g.batchId === group.batchId).length + 1,
    });
  };

  const updateGroup = (id: string, updatedGroup: Partial<Group>) => {
    setGroups(groups.map((g) => (g.id === id ? { ...g, ...updatedGroup } : g)));
  };

  const deleteGroup = (id: string) => {
    const group = groups.find((g) => g.id === id);
    if (group) {
      // 删除该分组下的所有考生
      setCandidates(candidates.filter((c) => c.groupId !== id));
      // 删除该分组对应的考场
      setExamRooms(examRooms.filter((r) => r.groupId !== id));
      // 删除分组
      setGroups(groups.filter((g) => g.id !== id));
      // 更新批次的分组计数
      const remainingGroups = groups.filter((g) => g.batchId === group.batchId && g.id !== id);
      updateBatch(group.batchId, {
        totalGroups: remainingGroups.length,
      });
    }
  };

  const getGroupsByBatch = (batchId: string) => {
    return groups.filter((g) => g.batchId === batchId);
  };

  // ==================== 考生管理方法 ====================
  
  const addCandidate = (candidate: Candidate) => {
    setCandidates([...candidates, candidate]);
    // 更新分组的考生计数
    const group = groups.find((g) => g.id === candidate.groupId);
    if (group) {
      updateGroup(group.id, {
        candidateCount: candidates.filter((c) => c.groupId === candidate.groupId).length + 1,
      });
      // 更新考场考生计数
      const room = examRooms.find((r) => r.groupId === candidate.groupId);
      if (room) {
        updateExamRoom(room.id, {
          currentCount: candidates.filter((c) => c.groupId === candidate.groupId).length + 1,
        });
      }
    }
  };

  const updateCandidate = (id: string, updatedCandidate: Partial<Candidate>) => {
    setCandidates(candidates.map((c) => (c.id === id ? { ...c, ...updatedCandidate } : c)));
  };

  const deleteCandidate = (id: string) => {
    const candidate = candidates.find((c) => c.id === id);
    if (candidate) {
      setCandidates(candidates.filter((c) => c.id !== id));
      // 更新分组的考生计数
      const remainingCandidates = candidates.filter(
        (c) => c.groupId === candidate.groupId && c.id !== id
      );
      updateGroup(candidate.groupId, {
        candidateCount: remainingCandidates.length,
      });
      // 更新考场的考生计数
      const room = examRooms.find((r) => r.groupId === candidate.groupId);
      if (room) {
        updateExamRoom(room.id, {
          currentCount: remainingCandidates.length,
        });
      }
    }
  };

  const getCandidatesByGroup = (groupId: string) => {
    return candidates.filter((c) => c.groupId === groupId);
  };

  const batchImportCandidates = (groupId: string, newCandidates: Candidate[]) => {
    setCandidates([...candidates, ...newCandidates]);
    // 更新分组的考生计数
    const totalCount = candidates.filter((c) => c.groupId === groupId).length + newCandidates.length;
    updateGroup(groupId, {
      candidateCount: totalCount,
    });
    // 更新考场的考生计数
    const room = examRooms.find((r) => r.groupId === groupId);
    if (room) {
      updateExamRoom(room.id, {
        currentCount: totalCount,
      });
    }
  };

  // ==================== 考场管理方法 ====================
  
  const addExamRoom = (room: ExamRoom) => {
    setExamRooms([...examRooms, room]);
  };

  const updateExamRoom = (id: string, updatedRoom: Partial<ExamRoom>) => {
    setExamRooms(examRooms.map((r) => (r.id === id ? { ...r, ...updatedRoom } : r)));
  };

  const deleteExamRoom = (id: string) => {
    setExamRooms(examRooms.filter((r) => r.id !== id));
  };

  // ==================== 志愿者管理方法 ====================
  
  const addVolunteer = (volunteer: Volunteer) => {
    setVolunteers([...volunteers, volunteer]);
  };

  const updateVolunteer = (id: string, updatedVolunteer: Partial<Volunteer>) => {
    setVolunteers(volunteers.map((v) => (v.id === id ? { ...v, ...updatedVolunteer } : v)));
  };

  const deleteVolunteer = (id: string) => {
    setVolunteers(volunteers.filter((v) => v.id !== id));
  };

  const getVolunteerByUsername = (username: string) => {
    return volunteers.find((v) => v.username === username);
  };

  // ==================== Context值 ====================

  const value: AppContextType = {
    currentUser,
    setCurrentUser,
    batches,
    addBatch,
    updateBatch,
    deleteBatch,
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    getGroupsByBatch,
    candidates,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    getCandidatesByGroup,
    batchImportCandidates,
    examRooms,
    addExamRoom,
    updateExamRoom,
    deleteExamRoom,
    volunteers,
    addVolunteer,
    updateVolunteer,
    deleteVolunteer,
    getVolunteerByUsername,
    selectedExamRoom,
    setSelectedExamRoom,
    selectedGroup,
    setSelectedGroup,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ==================== 自定义Hook ====================

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};