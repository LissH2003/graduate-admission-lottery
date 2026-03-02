// 考场数据存储
export interface ExamRoom {
  id: string;
  name: string; // 考场名称，如"机械楼301"
  location: string; // 考场位置
  building: string; // 楼栋
  floor: string; // 楼层
  capacity: number; // 容量
  facilities: string[]; // 设施，如["投影仪", "白板", "音响"]
  status: 'active' | 'inactive'; // 状态
  createdAt: string;
  description?: string; // 备注
}

const STORAGE_KEY = 'interview_exam_rooms';

// 初始化默认考场
const initializeDefaultRooms = (): void => {
  const rooms = getAllExamRooms();
  if (rooms.length === 0) {
    const defaultRooms: ExamRoom[] = [
      {
        id: 'room-1',
        name: '机械楼301',
        location: '机械楼3楼301室',
        building: '机械楼',
        floor: '3',
        capacity: 30,
        facilities: ['投影仪', '白板', '音响', '空调'],
        status: 'active',
        createdAt: new Date().toLocaleString('zh-CN'),
        description: '标准面试考场',
      },
      {
        id: 'room-2',
        name: '机械楼302',
        location: '机械楼3楼302室',
        building: '机械楼',
        floor: '3',
        capacity: 30,
        facilities: ['投影仪', '白板', '音响', '空调'],
        status: 'active',
        createdAt: new Date().toLocaleString('zh-CN'),
        description: '标准面试考场',
      },
      {
        id: 'room-3',
        name: '机械楼401',
        location: '机械楼4楼401室',
        building: '机械楼',
        floor: '4',
        capacity: 40,
        facilities: ['投影仪', '白板', '音响', '空调', '录音设备'],
        status: 'active',
        createdAt: new Date().toLocaleString('zh-CN'),
        description: '大型面试考场',
      },
      {
        id: 'room-4',
        name: '行政楼201',
        location: '行政楼2楼201室',
        building: '行政楼',
        floor: '2',
        capacity: 20,
        facilities: ['投影仪', '白板', '空调'],
        status: 'active',
        createdAt: new Date().toLocaleString('zh-CN'),
        description: '小型面试考场',
      },
    ];
    defaultRooms.forEach((room) => addExamRoom(room));
  }
};

// 获取所有考场
export const getAllExamRooms = (): ExamRoom[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get exam rooms:', error);
    return [];
  }
};

// 获取单个考场
export const getExamRoomById = (id: string): ExamRoom | undefined => {
  const rooms = getAllExamRooms();
  return rooms.find((room) => room.id === id);
};

// 获取活动状态的考场
export const getActiveExamRooms = (): ExamRoom[] => {
  const rooms = getAllExamRooms();
  return rooms.filter((room) => room.status === 'active');
};

// 根据楼栋获取考场
export const getExamRoomsByBuilding = (building: string): ExamRoom[] => {
  const rooms = getAllExamRooms();
  return rooms.filter((room) => room.building === building);
};

// 添加考场
export const addExamRoom = (room: ExamRoom): void => {
  try {
    const rooms = getAllExamRooms();
    rooms.push(room);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch (error) {
    console.error('Failed to add exam room:', error);
  }
};

// 更新考场
export const updateExamRoom = (id: string, updates: Partial<ExamRoom>): void => {
  try {
    const rooms = getAllExamRooms();
    const index = rooms.findIndex((room) => room.id === id);
    if (index !== -1) {
      rooms[index] = { ...rooms[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    }
  } catch (error) {
    console.error('Failed to update exam room:', error);
  }
};

// 删除考场
export const deleteExamRoom = (id: string): void => {
  try {
    const rooms = getAllExamRooms();
    const filtered = rooms.filter((room) => room.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete exam room:', error);
  }
};

// 清空所有考场
export const clearAllExamRooms = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear exam rooms:', error);
  }
};

// 获取所有楼栋列表
export const getAllBuildings = (): string[] => {
  const rooms = getAllExamRooms();
  const buildings = new Set(rooms.map((room) => room.building));
  return Array.from(buildings).sort();
};

// 初始化
initializeDefaultRooms();