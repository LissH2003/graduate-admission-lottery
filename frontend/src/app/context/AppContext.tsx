// 全局数据管理Context - 串联管理端和志愿者端所有功能
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ==================== 导入 Storage 层 ====================
import * as batchStorage from '../../storage/batchStorage';
import * as groupStorage from '../../storage/groupStorage';
import * as candidateStorage from '../../storage/candidateStorage';
import * as examRoomStorage from '../../storage/examRoomStorage';
import * as volunteerStorage from '../../storage/volunteerStorage';
import { supabase } from '../../lib/supabase';
import { LoadingScreen, ErrorScreen } from '../components/LoadingScreen';

// ==================== 数据类型定义 ====================

// 当前学院类型
export interface CurrentAcademy {
  id: string;
  name: string;
}

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
  examRoomId: string;
  examRoomName?: string;
  date: string;
  time: string;
  endTime: string;
  volunteerIds?: string[];
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
  status: 'waiting' | 'drawn' | 'absent' | 'completed';
  drawnNumber?: number;
  drawnTime?: string;
}

// 考场类型
export interface ExamRoom {
  id: string;
  name: string;
  location: string;
  building: string;
  floor: string;
  capacity: number;
  facilities: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  description?: string;
}

// 志愿者类型
export interface Volunteer {
  id: string;
  username: string;
  name: string;
  phone: string;
  password?: string;
  examRoomIds: string[];
  createdAt: string;
  status: 'active' | 'inactive';
  academyId: string;
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
  // 加载状态
  isLoading: boolean;
  loadingError: string | null;
  refreshData: () => Promise<void>;

  // 用户状态
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;

