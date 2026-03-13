// 用户数据存储 - Supabase 实现（lottery_volunteers 统一表）
import { supabase } from '../lib/supabase';
import { volunteerToCamel, volunteerToSnake, type VolunteerSnake } from '../lib/transforms';
import { getCurrentAcademyId } from '../lib/academy';

// UUID 验证辅助函数
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export interface Volunteer {
  id: string;
  username: string;      // 登录用户名
  loginId?: string;      // SSO学工号
  name: string;
  phone: string;
  email: string;
  password?: string;
  role: 'admin' | 'volunteer';  // 新增：角色区分
  examRoomIds: string[];
  createdAt: string;
  status: 'active' | 'inactive';
  academyId: string;
}

// 内存缓存
let volunteersCache: Volunteer[] | null = null;
let isLoading = false;
let loadPromise: Promise<Volunteer[]> | null = null;

// 从 Supabase 加载数据到缓存（统一从 lottery_volunteers 表）
const loadFromSupabase = async (): Promise<Volunteer[]> => {
  console.log('[VolunteerStorage] 开始加载数据...');

  try {
    const academyId = getCurrentAcademyId();

    // 统一从 lottery_volunteers 表获取（带学院过滤）
    let query = supabase
      .from('lottery_volunteers')
      .select('id, login_id, username, name, phone, email, status, created_at, role, academy_id')
      .order('created_at', { ascending: false });

    // 如果当前有学院，添加学院过滤
    if (academyId) {
      query = query.eq('academy_id', academyId);
    }

    const { data: volunteersData, error: volunteersError } = await query as { data: Record<string, unknown>[] | null; error: Error | null };

    if (volunteersError) {
      console.error('[VolunteerStorage] 加载用户失败:', volunteersError);
      return [];
    }

    console.log('[VolunteerStorage] 用户原始数据:', volunteersData?.length || 0, '条');

    // 获取志愿者-考场关联（仅对 volunteer 角色）
    let verData: { volunteer_id: string; exam_room_id: string }[] = [];
    try {
      const volunteerIds = (volunteersData || [])
        .filter(v => v.role === 'volunteer')
        .map(v => v.id as string);
      
      if (volunteerIds.length > 0) {
        const result = await supabase
          .from('lottery_volunteer_exam_rooms')
          .select('volunteer_id, exam_room_id')
          .in('volunteer_id', volunteerIds);
        
        if (!result.error) {
          verData = result.data || [];
          console.log('[VolunteerStorage] 考场关联数据:', verData.length, '条');
        }
      }
    } catch (e) {
      console.warn('[VolunteerStorage] 考场关联查询异常（不影响主数据）:', e);
    }

    // 合并数据
    const volunteers = (volunteersData || [])
      .map((v) => {
        try {
          const volunteer = volunteerToCamel(v as unknown as VolunteerSnake);
          // 查找该用户的考场分配（仅对志愿者角色）
          const volunteerId = (v as { id: string }).id;
          const roomIds = v.role === 'volunteer' 
            ? verData
                .filter((ver) => ver.volunteer_id === volunteerId)
                .map((ver) => ver.exam_room_id)
            : [];

          return {
            ...volunteer,
            loginId: (v as { login_id?: string }).login_id || '',
            role: (v as { role: string }).role as 'admin' | 'volunteer',
            examRoomIds: roomIds,
          };
        } catch (convertError) {
          console.error('[VolunteerStorage] 数据转换失败:', v, convertError);
          return null;
        }
      })
      .filter(Boolean) as Volunteer[];

    console.log('[VolunteerStorage] 处理完成，共', volunteers.length, '条', volunteers);
    return volunteers;
  } catch (error) {
    console.error('[VolunteerStorage] 加载异常:', error);
    return [];
  }
};

// 确保缓存已初始化（带防止重复请求机制）
const ensureCache = async (): Promise<Volunteer[]> => {
  // 如果缓存已有数据，直接返回
  if (volunteersCache !== null) {
    return volunteersCache;
  }

  // 如果正在加载中，等待当前请求完成
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // 开始加载
  isLoading = true;
  loadPromise = loadFromSupabase()
    .then((data) => {
      volunteersCache = data;
      isLoading = false;
      return data;
    })
    .catch((err) => {
      console.error('[VolunteerStorage] 加载失败:', err);
      isLoading = false;
      return [];
    });

  console.log('[VolunteerStorage] 发起加载请求...', loadPromise);
  return loadPromise;
};

