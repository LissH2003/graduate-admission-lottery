-- Migration: 000_init_database
-- Description: 北科大研究生复试抽签系统 - 数据库初始化（合并版）
-- 包含：表结构、索引、函数、RLS、初始数据
-- Created: 2026-03-11

-- ============================================
-- 0. 启用扩展
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 创建表结构
-- ============================================

-- 1.1 学院表
CREATE TABLE IF NOT EXISTS lottery_academies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE lottery_academies IS '学院表';

-- 1.2 统一用户表（管理员和志愿者合并）
CREATE TABLE IF NOT EXISTS lottery_volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login_id TEXT,                                -- SSO学工号
    username TEXT NOT NULL UNIQUE,                -- 登录用户名
    name TEXT NOT NULL,                           -- 真实姓名
    phone TEXT,                                   -- 联系电话
    email TEXT,                                   -- 邮箱地址
    password_hash TEXT,                           -- 密码（明文，依赖HTTPS）
    role TEXT NOT NULL DEFAULT 'volunteer',       -- 角色: admin | volunteer
    status TEXT NOT NULL DEFAULT 'active',        -- 状态: active | inactive
    academy_id TEXT REFERENCES lottery_academies(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE lottery_volunteers IS '统一用户表（管理员和志愿者）';
COMMENT ON COLUMN lottery_volunteers.login_id IS 'SSO学工号，用于统一身份认证匹配';
COMMENT ON COLUMN lottery_volunteers.role IS '用户角色: admin-管理员, volunteer-志愿者';

-- 1.3 批次表
CREATE TABLE IF NOT EXISTS lottery_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    year TEXT NOT NULL,
    semester TEXT NOT NULL,
    academy TEXT NOT NULL,
    academy_id TEXT NOT NULL REFERENCES lottery_academies(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    total_groups INTEGER DEFAULT 0,
    total_candidates INTEGER DEFAULT 0
);

COMMENT ON TABLE lottery_batches IS '考试批次表';

-- 1.4 考场表
CREATE TABLE IF NOT EXISTS lottery_exam_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    building TEXT NOT NULL,
    floor TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    facilities JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    description TEXT,
    academy_id TEXT NOT NULL REFERENCES lottery_academies(id)
);

COMMENT ON TABLE lottery_exam_rooms IS '考场表';

-- 1.5 分组表
CREATE TABLE IF NOT EXISTS lottery_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES lottery_batches(id) ON DELETE CASCADE,
    batch_name TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    candidate_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    exam_room_id UUID REFERENCES lottery_exam_rooms(id) ON DELETE SET NULL,
    exam_room_name TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    academy_id TEXT NOT NULL REFERENCES lottery_academies(id)
);

COMMENT ON TABLE lottery_groups IS '考试分组表';

-- 1.6 考生表
CREATE TABLE IF NOT EXISTS lottery_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES lottery_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    id_card TEXT NOT NULL,
    registration_no TEXT,
    candidate_no TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'waiting',
    drawn_number INTEGER,
    drawn_time TIMESTAMPTZ
);

COMMENT ON TABLE lottery_candidates IS '考生表';
COMMENT ON COLUMN lottery_candidates.status IS '状态: waiting-等待, drawn-已抽签, absent-缺席, completed-完成';

-- 1.7 志愿者-考场关联表
CREATE TABLE IF NOT EXISTS lottery_volunteer_exam_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID NOT NULL REFERENCES lottery_volunteers(id) ON DELETE CASCADE,
    exam_room_id UUID NOT NULL REFERENCES lottery_exam_rooms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(volunteer_id, exam_room_id)
);

COMMENT ON TABLE lottery_volunteer_exam_rooms IS '志愿者与考场的分配关系';

-- 1.8 分组-志愿者关联表
CREATE TABLE IF NOT EXISTS lottery_group_volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES lottery_groups(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES lottery_volunteers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, volunteer_id)
);

COMMENT ON TABLE lottery_group_volunteers IS '分组与志愿者的分配关系';

-- ============================================
-- 2. 创建索引
-- ============================================

