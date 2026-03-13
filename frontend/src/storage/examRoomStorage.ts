// 考场数据存储 - Supabase 实现（保持同步 API）
import { supabase } from '../lib/supabase';
import { examRoomToCamel, examRoomToSnake, type ExamRoomSnake } from '../lib/transforms';
import { getCurrentAcademyId } from '../lib/academy';

export interface ExamRoom {
  id: string;
  name: string;
  location: string;
  building: string;
  floor: string;
  capacity: number;
  facilities: string[];
  status: 'active' | 'inactive';
  description?: string;
  createdAt: string;
}

// 内存缓存
let examRoomsCache: ExamRoom[] | null = null;

// 从 Supabase 加载数据到缓存（带学院过滤）
const loadFromSupabase = async (): Promise<ExamRoom[]> => {
  try {
    const academyId = getCurrentAcademyId();
    if (!academyId) {
      console.log('未选择学院，跳过加载考场数据');
      return [];
    }
    
    const { data, error } = await supabase
      .from('lottery_exam_rooms')
      .select('*')
      .eq('academy_id', academyId!)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load exam rooms from Supabase:', error);
      return [];
    }

    return (data || []).map((room) => examRoomToCamel(room as ExamRoomSnake));
  } catch (error) {
    console.error('Failed to load exam rooms:', error);
    return [];
  }
};

// 确保缓存已初始化
const ensureCache = async (): Promise<ExamRoom[]> => {
  if (examRoomsCache === null) {
    examRoomsCache = await loadFromSupabase();
  }
  return examRoomsCache || [];
};

// 同步获取缓存
const getCacheSync = (): ExamRoom[] => {
  return examRoomsCache || [];
};

// ========== 初始化 API ==========

// 手动初始化（登录后调用）
export const initExamRoomStorage = async (): Promise<void> => {
  await ensureCache();
};

// ========== 同步 API（保持与原 contract 一致）==========

// 获取所有考场
export const getAllExamRooms = (): ExamRoom[] => {
  return getCacheSync();
};

// 获取单个考场
export const getExamRoomById = (id: string): ExamRoom | undefined => {
  const rooms = getCacheSync();
  return rooms.find((room) => room.id === id);
};

// 获取活动状态的考场
export const getActiveExamRooms = (): ExamRoom[] => {
  const rooms = getCacheSync();
  return rooms.filter((room) => room.status === 'active');
};

// 根据楼栋获取考场
export const getExamRoomsByBuilding = (building: string): ExamRoom[] => {
  const rooms = getCacheSync();
  return rooms.filter((room) => room.building === building);
};

// 添加考场（ID 由数据库自动生成）
export const addExamRoom = async (room: Omit<ExamRoom, 'id'>): Promise<string | null> => {
  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法添加考场');
    return null;
  }

  const snakeRoom = examRoomToSnake(room as ExamRoom);
  const { id: _, ...insertData } = snakeRoom as any;
  
  const { data, error } = await supabase
    .from('lottery_exam_rooms')
    .insert({ ...insertData, academy_id: academyId })
    .select('id')
    .single();
    
  if (error) {
    console.error('Failed to add exam room to Supabase:', error);
    return null;
  }
  
  const realId = (data as any).id;
  const rooms = getCacheSync();
  rooms.push({ ...room as ExamRoom, id: realId });
  examRoomsCache = rooms;
  
  return realId;
};

// 更新考场（带学院过滤）
export const updateExamRoom = (id: string, updates: Partial<ExamRoom>): void => {
  const rooms = getCacheSync();
  const index = rooms.findIndex((room) => room.id === id);
  if (index !== -1) {
    rooms[index] = { ...rooms[index], ...updates };
    examRoomsCache = rooms;
  }

  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法更新考场');
    return;
  }
  
  const snakeUpdates = examRoomToSnake(updates);
  supabase
    .from('lottery_exam_rooms')
    .update(snakeUpdates as never)
    .eq('id', id)
    .eq('academy_id', academyId!)
    .then(({ error }) => {
      if (error) console.error('Failed to update exam room in Supabase:', error);
    });
};

// 删除考场（带学院过滤）
export const deleteExamRoom = (id: string): void => {
  const rooms = getCacheSync();
  examRoomsCache = rooms.filter((room) => room.id !== id);

  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法删除考场');
    return;
  }
  
  supabase
    .from('lottery_exam_rooms')
    .delete()
    .eq('id', id)
    .eq('academy_id', academyId!)
    .then(({ error }) => {
      if (error) console.error('Failed to delete exam room from Supabase:', error);
    });
};

// 清空所有考场（带学院过滤）
export const clearAllExamRooms = (): void => {
  examRoomsCache = [];

  const academyId = getCurrentAcademyId();
  if (!academyId) {
    console.error('未选择学院，无法清空考场');
    return;
  }
  
  supabase
    .from('lottery_exam_rooms')
    .delete()
    .eq('academy_id', academyId!)
    .then(({ error }) => {
      if (error) console.error('Failed to clear exam rooms from Supabase:', error);
    });
};

// 获取所有楼栋列表
export const getAllBuildings = (): string[] => {
  const rooms = getCacheSync();
  const buildings = new Set(rooms.map((room) => room.building));
  return Array.from(buildings).sort();
};

// ========== 异步 API（用于强制刷新）==========

// 强制从 Supabase 刷新数据
export const refreshExamRooms = async (): Promise<ExamRoom[]> => {
  examRoomsCache = await loadFromSupabase();
  return examRoomsCache;
};
