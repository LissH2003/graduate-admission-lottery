-- Migration: 006_add_sso_support
-- Description: 添加 SSO 统一身份认证支持（竹云 OAuth2）
-- Created: 2026-03-10
-- 策略：新建独立表 lottery_users，不修改现有 lottery_admins/volunteers 表，避免数据冲突

-- ============================================
-- 1. SSO 用户表 (lottery_users)
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

COMMENT ON TABLE lottery_users IS '统一用户表（支持 SSO 和本地账号）';
COMMENT ON COLUMN lottery_users.student_id IS '学工号，统一身份认证账号，统一存储为小写';
COMMENT ON COLUMN lottery_users.role IS '用户角色: student-学生, teacher-教师, admin-管理员';
COMMENT ON COLUMN lottery_users.auth_source IS '认证来源: sso-统一身份认证, local-本地账号';

-- ============================================
-- 2. 索引（支持忽略大小写的学工号查询）
-- ============================================
-- 学工号小写索引（确保唯一性和快速查询）
CREATE INDEX IF NOT EXISTS idx_lottery_users_student_id_lower 
    ON lottery_users (LOWER(student_id));

-- 状态索引（快速筛选有效用户）
CREATE INDEX IF NOT EXISTS idx_lottery_users_status 
    ON lottery_users (status);

-- 角色索引（按角色查询）
CREATE INDEX IF NOT EXISTS idx_lottery_users_role 
    ON lottery_users (role);

-- 认证来源索引
CREATE INDEX IF NOT EXISTS idx_lottery_users_auth_source 
    ON lottery_users (auth_source);

-- 组合索引（状态+角色，用于权限筛选）
CREATE INDEX IF NOT EXISTS idx_lottery_users_status_role 
    ON lottery_users (status, role);

-- ============================================
-- 3. Row Level Security (RLS) 策略
-- ============================================
-- 启用 RLS
ALTER TABLE lottery_users ENABLE ROW LEVEL SECURITY;

-- 策略：允许已认证用户读取用户列表（用于管理员查看）
CREATE POLICY "Allow authenticated users to read users"
    ON lottery_users
    FOR SELECT
    TO authenticated
    USING (true);

-- 策略：仅允许服务角色/Edge Function 修改用户数据
CREATE POLICY "Only service role can modify users"
    ON lottery_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 4. 更新最后登录时间的触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_user_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 注意：如果触发器已存在则先删除再创建（支持重复执行）
DROP TRIGGER IF EXISTS trg_update_user_last_login ON lottery_users;

CREATE TRIGGER trg_update_user_last_login
    BEFORE UPDATE ON lottery_users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_login();

-- ============================================
-- 5. 根据学工号查找用户的函数（忽略大小写）
-- ============================================
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
        u.id,
        u.student_id,
        u.name,
        u.role,
        u.department,
        u.status,
        u.auth_source,
        u.created_at,
        u.updated_at,
        u.last_login_at
    FROM lottery_users u
    WHERE LOWER(u.student_id) = LOWER(p_student_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_user_by_student_id(TEXT) IS '根据学工号查找用户（忽略大小写）';

-- ============================================
-- 6. 更新用户最后登录时间的函数
-- ============================================
CREATE OR REPLACE FUNCTION update_user_login_time(p_student_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE lottery_users
    SET last_login_at = now()
    WHERE LOWER(student_id) = LOWER(p_student_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_login_time(TEXT) IS '更新用户最后登录时间';
