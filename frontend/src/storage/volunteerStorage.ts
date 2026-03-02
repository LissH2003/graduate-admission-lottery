// 志愿者数据存储
export interface Volunteer {
  id: string;
  username: string;
  name: string;
  phone: string;
  password?: string;
  examRoomIds: string[]; // 存储考场ID数组（多对多关系）
  createdAt: string;
  status: 'active' | 'inactive';
}

const STORAGE_KEY = 'interview_volunteers';

// 初始化默认管理员
const initializeDefaultAdmin = (): void => {
  const volunteers = getAllVolunteers();
  if (volunteers.length === 0) {
    const defaultAdmin: Volunteer = {
      id: 'admin-default',
      username: 'admin',
      name: '系统管理员',
      phone: '13800000000',
      password: '123456',
      examRoomIds: [],
      createdAt: new Date().toLocaleString('zh-CN'),
      status: 'active',
    };
    addVolunteer(defaultAdmin);
  }
};

// 获取所有志愿者
export const getAllVolunteers = (): Volunteer[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get volunteers:', error);
    return [];
  }
};

// 获取单个志愿者
export const getVolunteerById = (id: string): Volunteer | undefined => {
  const volunteers = getAllVolunteers();
  return volunteers.find((volunteer) => volunteer.id === id);
};

// 根据用户名获取志愿者
export const getVolunteerByUsername = (username: string): Volunteer | undefined => {
  const volunteers = getAllVolunteers();
  return volunteers.find((volunteer) => volunteer.username === username);
};

// 添加志愿者
export const addVolunteer = (volunteer: Volunteer): void => {
  try {
    const volunteers = getAllVolunteers();
    volunteers.push(volunteer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volunteers));
  } catch (error) {
    console.error('Failed to add volunteer:', error);
  }
};

// 更新志愿者
export const updateVolunteer = (id: string, updates: Partial<Volunteer>): void => {
  try {
    const volunteers = getAllVolunteers();
    const index = volunteers.findIndex((volunteer) => volunteer.id === id);
    if (index !== -1) {
      volunteers[index] = { ...volunteers[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(volunteers));
    }
  } catch (error) {
    console.error('Failed to update volunteer:', error);
  }
};

// 删除志愿者
export const deleteVolunteer = (id: string): void => {
  try {
    const volunteers = getAllVolunteers();
    const filtered = volunteers.filter((volunteer) => volunteer.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete volunteer:', error);
  }
};

// 清空所有志愿者（保留管理员）
export const clearAllVolunteers = (): void => {
  try {
    const volunteers = getAllVolunteers();
    const adminOnly = volunteers.filter((v) => v.username === 'admin');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adminOnly));
  } catch (error) {
    console.error('Failed to clear volunteers:', error);
  }
};

// 分配考场给志愿者
export const assignExamRoomToVolunteer = (volunteerId: string, examRoomId: string): void => {
  const volunteer = getVolunteerById(volunteerId);
  if (volunteer) {
    const examRoomIds = volunteer.examRoomIds || [];
    if (!examRoomIds.includes(examRoomId)) {
      examRoomIds.push(examRoomId);
      updateVolunteer(volunteerId, { examRoomIds });
    }
  }
};

// 取消分配考场
export const unassignExamRoomFromVolunteer = (volunteerId: string, examRoomId: string): void => {
  const volunteer = getVolunteerById(volunteerId);
  if (volunteer) {
    const examRoomIds = volunteer.examRoomIds.filter((id) => id !== examRoomId);
    updateVolunteer(volunteerId, { examRoomIds });
  }
};

// 批量分配考场给志愿者
export const batchAssignExamRoomsToVolunteer = (volunteerId: string, examRoomIds: string[]): void => {
  updateVolunteer(volunteerId, { examRoomIds });
};

// 获取考场下的所有志愿者
export const getVolunteersByExamRoomId = (examRoomId: string): Volunteer[] => {
  const volunteers = getAllVolunteers();
  return volunteers.filter((v) => v.examRoomIds && v.examRoomIds.includes(examRoomId));
};

// 批量分配志愿者到考场
export const assignVolunteersToExamRoom = (examRoomId: string, volunteerIds: string[]): void => {
  volunteerIds.forEach(volunteerId => {
    const volunteer = getVolunteerById(volunteerId);
    if (volunteer) {
      const examRoomIds = volunteer.examRoomIds || [];
      if (!examRoomIds.includes(examRoomId)) {
        examRoomIds.push(examRoomId);
        updateVolunteer(volunteerId, { examRoomIds });
      }
    }
  });
};

// 验证登录
export const validateLogin = (username: string, password: string): Volunteer | null => {
  const volunteer = getVolunteerByUsername(username);
  if (volunteer && volunteer.password === password && volunteer.status === 'active') {
    return volunteer;
  }
  return null;
};

// 检查用户名是否存在
export const isUsernameExists = (username: string): boolean => {
  const volunteer = getVolunteerByUsername(username);
  return !!volunteer;
};

// 初始化
initializeDefaultAdmin();