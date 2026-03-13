-- Migration: 001_create_tables
-- Description: 创建研究生复试抽签系统所有核心表结构
-- 注意：管理员和志愿者已合并为统一用户表 lottery_volunteers
-- Created: 2026-03-05
-- Updated: 2026-03-10 (移除 lottery_admins，统一表结构)

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 学院表 (lottery_academies)
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_academies (
    id TEXT PRIMARY KEY,                          -- 学院ID，如 "mech", "cs"
    name TEXT NOT NULL,                           -- 学院名称，如 "机械工程学院"
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE lottery_academies IS '学院表';
COMMENT ON COLUMN lottery_academies.id IS '学院唯一标识，通常使用英文缩写';

-- ============================================
-- 2. 统一用户表 (lottery_volunteers)
-- 合并原 lottery_admins 和 lottery_volunteers 功能
-- 通过 role 字段区分：admin | volunteer
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login_id TEXT,                                -- SSO学工号（可选，用于统一身份认证）
    username TEXT NOT NULL UNIQUE,                -- 登录用户名
    name TEXT NOT NULL,                           -- 真实姓名
    phone TEXT,                                   -- 联系电话
    email TEXT,                                   -- 邮箱地址
    password_hash TEXT,                           -- 密码（明文存储，依赖HTTPS）
    role TEXT NOT NULL DEFAULT 'volunteer',       -- 角色: admin | volunteer
    status TEXT NOT NULL DEFAULT 'active',        -- 状态: active | inactive
    academy_id TEXT REFERENCES lottery_academies(id),  -- 学院ID（外键）
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ                     -- 最后登录时间
);

COMMENT ON TABLE lottery_volunteers IS '统一用户表（管理员和志愿者）';
COMMENT ON COLUMN lottery_volunteers.login_id IS 'SSO学工号，用于统一身份认证匹配';
COMMENT ON COLUMN lottery_volunteers.username IS '系统登录账号，唯一';
COMMENT ON COLUMN lottery_volunteers.role IS '用户角色: admin-管理员, volunteer-志愿者';
COMMENT ON COLUMN lottery_volunteers.password_hash IS '密码（明文存储，生产环境依赖HTTPS）';

-- 为 login_id 添加条件唯一约束（仅非空值）
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteers_login_id_unique 
    ON lottery_volunteers(login_id) 
    WHERE login_id IS NOT NULL AND login_id != '';

-- ============================================
-- 3. 批次表 (lottery_batches)
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                           -- 批次名称
    year TEXT NOT NULL,                           -- 年份，如 "2024"
    semester TEXT NOT NULL,                       -- 学期，如 "春季"、"秋季"
    academy TEXT NOT NULL,                        -- 学院名称（冗余，方便显示）
    academy_id TEXT NOT NULL REFERENCES lottery_academies(id),  -- 学院ID（外键）
    start_date DATE NOT NULL,                     -- 开始日期
    end_date DATE NOT NULL,                       -- 结束日期
    status TEXT NOT NULL DEFAULT 'draft',         -- 状态: draft | active | completed
    created_at TIMESTAMPTZ DEFAULT now(),
    total_groups INTEGER DEFAULT 0,               -- 分组总数（冗余统计）
    total_candidates INTEGER DEFAULT 0            -- 考生总数（冗余统计）
);

COMMENT ON TABLE lottery_batches IS '考试批次表';
COMMENT ON COLUMN lottery_batches.status IS '批次状态: draft-草稿, active-进行中, completed-已完成';

-- ============================================
-- 4. 考场表 (lottery_exam_rooms)
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_exam_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                           -- 考场名称，如"机械楼301"
    location TEXT NOT NULL,                       -- 详细位置
    building TEXT NOT NULL,                       -- 楼栋
    floor TEXT NOT NULL,                          -- 楼层
    capacity INTEGER NOT NULL,                    -- 容量
    facilities JSONB DEFAULT '[]',                -- 设施列表，如 ["投影仪", "白板"]
    status TEXT NOT NULL DEFAULT 'active',        -- 状态: active | inactive
    created_at TIMESTAMPTZ DEFAULT now(),
    description TEXT,                             -- 备注
    academy_id TEXT NOT NULL REFERENCES lottery_academies(id)  -- 学院ID（外键）
);