// 同步获取缓存（可能返回空数组，如果还没加载完成）
const getCacheSync = (): Volunteer[] => {
  return volunteersCache || [];
};

// 初始化（异步，在应用启动时调用）
ensureCache()
  .then(() => {
    console.log('[VolunteerStorage] 初始化完成');
  })
  .catch(console.error);

// ========== 同步 API（保持与原 contract 一致）==========

// 获取所有用户（如果缓存为空，尝试异步加载）
export const getAllVolunteers = (): Volunteer[] => {
  const cache = getCacheSync();
  if (cache.length === 0 && !isLoading) {
    // 如果缓存为空且未在加载，触发后台加载
    ensureCache().then(() => {
      console.log('[VolunteerStorage] 后台加载完成');
    });
  }
  return cache;
};

// 按角色获取用户
export const getVolunteersByRole = (role: 'admin' | 'volunteer'): Volunteer[] => {
  const volunteers = getCacheSync();
  return volunteers.filter((v) => v.role === role);
};

// 获取单个用户
export const getVolunteerById = (id: string): Volunteer | undefined => {
  const volunteers = getCacheSync();
  return volunteers.find((volunteer) => volunteer.id === id);
};

// 根据用户名获取用户
export const getVolunteerByUsername = (username: string): Volunteer | undefined => {
  const volunteers = getCacheSync();
  return volunteers.find((volunteer) => volunteer.username === username);
};

// 根据学工号获取用户
export const getVolunteerByLoginId = (loginId: string): Volunteer | undefined => {
  const volunteers = getCacheSync();
  return volunteers.find((volunteer) => volunteer.loginId === loginId);
};

// 添加用户（自动附加学院）
export const addVolunteer = (volunteer: Volunteer): void => {
  // 确保 ID 是有效的 UUID，如果不是则生成新的
  const validId = isValidUUID(volunteer.id) ? volunteer.id : crypto.randomUUID();
  const volunteerWithValidId = { ...volunteer, id: validId };

  // 更新缓存
  const volunteers = getCacheSync();
  volunteers.push(volunteerWithValidId);
  volunteersCache = volunteers;

  // 分离考场关联数据
  const { examRoomIds, password, ...volunteerData } = volunteerWithValidId;
  const snakeVolunteer = volunteerToSnake(volunteerData);

  const academyId = getCurrentAcademyId();

  const insertData = {
    ...snakeVolunteer,
    password_hash: password || null,
    academy_id: academyId || volunteer.academyId, // 优先使用当前学院
  };

  // 只发送 volunteers 表有的字段，不包含 examRoomIds
  supabase
    .from('lottery_volunteers')
    .insert(insertData as never)
    .then(({ error }) => {
      if (error) console.error('Failed to add user to Supabase:', error);
    });

  // 仅对志愿者角色同步考场分配
  if (volunteer.role === 'volunteer' && examRoomIds && examRoomIds.length > 0) {
    examRoomIds.forEach((roomId) => {
      supabase
        .from('lottery_volunteer_exam_rooms')
        .insert({
          volunteer_id: validId,
          exam_room_id: roomId,
        } as never)
        .then(({ error }) => {
          if (error) console.error('Failed to assign exam room:', error);
        });
    });
  }
};

// 更新用户（带学院过滤）
export const updateVolunteer = (id: string, updates: Partial<Volunteer>): void => {
  // 更新缓存
  const volunteers = getCacheSync();
  const index = volunteers.findIndex((volunteer) => volunteer.id === id);
  if (index !== -1) {
    volunteers[index] = { ...volunteers[index], ...updates };
    volunteersCache = volunteers;
  }

  // 分离考场关联数据
  const { examRoomIds, password, ...updateData } = updates;
  const snakeUpdates = volunteerToSnake(updateData);

  const academyId = getCurrentAcademyId();
  const snakeUpdateData = { ...snakeUpdates };

  // 只更新 volunteers 表有的字段（带学院过滤）
  if (Object.keys(snakeUpdates).length > 0) {
    let query = supabase
      .from('lottery_volunteers')
      .update(snakeUpdateData as never)
      .eq('id', id);

    // 添加学院过滤（如果当前有学院）
    if (academyId) {
      query = query.eq('academy_id', academyId);
    }

    query.then(({ error }) => {
      if (error) console.error('Failed to update user in Supabase:', error);
    });
  }

  // 处理考场关联更新（仅对志愿者角色）
  const currentVolunteer = volunteers.find(v => v.id === id);
  if (currentVolunteer?.role === 'volunteer' && examRoomIds !== undefined) {
    batchAssignExamRoomsToVolunteer(id, examRoomIds);
  }
};

