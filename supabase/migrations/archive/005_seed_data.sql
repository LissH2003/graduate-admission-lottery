-- Migration: 005_seed_data
-- Description: 插入初始种子数据（适配统一用户表，明文密码）
-- Created: 2026-03-05
-- Updated: 2026-03-10 (移除 bcrypt 加密，使用明文密码，适配统一表结构)

-- ============================================
-- 插入学院数据
-- ============================================
INSERT INTO lottery_academies (id, name) VALUES 
    ('mech', '机械工程学院'),
    ('cs', '计算机学院'),
    ('ee', '电气工程学院'),
    ('civil', '土木工程学院'),
    ('material', '材料科学与工程学院')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 插入管理员账号（统一用户表 lottery_volunteers，明文密码）
-- ============================================
INSERT INTO lottery_volunteers (
    id, 
    login_id,
    username, 
    name, 
    phone, 
    email, 
    password_hash, 
    role,
    status, 
    academy_id
) VALUES 
    (
        gen_random_uuid(),
        NULL,  -- 本地账号无SSO学工号
        'admin',
        '系统管理员',
        '13800000000',
        'admin@ustb.edu.cn',
        'admin123',  -- 明文密码
        'admin',
        'active',
        'mech'
    ),
    (
        gen_random_uuid(),
        NULL,
        'mech_admin',
        '机械学院管理员',
        '13800000001',
        'mech@ustb.edu.cn',
        'mech123',
        'admin',
        'active',
        'mech'
    ),
    (
        gen_random_uuid(),
        NULL,
        'cs_admin',
        '计算机学院管理员',
        '13800000002',
        'cs@ustb.edu.cn',
        'cs123',
        'admin',
        'active',
        'cs'
    )
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 插入志愿者账号（统一用户表 lottery_volunteers，明文密码）
-- ============================================
INSERT INTO lottery_volunteers (
    id, 
    login_id,
    username, 
    name, 
    phone, 
    email, 
    password_hash, 
    role,
    status, 
    academy_id
) VALUES 
    (
        gen_random_uuid(),
        '2024001001',  -- SSO学工号示例
        'volunteer1',
        '张三',
        '13900000001',
        'zhangsan@ustb.edu.cn',
        'volunteer123',
        'volunteer',
        'active',
        'mech'
    ),
    (
        gen_random_uuid(),
        '2024001002',
        'volunteer2',
        '李四',
        '13900000002',
        'lisi@ustb.edu.cn',
        'volunteer456',
        'volunteer',
        'active',
        'cs'
    )
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 插入考场数据
-- ============================================
INSERT INTO lottery_exam_rooms (id, name, location, building, floor, capacity, facilities, status, academy_id, description) VALUES 
    (gen_random_uuid(), '机电楼301', '机电楼3层', '机电楼', '3F', 30, '["投影仪", "白板", "麦克风"]', 'active', 'mech', '标准多媒体教室'),
    (gen_random_uuid(), '机电楼302', '机电楼3层', '机电楼', '3F', 25, '["投影仪", "白板"]', 'active', 'mech', '小型讨论室'),
    (gen_random_uuid(), '信电楼201', '信电楼2层', '信电楼', '2F', 40, '["投影仪", "白板", "音响"]', 'active', 'cs', '大型阶梯教室'),
    (gen_random_uuid(), '信电楼202', '信电楼2层', '信电楼', '2F', 30, '["投影仪", "白板"]', 'active', 'cs', '标准教室')
ON CONFLICT DO NOTHING;

-- ============================================
-- 插入批次数据
-- ============================================
INSERT INTO lottery_batches (id, name, year, semester, academy, academy_id, start_date, end_date, status) VALUES 
    (gen_random_uuid(), '2026年春季机械工程学院复试', '2026', '春季', '机械工程学院', 'mech', '2026-03-15', '2026-03-20', 'active'),
    (gen_random_uuid(), '2026年春季计算机学院复试', '2026', '春季', '计算机学院', 'cs', '2026-03-18', '2026-03-25', 'draft')
ON CONFLICT DO NOTHING;

-- ============================================
-- 创建触发器函数：自动更新批次统计
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_batch_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_batch_id UUID;
BEGIN
    -- 根据操作类型获取 batch_id
    IF TG_OP = 'DELETE' THEN
        SELECT batch_id INTO v_batch_id FROM lottery_groups WHERE id = OLD.group_id;
    ELSE
        SELECT batch_id INTO v_batch_id FROM lottery_groups WHERE id = NEW.group_id;
    END IF;
    
    -- 更新批次统计
    IF v_batch_id IS NOT NULL THEN
        PERFORM public.update_batch_statistics(v_batch_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 在 candidates 表上创建触发器
DROP TRIGGER IF EXISTS trigger_candidates_change ON lottery_candidates;
CREATE TRIGGER trigger_candidates_change
    AFTER INSERT OR UPDATE OR DELETE ON lottery_candidates
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_batch_stats();

-- ============================================
-- 触发器：当分组数量变化时更新批次统计
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_batch_group_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.update_batch_statistics(NEW.batch_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.update_batch_statistics(OLD.batch_id);
        RETURN OLD;
    ELSE
        IF NEW.batch_id != OLD.batch_id THEN
            PERFORM public.update_batch_statistics(OLD.batch_id);
            PERFORM public.update_batch_statistics(NEW.batch_id);
        ELSE
            PERFORM public.update_batch_statistics(NEW.batch_id);
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_groups_change ON lottery_groups;
CREATE TRIGGER trigger_groups_change
    AFTER INSERT OR UPDATE OR DELETE ON lottery_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_batch_group_count();

-- ============================================
-- 触发器：自动更新分组的 candidate_count
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_group_candidate_count()
RETURNS TRIGGER AS $$
DECLARE
    v_group_id UUID;
    v_count INTEGER;
BEGIN
    -- 确定受影响的 group_id
    IF TG_OP = 'DELETE' THEN
        v_group_id := OLD.group_id;
    ELSE
        v_group_id := NEW.group_id;
    END IF;
    
    -- 计算该分组的考生数量
    SELECT COUNT(*) INTO v_count
    FROM lottery_candidates
    WHERE group_id = v_group_id;
    
    -- 更新分组的 candidate_count
    UPDATE lottery_groups
    SET candidate_count = v_count
    WHERE id = v_group_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_candidates_count_change ON lottery_candidates;
CREATE TRIGGER trigger_candidates_count_change
    AFTER INSERT OR UPDATE OR DELETE ON lottery_candidates
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_group_candidate_count();
