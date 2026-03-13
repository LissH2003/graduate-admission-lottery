/**
 * 数据转换工具函数
 * 用于在 Supabase snake_case 和前端 camelCase 之间转换
 */

// 将 snake_case 转换为 camelCase
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// 将 camelCase 转换为 snake_case
export const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

// 将对象的 key 从 snake_case 转换为 camelCase
export const keysToCamelCase = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = keysToCamelCase(value as Record<string, unknown>);
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
};

// 将对象的 key 从 camelCase 转换为 snake_case
export const keysToSnakeCase = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = keysToSnakeCase(value as Record<string, unknown>);
    } else {
      result[snakeKey] = value;
    }
  }
  return result as T;
};

// 批量转换数组中的对象
export const arrayToCamelCase = <T>(arr: Record<string, unknown>[]): T[] => {
  return arr.map((item) => keysToCamelCase(item) as T);
};

export const arrayToSnakeCase = <T>(arr: Record<string, unknown>[]): T[] => {
  return arr.map((item) => keysToSnakeCase(item) as T);
};

// 特定实体的转换函数（用于精确类型控制）

// Batch 转换
export interface BatchSnake {
  id: string;
  name: string;
  year: string;
  semester: string;
  academy: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  total_groups: number;
  total_candidates: number;
}