// 删除用户（带学院过滤）
export const deleteVolunteer = (id: string): void => {
  // 更新缓存
  const volunteers = getCacheSync();
  volunteersCache = volunteers.filter((volunteer) => volunteer.id !== id);

  const academyId = getCurrentAcademyId();

  // 先删除关联表数据（仅对志愿者角色）
  const deletedUser = volunteers.find(v => v.id === id);
  if (deletedUser?.role === 'volunteer') {
    supabase
      .from('lottery_volunteer_exam_rooms')
      .delete()
      .eq('volunteer_id', id)
      .then(() => {
        // 再删除用户
        deleteUserFromDb(id, academyId);
      });
  } else {
    // 直接删除用户
    deleteUserFromDb(id, academyId);
  }
};

// 辅助函数：从数据库删除用户
const deleteUserFromDb = (id: string, academyId: string | null) => {
  let query = supabase
    .from('lottery_volunteers')
    .delete()
    .eq('id', id);

  if (academyId) {
    query = query.eq('academy_id', academyId);
  }

  query.then(({ error }) => {
    if (error) console.error('Failed to delete user from Supabase:', error);
  });
};

// 清空所有用户（保留特定角色，带学院过滤）
export const clearAllVolunteers = (): void => {
  const volunteers = getCacheSync();
  // 保留管理员角色
  const adminOnly = volunteers.filter((v) => v.role === 'admin');
  volunteersCache = adminOnly;

  const academyId = getCurrentAcademyId();

  // 先删除所有志愿者的关联
  const volunteerIds = volunteers
    .filter(v => v.role === 'volunteer')
    .map(v => v.id);

  if (volunteerIds.length > 0) {
    supabase
      .from('lottery_volunteer_exam_rooms')
      .delete()
      .in('volunteer_id', volunteerIds)
      .then(() => {
        // 再删除非管理员用户（带学院过滤）
        let query = supabase
          .from('lottery_volunteers')
          .delete()
          .neq('role', 'admin');

        if (academyId) {
          query = query.eq('academy_id', academyId);
        }

        query.then(({ error }) => {
          if (error) console.error('Failed to clear users from Supabase:', error);
        });
      });
  }
};

// ========== 考场分配相关（仅对志愿者角色有效）==========

// 分配考场给用户
export const assignExamRoomToVolunteer = (volunteerId: string, examRoomId: string): void => {
  const volunteer = getVolunteerById(volunteerId);
  if (!volunteer || volunteer.role !== 'volunteer') return;

  if (volunteer) {
    const examRoomIds = volunteer.examRoomIds || [];
    if (!examRoomIds.includes(examRoomId)) {
      examRoomIds.push(examRoomId);

      // 更新缓存
      const volunteers = getCacheSync();
      const index = volunteers.findIndex((v) => v.id === volunteerId);
      if (index !== -1) {
        volunteers[index].examRoomIds = examRoomIds;
        volunteersCache = volunteers;
      }

      // 插入关联表
      supabase
        .from('lottery_volunteer_exam_rooms')
        .insert({
          volunteer_id: volunteerId,
          exam_room_id: examRoomId,
        } as never)
        .then(({ error }) => {
          if (error) console.error('Failed to assign exam room:', error);
        });
    }
  }
};

