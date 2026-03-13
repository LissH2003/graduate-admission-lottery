-- Migration: 004_enable_rls
-- Description: 启用行级安全(RLS)并创建访问策略
-- Created: 2026-03-05
-- Updated: 2026-03-10 (移除 lottery_admins 相关策略，适配统一用户表)

-- ============================================
-- 启用所有表的 RLS
-- ============================================
ALTER TABLE lottery_academies ENABLE ROW LEVEL SECURITY;
-- lottery_admins 表已废弃，不再启用RLS
ALTER TABLE lottery_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_volunteer_exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_group_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- lottery_academies 表策略
-- ============================================
CREATE POLICY "允许读取学院" ON lottery_academies
    FOR SELECT USING (true);

CREATE POLICY "仅管理员可修改学院" ON lottery_academies
    FOR ALL USING (auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active'));

-- ============================================
-- lottery_admins 表策略（已废弃，表不再使用）
-- ============================================
-- 所有 lottery_admins 相关策略已移除

-- ============================================
-- lottery_batches 表策略
-- ============================================
CREATE POLICY "允许读取批次" ON lottery_batches FOR SELECT USING (true);
CREATE POLICY "仅管理员可修改批次" ON lottery_batches
    FOR ALL USING (auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active'));

-- ============================================
-- lottery_groups 表策略
-- ============================================
CREATE POLICY "允许读取分组" ON lottery_groups FOR SELECT USING (true);
CREATE POLICY "仅管理员可修改分组" ON lottery_groups
    FOR ALL USING (auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active'));

-- ============================================
-- lottery_candidates 表策略
-- ============================================
CREATE POLICY "允许读取考生" ON lottery_candidates FOR SELECT USING (true);
CREATE POLICY "仅管理员可修改考生" ON lottery_candidates
    FOR ALL USING (auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active'));

-- ============================================
-- lottery_exam_rooms 表策略
-- ============================================
CREATE POLICY "允许读取考场" ON lottery_exam_rooms FOR SELECT USING (true);
CREATE POLICY "仅管理员可修改考场" ON lottery_exam_rooms
    FOR ALL USING (auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active'));

-- ============================================
-- lottery_volunteers 表策略（统一用户表）
-- ============================================
-- 允许用户查看自己的信息，管理员可以查看所有
CREATE POLICY "允许读取用户信息" ON lottery_volunteers
    FOR SELECT USING (
        auth.uid() = id 
        OR auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active')
    );

CREATE POLICY "仅管理员可修改用户" ON lottery_volunteers
    FOR ALL USING (auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active'));

-- ============================================
-- 关联表策略
-- ============================================
CREATE POLICY "允许读取志愿者考场关联" ON lottery_volunteer_exam_rooms FOR SELECT USING (true);
CREATE POLICY "仅管理员可修改志愿者考场关联" ON lottery_volunteer_exam_rooms
    FOR ALL USING (auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active'));

CREATE POLICY "允许读取分组志愿者关联" ON lottery_group_volunteers FOR SELECT USING (true);
CREATE POLICY "仅管理员可修改分组志愿者关联" ON lottery_group_volunteers
    FOR ALL USING (auth.uid() IN (SELECT id FROM lottery_volunteers WHERE role = 'admin' AND status = 'active'));

-- ============================================
-- lottery_users 表策略（SSO用户映射表）
-- ============================================
CREATE POLICY "允许认证用户读取SSO用户" ON lottery_users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "仅服务角色可修改SSO用户" ON lottery_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);