  // 学院状态
  currentAcademy: CurrentAcademy | null;
  setCurrentAcademy: (academy: CurrentAcademy | null) => void;
  switchAcademy: (academyId: string) => Promise<CurrentAcademy | void>;

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

// 加载步骤配置
const LOADING_STEPS = [
  { name: '正在连接服务器...', loader: () => Promise.resolve() },
  { name: '正在加载考场数据...', loader: examRoomStorage.refreshExamRooms },
  { name: '正在加载批次数据...', loader: batchStorage.refreshBatches },
  { name: '正在加载分组数据...', loader: groupStorage.refreshGroups },
  { name: '正在加载考生数据...', loader: candidateStorage.refreshCandidates },
  { name: '正在加载志愿者数据...', loader: volunteerStorage.refreshVolunteers },
];

// ==================== Provider组件 ====================

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingStepName, setLoadingStepName] = useState('正在初始化...');

  // 用户状态
  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(null);

  // 学院状态
  const [currentAcademy, setCurrentAcademyState] = useState<CurrentAcademy | null>(null);

  // 数据状态
  const [batches, setBatches] = useState<Batch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [examRooms, setExamRooms] = useState<ExamRoom[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [selectedExamRoom, setSelectedExamRoom] = useState<ExamRoom | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  // ==================== 学院状态管理 ====================

  // 设置当前学院（同步更新 localStorage）
  const setCurrentAcademy = (academy: CurrentAcademy | null) => {
    setCurrentAcademyState(academy);
    if (academy) {
      localStorage.setItem('current_academy', JSON.stringify(academy));
    } else {
      localStorage.removeItem('current_academy');
    }
  };

  // 超级管理员切换学院
  const switchAcademy = async (academyId: string) => {
    try {
      const { data: academyData, error } = await supabase
        .from('lottery_academies')
        .select('id, name')
        .eq('id', academyId)
        .single();

      if (error || !academyData) {
        throw new Error('学院不存在');
      }

      const data = academyData as { id: string; name: string };
      
      // 更新状态和 localStorage
      const newAcademy = { id: data.id, name: data.name };
      setCurrentAcademy(newAcademy);
      localStorage.setItem('current_academy', JSON.stringify(newAcademy));

      // 重新加载所有数据（Storage 层会自动使用新的 academy_id）
      await loadAllData();
      
      return newAcademy;
    } catch (error) {
      console.error('Switch academy error:', error);
      throw error;
    }
  };

  // 设置当前用户（同步更新 localStorage）
  const setCurrentUser = (user: CurrentUser | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('current_user');
      localStorage.removeItem('current_academy');
    }
  };

  // 初始化：从 localStorage 恢复状态
  useEffect(() => {
    // 恢复用户状态
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      try {
        setCurrentUserState(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('current_user');
      }
    }

    // 恢复学院状态
    const savedAcademy = localStorage.getItem('current_academy');
    if (savedAcademy) {
      try {
        setCurrentAcademyState(JSON.parse(savedAcademy));
      } catch {
        localStorage.removeItem('current_academy');
      }
    }
  }, []);

  // 从 Storage 分步加载所有数据（带进度显示和超时处理）
  const loadAllData = async () => {
    console.log('[AppContext] 开始加载所有数据...');
    setIsLoading(true);
    setLoadingError(null);
    setLoadingStep(0);

    const results: {
      examRooms?: ExamRoom[];
      batches?: Batch[];
      groups?: Group[];
      candidates?: Candidate[];
      volunteers?: Volunteer[];
    } = {};

    try {
      // 分步加载数据，每步更新进度
      for (let i = 0; i < LOADING_STEPS.length; i++) {
        const step = LOADING_STEPS[i];
        setLoadingStep(i);
        setLoadingStepName(step.name);
        
        console.log(`[AppContext] ${step.name}`);
        
        // 设置单步超时（10秒）
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${step.name} 超时`)), 10000);
        });
        
        // 执行加载
        const data = await Promise.race([step.loader(), timeoutPromise]);
        
        // 保存结果
        switch (i) {
          case 1: results.examRooms = data as ExamRoom[]; break;
          case 2: results.batches = data as Batch[]; break;
          case 3: results.groups = data as Group[]; break;
          case 4: results.candidates = data as Candidate[]; break;
          case 5: results.volunteers = data as Volunteer[]; break;
        }
      }

      // 更新所有状态
      if (results.examRooms) setExamRooms(results.examRooms);
      if (results.batches) setBatches(results.batches);
      if (results.groups) setGroups(results.groups);
      if (results.candidates) setCandidates(results.candidates);
      if (results.volunteers) setVolunteers(results.volunteers);

      console.log('[AppContext] 数据加载完成:', {
        batches: results.batches?.length || 0,
        groups: results.groups?.length || 0,
        candidates: results.candidates?.length || 0,
        examRooms: results.examRooms?.length || 0,
        volunteers: results.volunteers?.length || 0
      });

    } catch (error) {
      console.error('[AppContext] 数据加载失败:', error);
      setLoadingError(error instanceof Error ? error.message : '加载失败，请检查网络连接');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  // 首次加载
  useEffect(() => {
    loadAllData();
  }, []);

  // 登录后自动刷新数据（当 currentUser 从 null 变为有值时）
  useEffect(() => {
    if (currentUser && !isLoading) {
      console.log('[AppContext] 检测到登录状态变化，刷新数据...');
      refreshData();
    }
  }, [currentUser?.id]);

  // 刷新数据
  const refreshData = async () => {
    await loadAllData();
  };

  // ==================== 批次管理方法 ====================

  const addBatch = (batch: Batch) => {
    batchStorage.addBatch(batch as any);
    setBatches(batchStorage.getAllBatches() as Batch[]);
  };

  const updateBatch = (id: string, updatedBatch: Partial<Batch>) => {
    batchStorage.updateBatch(id, updatedBatch as any);
    setBatches(batchStorage.getAllBatches() as Batch[]);
  };

  const deleteBatch = (id: string) => {
    batchStorage.deleteBatch(id);
    setBatches(batchStorage.getAllBatches() as Batch[]);
    setGroups(groupStorage.getAllGroups() as Group[]);
  };

  // ==================== 分组管理方法 ====================

  const addGroup = (group: Group) => {
    groupStorage.addGroup(group as any);
    setGroups(groupStorage.getAllGroups() as Group[]);
    // 更新批次的分组计数
    const batchGroups = groupStorage.getGroupsByBatchId(group.batchId);
    updateBatch(group.batchId, { totalGroups: batchGroups.length });
  };

  const updateGroup = (id: string, updatedGroup: Partial<Group>) => {
    groupStorage.updateGroup(id, updatedGroup as any);
    setGroups(groupStorage.getAllGroups() as Group[]);
  };

  const deleteGroup = (id: string) => {
    groupStorage.deleteGroup(id);
    setGroups(groupStorage.getAllGroups() as Group[]);
    setCandidates(candidateStorage.getAllCandidates() as Candidate[]);
  };

  const getGroupsByBatch = (batchId: string) => {
    return groupStorage.getGroupsByBatchId(batchId) as Group[];
  };

  // ==================== 考生管理方法 ====================

  const addCandidate = (candidate: Candidate) => {
    candidateStorage.addCandidate(candidate as any);
    setCandidates(candidateStorage.getAllCandidates() as Candidate[]);
    // 更新分组的考生计数
    const groupCandidates = candidateStorage.getCandidatesByGroupId(candidate.groupId);
    updateGroup(candidate.groupId, { candidateCount: groupCandidates.length });
  };

  const updateCandidate = (id: string, updatedCandidate: Partial<Candidate>) => {
    candidateStorage.updateCandidate(id, updatedCandidate as any);
    setCandidates(candidateStorage.getAllCandidates() as Candidate[]);
  };

  const deleteCandidate = (id: string) => {
    candidateStorage.deleteCandidate(id);
    setCandidates(candidateStorage.getAllCandidates() as Candidate[]);
  };

  const getCandidatesByGroup = (groupId: string) => {
    return candidateStorage.getCandidatesByGroupId(groupId) as Candidate[];
  };

  const batchImportCandidates = (groupId: string, newCandidates: Candidate[]) => {
    candidateStorage.addCandidates(newCandidates as any);
    setCandidates(candidateStorage.getAllCandidates() as Candidate[]);
    const groupCandidates = candidateStorage.getCandidatesByGroupId(groupId);
    updateGroup(groupId, { candidateCount: groupCandidates.length });
  };

  // ==================== 考场管理方法 ====================

  const addExamRoom = (room: ExamRoom) => {
    examRoomStorage.addExamRoom(room as any);
    setExamRooms(examRoomStorage.getAllExamRooms() as ExamRoom[]);
  };

  const updateExamRoom = (id: string, updatedRoom: Partial<ExamRoom>) => {
    examRoomStorage.updateExamRoom(id, updatedRoom as any);
    setExamRooms(examRoomStorage.getAllExamRooms() as ExamRoom[]);
  };

  const deleteExamRoom = (id: string) => {
    examRoomStorage.deleteExamRoom(id);
    setExamRooms(examRoomStorage.getAllExamRooms() as ExamRoom[]);
  };

  // ==================== 志愿者管理方法 ====================

  const addVolunteer = (volunteer: Volunteer) => {
    volunteerStorage.addVolunteer(volunteer as any);
    setVolunteers(volunteerStorage.getAllVolunteers() as Volunteer[]);
  };

  const updateVolunteer = (id: string, updatedVolunteer: Partial<Volunteer>) => {
    volunteerStorage.updateVolunteer(id, updatedVolunteer as any);
    setVolunteers(volunteerStorage.getAllVolunteers() as Volunteer[]);
  };

  const deleteVolunteer = (id: string) => {
    volunteerStorage.deleteVolunteer(id);
    setVolunteers(volunteerStorage.getAllVolunteers() as Volunteer[]);
  };

  const getVolunteerByUsername = (username: string) => {
    return volunteerStorage.getVolunteerByUsername(username) as Volunteer | undefined;
  };

  // ==================== Context值 ====================

  const value: AppContextType = {
    isLoading,
    loadingError,
    refreshData,
    currentUser,
    setCurrentUser,
    currentAcademy,
    setCurrentAcademy,
    switchAcademy,
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

  // 加载中显示加载界面
  if (isLoading) {
    return (
      <AppContext.Provider value={value}>
        <LoadingScreen
          currentStep={loadingStep}
          totalSteps={LOADING_STEPS.length - 1}
          stepName={loadingStepName}
          showTimeout={loadingStep >= 3}
        />
      </AppContext.Provider>
    );
  }

  // 加载失败显示错误界面
  if (loadingError) {
    return (
      <AppContext.Provider value={value}>
        <ErrorScreen error={loadingError} onRetry={refreshData} />
      </AppContext.Provider>
    );
  }

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