// 取消分配考场
export const unassignExamRoomFromVolunteer = (volunteerId: string, examRoomId: string): void => {
  const volunteer = getVolunteerById(volunteerId);
  if (!volunteer || volunteer.role !== 'volunteer') return;

  const examRoomIds = volunteer.examRoomIds.filter((id) => id !== examRoomId);

  // 更新缓存
  const volunteers = getCacheSync();
  const index = volunteers.findIndex((v) => v.id === volunteerId);
  if (index !== -1) {
    volunteers[index].examRoomIds = examRoomIds;
    volunteersCache = volunteers;
  }

  // 删除关联表记录
  supabase
    .from('lottery_volunteer_exam_rooms')
    .delete()
    .eq('volunteer_id', volunteerId)
    .eq('exam_room_id', examRoomId)
    .then(({ error }) => {
      if (error) console.error('Failed to unassign exam room:', error);
    });
};

// 批量分配考场给用户
export const batchAssignExamRoomsToVolunteer = (volunteerId: string, examRoomIds: string[]): void => {
  const volunteer = getVolunteerById(volunteerId);
  if (!volunteer || volunteer.role !== 'volunteer') return;

  // 更新缓存
  const volunteers = getCacheSync();
  const index = volunteers.findIndex((v) => v.id === volunteerId);
  if (index !== -1) {
    volunteers[index].examRoomIds = examRoomIds;
    volunteersCache = volunteers;
  }

  // 先删除旧关联
  supabase
    .from('lottery_volunteer_exam_rooms')
    .delete()
    .eq('volunteer_id', volunteerId)
    .then(() => {
      // 插入新关联
      if (examRoomIds.length > 0) {
        const relations = examRoomIds.map((roomId) => ({
          volunteer_id: volunteerId,
          exam_room_id: roomId,
        }));
        supabase
          .from('lottery_volunteer_exam_rooms')
          .insert(relations as never)
          .then(({ error }) => {
            if (error) console.error('Failed to batch assign exam rooms:', error);
          });
      }
    });
};

// 获取考场下的所有志愿者
export const getVolunteersByExamRoomId = (examRoomId: string): Volunteer[] => {
  const volunteers = getCacheSync();
  return volunteers.filter((v) => v.role === 'volunteer' && v.examRoomIds && v.examRoomIds.includes(examRoomId));
};

// 批量分配志愿者到考场
export const assignVolunteersToExamRoom = (examRoomId: string, volunteerIds: string[]): void => {
  volunteerIds.forEach((volunteerId) => {
    assignExamRoomToVolunteer(volunteerId, examRoomId);
  });
};

// ========== 登录验证（统一使用 verify_user RPC）==========

// 验证登录（异步版本，使用 Supabase RPC 验证）
export interface ValidatedUser extends Volunteer {
  academy: {
    id: string;
    name: string;
  };
}

export const validateUser = async (
  username: string,
  password: string
): Promise<ValidatedUser | null> => {
  try {
    // 使用统一的 verify_user RPC 函数
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('verify_user', {
      p_username: username,
      p_password: password
    });

    if (error) {
      console.error('RPC 验证错误:', error);
      return null;
    }

    const result = data as {
      success: boolean;
      user_id: string;
      username: string;
      name: string;
      role: string;
      phone: string;
      email: string;
      academy_id: string;
      academy_name: string;
    };

    if (!result?.success) {
      return null;
    }

    return {
      id: result.user_id,
      username: result.username,
      name: result.name,
      role: result.role as 'admin' | 'volunteer',
      phone: result.phone,
      email: result.email,
      status: 'active',
      academyId: result.academy_id,
      examRoomIds: [], // 从关联表获取
      createdAt: new Date().toISOString(),
      academy: {
        id: result.academy_id,
        name: result.academy_name,
      },
    };
  } catch (error) {
    console.error('Validate user error:', error);
    return null;
  }
};

// 检查用户名是否存在
export const isUsernameExists = (username: string): boolean => {
  const volunteer = getVolunteerByUsername(username);
  return !!volunteer;
};

// 检查学工号是否存在
export const isLoginIdExists = (loginId: string): boolean => {
  const volunteer = getVolunteerByLoginId(loginId);
  return !!volunteer;
};

// ========== 异步 API（用于强制刷新）==========

// 强制从 Supabase 刷新数据
export const refreshVolunteers = async (): Promise<Volunteer[]> => {
  volunteersCache = null; // 清空缓存，强制重新加载
  return await ensureCache();
};

// 等待初始化完成（供 App 启动时调用）
export const waitForVolunteersLoaded = async (): Promise<Volunteer[]> => {
  return await ensureCache();
};