-- 2.1 用户表索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteers_username_unique ON lottery_volunteers(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteers_login_id_unique ON lottery_volunteers(login_id) 
    WHERE login_id IS NOT NULL AND login_id != '';
CREATE INDEX IF NOT EXISTS idx_volunteers_login_id_lower ON lottery_volunteers(LOWER(login_id)) 
    WHERE login_id IS NOT NULL AND login_id != '';
CREATE INDEX IF NOT EXISTS idx_volunteers_role ON lottery_volunteers(role);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON lottery_volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_academy_id ON lottery_volunteers(academy_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_academy_role ON lottery_volunteers(academy_id, role) 
    WHERE academy_id IS NOT NULL;

-- 2.2 批次表索引
CREATE INDEX IF NOT EXISTS idx_batches_academy_id ON lottery_batches(academy_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON lottery_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_year_semester ON lottery_batches(year, semester);

-- 2.3 考场表索引
CREATE INDEX IF NOT EXISTS idx_exam_rooms_academy_id ON lottery_exam_rooms(academy_id);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_building ON lottery_exam_rooms(building);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_status ON lottery_exam_rooms(status);

-- 2.4 分组表索引
CREATE INDEX IF NOT EXISTS idx_groups_batch_id ON lottery_groups(batch_id);
CREATE INDEX IF NOT EXISTS idx_groups_exam_room_id ON lottery_groups(exam_room_id);
CREATE INDEX IF NOT EXISTS idx_groups_date ON lottery_groups(date);
CREATE INDEX IF NOT EXISTS idx_groups_academy_id ON lottery_groups(academy_id);

-- 2.5 考生表索引
CREATE INDEX IF NOT EXISTS idx_candidates_group_id ON lottery_candidates(group_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON lottery_candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_drawn_number ON lottery_candidates(drawn_number);
CREATE INDEX IF NOT EXISTS idx_candidates_id_card ON lottery_candidates(id_card);

-- ============================================
-- 3. 创建函数
-- ============================================

-- 3.1 统一用户登录验证函数
CREATE OR REPLACE FUNCTION verify_user(
    p_username TEXT,
    p_password TEXT
) RETURNS TABLE (
    success BOOLEAN,
    user_id UUID,
    username TEXT,
    name TEXT,
    role TEXT,
    phone TEXT,
    email TEXT,
    academy_id UUID,
    academy_name TEXT,
    message TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_academy RECORD;
BEGIN
    SELECT * INTO v_user 
    FROM lottery_volunteers 
    WHERE lottery_volunteers.username = verify_user.p_username 
      AND lottery_volunteers.status = 'active';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
            NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT, 
            '用户不存在或已被禁用'::TEXT;
        RETURN;
    END IF;
    
    IF v_user.password_hash IS NULL OR v_user.password_hash != p_password THEN
        RETURN QUERY SELECT 
            false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
            NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT, 
            '密码错误'::TEXT;
        RETURN;
    END IF;
    
    SELECT a.name INTO v_academy 
    FROM lottery_academies a
    WHERE a.id = v_user.academy_id;
    
    RETURN QUERY SELECT 
        true, v_user.id, v_user.username, v_user.name, v_user.role,
        v_user.phone, v_user.email, v_user.academy_id, 
        COALESCE(v_academy.name, ''), '登录成功'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_user(TEXT, TEXT) IS '统一用户登录验证函数';

-- 3.2 根据学工号查找用户（SSO用）
CREATE OR REPLACE FUNCTION find_user_by_student_id(p_student_id TEXT)
RETURNS TABLE (
    id UUID,
    student_id TEXT,
    name TEXT,
    role TEXT,
    department TEXT,
    status TEXT,
    auth_source TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        COALESCE(v.login_id, v.username) as student_id,
        v.name,
        v.role,
        a.name as department,
        v.status,
        'sso'::TEXT as auth_source,
        v.created_at,
        v.created_at as updated_at,
        NULL::TIMESTAMPTZ as last_login_at
    FROM lottery_volunteers v
    LEFT JOIN lottery_academies a ON v.academy_id = a.id
    WHERE LOWER(COALESCE(v.login_id, v.username)) = LOWER(p_student_id)
      AND v.status = 'active'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_user_by_student_id(TEXT) IS '根据学工号查找用户（SSO用）';

-- ============================================
-- 4. 启用 RLS 并创建策略
-- ============================================

-- 4.1 统一用户表 RLS
ALTER TABLE lottery_volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许认证用户读取用户列表"
    ON lottery_volunteers FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "允许服务角色修改用户"
    ON lottery_volunteers FOR ALL
    TO service_role USING (true) WITH CHECK (true);

-- 4.2 批次表 RLS
ALTER TABLE lottery_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许认证用户读取批次"
    ON lottery_batches FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "允许服务角色修改批次"
    ON lottery_batches FOR ALL
    TO service_role USING (true) WITH CHECK (true);

-- 4.3 考场表 RLS
ALTER TABLE lottery_exam_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许认证用户读取考场"
    ON lottery_exam_rooms FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "允许服务角色修改考场"
    ON lottery_exam_rooms FOR ALL
    TO service_role USING (true) WITH CHECK (true);

-- 4.4 分组表 RLS
ALTER TABLE lottery_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许认证用户读取分组"
    ON lottery_groups FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "允许服务角色修改分组"
    ON lottery_groups FOR ALL
    TO service_role USING (true) WITH CHECK (true);

-- 4.5 考生表 RLS
ALTER TABLE lottery_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许认证用户读取考生"
    ON lottery_candidates FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "允许服务角色修改考生"
    ON lottery_candidates FOR ALL
    TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 5. 插入初始数据
-- ============================================

-- 5.1 学院数据
INSERT INTO lottery_academies (id, name) VALUES
    ('mech', '机械工程学院'),
    ('cs', '计算机科学与技术学院'),
    ('ee', '电子信息工程学院'),
    ('civil', '土木与资源工程学院'),
    ('material', '材料科学与工程学院'),
    ('chemical', '化学与生物工程学院'),
    ('math', '数理学院'),
    ('mgmt', '经济管理学院'),
    ('humanities', '文法学院'),
    ('marxism', '马克思主义学院')
ON CONFLICT (id) DO NOTHING;

-- 5.2 超级管理员账号（密码：admin123）
INSERT INTO lottery_volunteers (
    username, name, password_hash, role, status, academy_id, login_id
) VALUES (
    'admin', '系统管理员', 'admin123', 'admin', 'active', 'mech', 'admin'
) ON CONFLICT (username) DO NOTHING;

-- 5.3 测试志愿者账号（密码：volunteer123）
INSERT INTO lottery_volunteers (
    username, name, password_hash, role, status, academy_id, login_id
) VALUES 
    ('volunteer1', '测试志愿者1', 'volunteer123', 'volunteer', 'active', 'mech', '2024001'),
    ('volunteer2', '测试志愿者2', 'volunteer123', 'volunteer', 'active', 'cs', '2024002')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 6. 刷新缓存
-- ============================================
NOTIFY pgrst, 'reload schema';

-- 完成
