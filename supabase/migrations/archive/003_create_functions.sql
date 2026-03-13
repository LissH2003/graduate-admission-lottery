-- Migration: 003_create_functions
-- Description: 创建业务存储过程和函数（登录验证已移至 007_add_verify_user_rpc.sql）
-- Created: 2026-03-05
-- Updated: 2026-03-10 (移除废弃函数，保留业务函数)

-- ============================================
-- 1. 抽签业务函数
-- ============================================

-- 抽签函数：为考生分配抽签号码
CREATE OR REPLACE FUNCTION public.draw_lottery_number(
    p_candidate_id UUID,
    p_group_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT, drawn_number INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_number INTEGER;
    v_candidate RECORD;
BEGIN
    -- 检查考生是否存在
    SELECT * INTO v_candidate 
    FROM lottery_candidates 
    WHERE id = p_candidate_id AND group_id = p_group_id;
    
    IF v_candidate IS NULL THEN
        RETURN QUERY SELECT FALSE, '考生不存在'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;
    
    -- 检查考生状态
    IF v_candidate.status = 'drawn' THEN
        RETURN QUERY SELECT FALSE, '该考生已抽签'::TEXT, v_candidate.drawn_number;
        RETURN;
    END IF;
    
    IF v_candidate.status = 'absent' THEN
        RETURN QUERY SELECT FALSE, '该考生已标记为缺席'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;
    
    -- 获取该分组下最大的抽签号码
    SELECT COALESCE(MAX(drawn_number), 0) + 1 INTO v_next_number
    FROM lottery_candidates
    WHERE group_id = p_group_id AND status = 'drawn';
    
    -- 更新考生信息
    UPDATE lottery_candidates
    SET 
        drawn_number = v_next_number,
        drawn_time = now(),
        status = 'drawn'
    WHERE id = p_candidate_id;
    
    RETURN QUERY SELECT TRUE, '抽签成功'::TEXT, v_next_number;
END;
$$;

-- 获取下一个可用抽签号码（预览）
CREATE OR REPLACE FUNCTION public.get_next_lottery_number(p_group_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(drawn_number), 0) + 1 INTO v_next_number
    FROM lottery_candidates
    WHERE group_id = p_group_id AND status = 'drawn';
    
    RETURN v_next_number;
END;
$$;

-- 重置分组抽签
CREATE OR REPLACE FUNCTION public.reset_group_lottery(p_group_id UUID, p_admin_username TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, reset_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
    v_is_admin BOOLEAN;
BEGIN
    -- 检查是否为管理员（从统一用户表查询）
    SELECT EXISTS(
        SELECT 1 FROM lottery_volunteers 
        WHERE username = p_admin_username 
        AND status = 'active'
        AND role = 'admin'
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RETURN QUERY SELECT FALSE, '无权限执行此操作'::TEXT, 0;
        RETURN;
    END IF;
    
    -- 统计将要重置的考生数量
    SELECT COUNT(*) INTO v_count
    FROM lottery_candidates
    WHERE group_id = p_group_id AND status = 'drawn';
    
    -- 重置考生状态
    UPDATE lottery_candidates
    SET 
        drawn_number = NULL,
        drawn_time = NULL,
        status = 'waiting'
    WHERE group_id = p_group_id;
    
    RETURN QUERY SELECT TRUE, '重置成功'::TEXT, v_count;
END;
$$;

-- 标记考生缺席
CREATE OR REPLACE FUNCTION public.mark_candidate_absent(p_candidate_id UUID, p_admin_username TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- 检查是否为管理员（从统一用户表查询）
    SELECT EXISTS(
        SELECT 1 FROM lottery_volunteers 
        WHERE username = p_admin_username 
        AND status = 'active'
        AND role = 'admin'
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RETURN QUERY SELECT FALSE, '无权限执行此操作'::TEXT;
        RETURN;
    END IF;
    
    -- 更新考生状态为缺席
    UPDATE lottery_candidates
    SET status = 'absent'
    WHERE id = p_candidate_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, '考生不存在'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT TRUE, '已标记为缺席'::TEXT;
END;
$$;

-- 更新批次统计信息
CREATE OR REPLACE FUNCTION public.update_batch_statistics(p_batch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE lottery_batches
    SET 
        total_groups = (SELECT COUNT(*) FROM lottery_groups WHERE batch_id = p_batch_id),
        total_candidates = (
            SELECT COUNT(*) FROM lottery_candidates 
            WHERE group_id IN (
                SELECT id FROM lottery_groups WHERE batch_id = p_batch_id
            )
        )
    WHERE id = p_batch_id;
END;
$$;

-- 获取分组抽签统计
CREATE OR REPLACE FUNCTION public.get_group_lottery_stats(p_group_id UUID)
RETURNS TABLE (
    total_candidates INTEGER, 
    drawn_count INTEGER, 
    absent_count INTEGER, 
    waiting_count INTEGER, 
    completed_count INTEGER, 
    completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
    v_drawn INTEGER;
    v_absent INTEGER;
    v_waiting INTEGER;
    v_completed INTEGER;
    v_rate NUMERIC;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'drawn'),
        COUNT(*) FILTER (WHERE status = 'absent'),
        COUNT(*) FILTER (WHERE status = 'waiting'),
        COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total, v_drawn, v_absent, v_waiting, v_completed
    FROM lottery_candidates
    WHERE group_id = p_group_id;
    
    -- 计算完成率
    IF v_total > 0 THEN
        v_rate := ROUND(((v_drawn + v_absent + v_completed)::NUMERIC / v_total) * 100, 2);
    ELSE
        v_rate := 0;
    END IF;
    
    RETURN QUERY SELECT v_total, v_drawn, v_absent, v_waiting, v_completed, v_rate;
END;
$$;

-- ============================================
-- 2. SSO用户相关函数
-- ============================================

-- 根据学工号查找用户（忽略大小写）
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

-- 更新用户最后登录时间
CREATE OR REPLACE FUNCTION update_user_login_time(p_student_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE lottery_users
    SET last_login_at = now()
    WHERE LOWER(student_id) = LOWER(p_student_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_login_time(TEXT) IS '更新用户最后登录时间';

-- ============================================
-- 3. 注释说明
-- ============================================

COMMENT ON FUNCTION public.draw_lottery_number IS '为考生分配抽签号码';
COMMENT ON FUNCTION public.get_next_lottery_number IS '获取下一个可用抽签号码';
COMMENT ON FUNCTION public.reset_group_lottery IS '重置分组抽签（需要管理员权限）';
COMMENT ON FUNCTION public.mark_candidate_absent IS '标记考生缺席（需要管理员权限）';
COMMENT ON FUNCTION public.update_batch_statistics IS '更新批次统计信息';
COMMENT ON FUNCTION public.get_group_lottery_stats IS '获取分组抽签统计';

-- 注意：登录验证函数 verify_user 已移至 007_add_verify_user_rpc.sql
-- 注意：废弃的 verify_lottery_admin 和 verify_lottery_volunteer 函数将在 008_cleanup_legacy.sql 中删除
