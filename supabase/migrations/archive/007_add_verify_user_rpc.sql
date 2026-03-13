-- Migration: 007_add_verify_user_rpc
-- Description: 添加统一用户登录验证 RPC 函数
-- 使用 lottery_volunteers 统一表，支持 admin 和 volunteer 角色
-- 密码明文比较（移除 bcrypt）

-- ============================================
-- 1. 统一用户登录验证函数
-- ============================================
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
    -- 从 lottery_volunteers 表查询用户
    SELECT * INTO v_user 
    FROM lottery_volunteers 
    WHERE lottery_volunteers.username = verify_user.p_username 
      AND lottery_volunteers.status = 'active';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false, 
            NULL::UUID, 
            NULL::TEXT, 
            NULL::TEXT, 
            NULL::TEXT,
            NULL::TEXT, 
            NULL::TEXT, 
            NULL::UUID, 
            NULL::TEXT, 
            '用户不存在或已被禁用'::TEXT;
        RETURN;
    END IF;
    
    -- 明文密码直接比较（注意：依赖 HTTPS 传输安全）
    IF v_user.password_hash IS NULL OR v_user.password_hash != p_password THEN
        RETURN QUERY SELECT 
            false, 
            NULL::UUID, 
            NULL::TEXT, 
            NULL::TEXT, 
            NULL::TEXT,
            NULL::TEXT, 
            NULL::TEXT, 
            NULL::UUID, 
            NULL::TEXT, 
            '密码错误'::TEXT;
        RETURN;
    END IF;
    
    -- 获取学院信息
    SELECT a.name INTO v_academy 
    FROM lottery_academies a
    WHERE a.id = v_user.academy_id;
    
    -- 更新最后登录时间（如果表中有该字段）
    -- 注意：当前 lottery_volunteers 表没有 last_login_at 字段
    -- 如需记录，请先添加该字段
    
    RETURN QUERY SELECT 
        true, 
        v_user.id, 
        v_user.username, 
        v_user.name, 
        v_user.role,
        v_user.phone, 
        v_user.email, 
        v_user.academy_id, 
        COALESCE(v_academy.name, ''), 
        '登录成功'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_user(TEXT, TEXT) IS '统一用户登录验证函数（lottery_volunteers 表）';

-- ============================================
-- 2. 可选：废弃旧函数（保留但不使用）
-- ============================================
/*
-- 如需废弃旧函数，取消以下注释：

-- 废弃 verify_lottery_admin
DROP FUNCTION IF EXISTS verify_lottery_admin(TEXT, TEXT);

-- 废弃 verify_lottery_volunteer  
DROP FUNCTION IF EXISTS verify_lottery_volunteer(TEXT, TEXT);

-- 废弃相关触发器
DROP TRIGGER IF EXISTS trigger_encrypt_admin_password ON lottery_admins;
DROP TRIGGER IF EXISTS trigger_encrypt_volunteer_password ON lottery_volunteers;

*/

-- ============================================
-- 3. 为 lottery_volunteers 添加唯一约束（如果尚未添加）
-- ============================================

-- 确保 username 唯一
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_volunteers_username_unique'
    ) THEN
        -- 检查是否有重复数据
        IF EXISTS (
            SELECT username, COUNT(*) 
            FROM lottery_volunteers 
            GROUP BY username 
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE '发现重复的 username，请先清理数据再添加唯一约束';
        ELSE
            CREATE UNIQUE INDEX idx_volunteers_username_unique ON lottery_volunteers(username);
            RAISE NOTICE '已添加 username 唯一约束';
        END IF;
    END IF;
END $$;

-- 确保 login_id 唯一（如果不为空）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_volunteers_login_id_unique'
    ) THEN
        -- 检查是否有重复的非空 login_id
        IF EXISTS (
            SELECT login_id, COUNT(*) 
            FROM lottery_volunteers 
            WHERE login_id IS NOT NULL AND login_id != ''
            GROUP BY login_id 
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE '发现重复的 login_id，请先清理数据再添加唯一约束';
        ELSE
            CREATE UNIQUE INDEX idx_volunteers_login_id_unique 
            ON lottery_volunteers(login_id) 
            WHERE login_id IS NOT NULL AND login_id != '';
            RAISE NOTICE '已添加 login_id 唯一约束';
        END IF;
    END IF;
END $$;

-- ============================================
-- 4. 添加常用索引（如果不存在）
-- ============================================

-- role 索引
CREATE INDEX IF NOT EXISTS idx_volunteers_role ON lottery_volunteers(role);

-- status 索引  
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON lottery_volunteers(status);

-- academy_id 索引
CREATE INDEX IF NOT EXISTS idx_volunteers_academy_id ON lottery_volunteers(academy_id);

-- 组合索引（学院+角色）
CREATE INDEX IF NOT EXISTS idx_volunteers_academy_role 
ON lottery_volunteers(academy_id, role) 
WHERE academy_id IS NOT NULL;