export interface BatchCamel {
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

export const batchToCamel = (batch: BatchSnake): BatchCamel => ({
  id: batch.id,
  name: batch.name,
  year: batch.year,
  semester: batch.semester,
  academy: batch.academy,
  startDate: batch.start_date,
  endDate: batch.end_date,
  status: batch.status,
  createdAt: batch.created_at,
  totalGroups: batch.total_groups,
  totalCandidates: batch.total_candidates,
});

export const batchToSnake = (batch: Partial<BatchCamel>): Partial<BatchSnake> => {
  const result: Partial<BatchSnake> = {};
  if (batch.id !== undefined) result.id = batch.id;
  if (batch.name !== undefined) result.name = batch.name;
  if (batch.year !== undefined) result.year = batch.year;
  if (batch.semester !== undefined) result.semester = batch.semester;
  if (batch.academy !== undefined) result.academy = batch.academy;
  if (batch.startDate !== undefined) result.start_date = batch.startDate;
  if (batch.endDate !== undefined) result.end_date = batch.endDate;
  if (batch.status !== undefined) result.status = batch.status;
  if (batch.createdAt !== undefined) result.created_at = batch.createdAt;
  if (batch.totalGroups !== undefined) result.total_groups = batch.totalGroups;
  if (batch.totalCandidates !== undefined) result.total_candidates = batch.totalCandidates;
  return result;
};

// Group 转换
export interface GroupSnake {
  id: string;
  batch_id: string;
  batch_name: string;
  name: string;
  description: string;
  candidate_count: number;
  created_at: string;
  exam_room_id: string | null;
  exam_room_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  academy_id: string;
  volunteer_ids?: string[];
}

export interface GroupCamel {
  id: string;
  batchId: string;
  batchName: string;
  name: string;
  description: string;
  candidateCount: number;
  createdAt: string;
  examRoomId: string | null;
  examRoomName: string | null;
  date: string;
  time: string;
  endTime: string;
  academyId: string;
  volunteerIds?: string[];
}

export const groupToCamel = (group: GroupSnake): GroupCamel => ({
  id: group.id,
  batchId: group.batch_id,
  batchName: group.batch_name,
  name: group.name,
  description: group.description,
  candidateCount: group.candidate_count,
  createdAt: group.created_at,
  examRoomId: group.exam_room_id,
  examRoomName: group.exam_room_name,
  date: group.date,
  time: group.start_time,
  endTime: group.end_time,
  academyId: group.academy_id,
  volunteerIds: group.volunteer_ids,
});

export const groupToSnake = (group: Partial<GroupCamel>): Partial<GroupSnake> => {
  const result: Partial<GroupSnake> = {};
  if (group.id !== undefined) result.id = group.id;
  if (group.batchId !== undefined) result.batch_id = group.batchId;
  if (group.batchName !== undefined) result.batch_name = group.batchName;
  if (group.name !== undefined) result.name = group.name;
  if (group.description !== undefined) result.description = group.description;
  if (group.candidateCount !== undefined) result.candidate_count = group.candidateCount;
  if (group.createdAt !== undefined) result.created_at = group.createdAt;
  if (group.examRoomId !== undefined) result.exam_room_id = group.examRoomId;
  if (group.examRoomName !== undefined) result.exam_room_name = group.examRoomName;
  if (group.date !== undefined) result.date = group.date;
  if (group.time !== undefined) result.start_time = group.time;
  if (group.endTime !== undefined) result.end_time = group.endTime;
  if (group.academyId !== undefined) result.academy_id = group.academyId;
  return result;
};

// Candidate 转换
export interface CandidateSnake {
  id: string;
  group_id: string;
  name: string;
  id_card: string;
  registration_no: string | null;
  candidate_no: string | null;
  phone: string | null;
  status: 'waiting' | 'drawn' | 'absent' | 'completed';
  drawn_number: number | null;
  drawn_time: string | null;
}

export interface CandidateCamel {
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

export const candidateToCamel = (candidate: CandidateSnake): CandidateCamel => ({
  id: candidate.id,
  groupId: candidate.group_id,
  name: candidate.name,
  idCard: candidate.id_card,
  registrationNo: candidate.registration_no ?? undefined,
  candidateNo: candidate.candidate_no ?? undefined,
  phone: candidate.phone ?? undefined,
  status: candidate.status,
  drawnNumber: candidate.drawn_number ?? undefined,
  drawnTime: candidate.drawn_time ?? undefined,
});

export const candidateToSnake = (candidate: Partial<CandidateCamel>): Partial<CandidateSnake> => {
  const result: Partial<CandidateSnake> = {};
  if (candidate.id !== undefined) result.id = candidate.id;
  if (candidate.groupId !== undefined) result.group_id = candidate.groupId;
  if (candidate.name !== undefined) result.name = candidate.name;
  if (candidate.idCard !== undefined) result.id_card = candidate.idCard;
  if (candidate.registrationNo !== undefined) result.registration_no = candidate.registrationNo;
  if (candidate.candidateNo !== undefined) result.candidate_no = candidate.candidateNo;
  if (candidate.phone !== undefined) result.phone = candidate.phone;
  if (candidate.status !== undefined) result.status = candidate.status;
  if (candidate.drawnNumber !== undefined) result.drawn_number = candidate.drawnNumber;
  if (candidate.drawnTime !== undefined) result.drawn_time = candidate.drawnTime;
  return result;
};

// ExamRoom 转换
export interface ExamRoomSnake {
  id: string;
  name: string;
  location: string;
  building: string;
  floor: string;
  capacity: number;
  facilities: string[];
  status: 'active' | 'inactive';
  created_at: string;
  description: string | null;
  academy_id: string;
}

export interface ExamRoomCamel {
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
  academyId: string;
}

export const examRoomToCamel = (room: ExamRoomSnake): ExamRoomCamel => ({
  id: room.id,
  name: room.name,
  location: room.location,
  building: room.building,
  floor: room.floor,
  capacity: room.capacity,
  facilities: room.facilities,
  status: room.status,
  createdAt: room.created_at,
  description: room.description ?? undefined,
  academyId: room.academy_id,
});

export const examRoomToSnake = (room: Partial<ExamRoomCamel>): Partial<ExamRoomSnake> => {
  const result: Partial<ExamRoomSnake> = {};
  if (room.id !== undefined) result.id = room.id;
  if (room.name !== undefined) result.name = room.name;
  if (room.location !== undefined) result.location = room.location;
  if (room.building !== undefined) result.building = room.building;
  if (room.floor !== undefined) result.floor = room.floor;
  if (room.capacity !== undefined) result.capacity = room.capacity;
  if (room.facilities !== undefined) result.facilities = room.facilities;
  if (room.status !== undefined) result.status = room.status;
  if (room.createdAt !== undefined) result.created_at = room.createdAt;
  if (room.description !== undefined) result.description = room.description;
  if (room.academyId !== undefined) result.academy_id = room.academyId;
  return result;
};

// Volunteer 转换
export interface VolunteerSnake {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  password_hash: string | null;
  created_at: string;
  status: 'active' | 'inactive';
  academy_id: string;
}

export interface VolunteerCamel {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  createdAt: string;
  status: 'active' | 'inactive';
  examRoomIds?: string[];
  academyId: string;
}

export const volunteerToCamel = (volunteer: VolunteerSnake): VolunteerCamel => ({
  id: volunteer.id,
  username: volunteer.username,
  name: volunteer.name,
  phone: volunteer.phone,
  email: volunteer.email,
  password: volunteer.password_hash || undefined,
  createdAt: volunteer.created_at,
  status: volunteer.status,
  academyId: volunteer.academy_id,
});

export const volunteerToSnake = (volunteer: Partial<VolunteerCamel>): Partial<VolunteerSnake> => {
  const result: Partial<VolunteerSnake> = {};
  if (volunteer.id !== undefined) result.id = volunteer.id;
  if (volunteer.username !== undefined) result.username = volunteer.username;
  if (volunteer.name !== undefined) result.name = volunteer.name;
  if (volunteer.phone !== undefined) result.phone = volunteer.phone;
  if (volunteer.email !== undefined) result.email = volunteer.email;
  if (volunteer.createdAt !== undefined) result.created_at = volunteer.createdAt;
  if (volunteer.status !== undefined) result.status = volunteer.status;
  if (volunteer.academyId !== undefined) result.academy_id = volunteer.academyId;
  return result;
};
