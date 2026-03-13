-- Migration: 009_update_sso_find_user
-- Description: 更新 find_user_by_student_id 函数，查询 lottery_volunteers 表
-- 废弃 lottery_users 表，统一使用 lottery_volunteers

-- ============================================
-- 1. 更新根据学工号查找用户的函数（查询 lottery_volunteers 表）
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
        v.id,
        COALESCE(v.login_id, v.username) as student_id,  -- 优先使用 login_id
        v.name,
        v.role,
        a.name as department,  -- 从 lottery_academies 获取学院名称
        v.status,
        'sso'::TEXT as auth_source,
        v.created_at,
        v.created_at as updated_at,  -- lottery_volunteers 没有 updated_at，用 created_at 替代
        NULL::TIMESTAMPTZ as last_login_at  -- lottery_volunteers 没有 last_login_at
    FROM lottery_volunteers v
    LEFT JOIN lottery_academies a ON v.academy_id = a.id
    WHERE LOWER(COALESCE(v.login_id, v.username)) = LOWER(p_student_id)
      AND v.status = 'active'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_user_by_student_id(TEXT) IS '根据学工号查找用户（查询 lottery_volunteers 表）';

-- ============================================
-- 2. 可选：删除旧的 lottery_users 相关函数
-- ============================================
-- DROP FUNCTION IF EXISTS update_user_login_time(TEXT);

-- ============================================
-- 3. 添加 login_id 索引（如果不存在）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_volunteers_login_id_lower 
ON lottery_volunteers(LOWER(login_id)) 
WHERE login_id IS NOT NULL AND login_id != '';

-- ============================================
-- 4. 刷新 PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';