COMMENT ON TABLE lottery_exam_rooms IS '考场表';
COMMENT ON COLUMN lottery_exam_rooms.facilities IS '设施列表，JSON数组格式';

-- ============================================
-- 5. 分组表 (lottery_groups)
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES lottery_batches(id) ON DELETE CASCADE,
    batch_name TEXT NOT NULL,                     -- 批次名称（冗余，方便显示）
    name TEXT NOT NULL,                           -- 分组名称
    description TEXT DEFAULT '',                  -- 分组描述
    candidate_count INTEGER DEFAULT 0,            -- 考生数量
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- 考场和时间配置
    exam_room_id UUID REFERENCES lottery_exam_rooms(id) ON DELETE SET NULL,
    exam_room_name TEXT,                          -- 考场名称（冗余）
    date DATE NOT NULL,                           -- 面试日期 YYYY-MM-DD
    start_time TIME NOT NULL,                     -- 开始时间 HH:mm
    end_time TIME NOT NULL,                       -- 结束时间 HH:mm
    academy_id TEXT NOT NULL REFERENCES lottery_academies(id)  -- 学院ID（外键）
);

COMMENT ON TABLE lottery_groups IS '考试分组表';

-- ============================================
-- 6. 考生表 (lottery_candidates)
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES lottery_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                           -- 姓名
    id_card TEXT NOT NULL,                        -- 身份证号
    registration_no TEXT,                         -- 准考证号
    candidate_no TEXT,                            -- 考生编号
    phone TEXT,                                   -- 联系电话
    status TEXT NOT NULL DEFAULT 'waiting',       -- 状态: waiting | drawn | absent | completed
    drawn_number INTEGER,                         -- 抽签号码
    drawn_time TIMESTAMPTZ                        -- 抽签时间
);

COMMENT ON TABLE lottery_candidates IS '考生表';
COMMENT ON COLUMN lottery_candidates.status IS '考生状态: waiting-等待中, drawn-已抽签, absent-缺席, completed-已完成';

-- ============================================
-- 7. 志愿者-考场关联表 (lottery_volunteer_exam_rooms)
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_volunteer_exam_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID NOT NULL REFERENCES lottery_volunteers(id) ON DELETE CASCADE,
    exam_room_id UUID NOT NULL REFERENCES lottery_exam_rooms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(volunteer_id, exam_room_id)
);

COMMENT ON TABLE lottery_volunteer_exam_rooms IS '志愿者与考场的分配关系（多对多）';

-- ============================================
-- 8. 分组-志愿者关联表 (lottery_group_volunteers)
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_group_volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES lottery_groups(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES lottery_volunteers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, volunteer_id)
);

COMMENT ON TABLE lottery_group_volunteers IS '分组与志愿者的分配关系（多对多）';

-- ============================================
-- 9. SSO用户映射表 (lottery_users)
-- 用于统一身份认证，关联到 lottery_volunteers
-- ============================================
CREATE TABLE IF NOT EXISTS lottery_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,              -- 学工号（统一身份认证账号），小写存储
    name TEXT NOT NULL,                           -- 真实姓名
    role TEXT NOT NULL DEFAULT 'student',         -- 角色: student | teacher | admin
    department TEXT,                              -- 所属学院/部门
    status TEXT NOT NULL DEFAULT 'active',        -- 状态: active | inactive
    auth_source TEXT NOT NULL DEFAULT 'sso',      -- 认证来源: sso | local
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ                     -- 最后登录时间
);

COMMENT ON TABLE lottery_users IS 'SSO用户映射表（用于统一身份认证）';
COMMENT ON COLUMN lottery_users.student_id IS '学工号，统一身份认证账号，统一存储为小写';
