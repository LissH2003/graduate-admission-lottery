// 用户会话存储
export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'volunteer';
  loginTime: string;
}

const SESSION_KEY = 'current_user_session';
const SELECTED_ROOM_KEY = 'selected_exam_room';

// 获取当前登录用户
export const getCurrentUser = (): UserSession | null => {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// 设置当前登录用户
export const setCurrentUser = (user: UserSession): void => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to set current user:', error);
  }
};

// 退出登录
export const logout = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SELECTED_ROOM_KEY);
  } catch (error) {
    console.error('Failed to logout:', error);
  }
};

// 检查是否已登录
export const isLoggedIn = (): boolean => {
  return getCurrentUser() !== null;
};

// 检查是否是管理员
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

// 获取当前选中的考场
export const getSelectedExamRoom = (): any | null => {
  try {
    const data = localStorage.getItem(SELECTED_ROOM_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get selected exam room:', error);
    return null;
  }
};

// 设置当前选中的考场
export const setSelectedExamRoom = (room: any): void => {
  try {
    localStorage.setItem(SELECTED_ROOM_KEY, JSON.stringify(room));
  } catch (error) {
    console.error('Failed to set selected exam room:', error);
  }
};

// 清除选中的考场
export const clearSelectedExamRoom = (): void => {
  try {
    localStorage.removeItem(SELECTED_ROOM_KEY);
  } catch (error) {
    console.error('Failed to clear selected exam room:', error);
  }
};
