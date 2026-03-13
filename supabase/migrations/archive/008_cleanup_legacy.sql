-- Migration: 008_cleanup_legacy
-- Description: 清理废弃的数据库对象（lottery_admins 表、废弃函数、触发器等）
-- WARNING: 执行前请确保 lottery_admins 表数据已迁移到 lottery_volunteers
-- Created: 2026-03-10

-- ============================================
-- 1. 删除废弃的函数
-- ============================================

-- 删除旧的登录验证函数（已被 verify_user 替代）
DROP FUNCTION IF EXISTS public.verify_lottery_admin(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_lottery_volunteer(TEXT, TEXT);

-- 删除旧的账号创建函数（前端直插替代）
DROP FUNCTION IF EXISTS public.create_volunteer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 删除旧的密码修改函数（如需保留功能请重新创建明文版本）
DROP FUNCTION IF EXISTS public.change_admin_password(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.reset_volunteer_password(UUID, TEXT, TEXT);

-- ============================================
-- 2. 删除废弃的触发器和触发器函数
-- ============================================

-- 删除密码自动加密触发器（现在使用明文存储）
DROP TRIGGER IF EXISTS trigger_encrypt_admin_password ON lottery_admins;
DROP TRIGGER IF EXISTS trigger_encrypt_volunteer_password ON lottery_volunteers;
DROP FUNCTION IF EXISTS public.trigger_encrypt_password();

-- ============================================
-- 3. 删除废弃的表（数据迁移完成后执行）
-- ============================================

-- 警告：执行前请确保数据已迁移
-- 迁移检查：SELECT COUNT(*) FROM lottery_admins;
-- 如果为 0 则可以安全删除，否则请先迁移数据

-- 先删除 lottery_admins 表的外键依赖（如果有）
-- 目前 lottery_admins 没有被其他表引用的外键

-- 删除 lottery_admins 表
DROP TABLE IF EXISTS lottery_admins CASCADE;

-- ============================================
-- 4. 删除废弃的索引
-- ============================================

-- lottery_admins 相关的索引（表已删除，索引自动删除）
-- 如果 lottery_admins 表还存在，手动删除其索引：
-- DROP INDEX IF EXISTS idx_admins_username;
-- DROP INDEX IF EXISTS idx_admins_role;
-- DROP INDEX IF EXISTS idx_admins_is_active;

-- ============================================
-- 5. 删除废弃的 RLS 策略
-- ============================================

-- lottery_admins 表的策略（表已删除，策略自动删除）
-- 如果策略仍然存在，手动删除：
-- DROP POLICY IF EXISTS "管理员自读" ON lottery_admins;
-- DROP POLICY IF EXISTS "超级管理员可管理" ON lottery_admins;

-- ============================================
-- 6. 更新 lottery_volunteers 表注释
-- ============================================

COMMENT ON TABLE lottery_volunteers IS '统一用户表（管理员和志愿者合并）';
COMMENT ON COLUMN lottery_volunteers.login_id IS 'SSO学工号，用于统一身份认证匹配';
COMMENT ON COLUMN lottery_volunteers.username IS '系统登录账号，唯一';
COMMENT ON COLUMN lottery_volunteers.password_hash IS '密码（明文存储，生产环境依赖HTTPS加密传输）';
COMMENT ON COLUMN lottery_volunteers.role IS '用户角色: admin-管理员, volunteer-志愿者';

-- ============================================
-- 7. 清理完成后的建议操作
-- ============================================

-- 验证清理结果：
-- 1. 确认 lottery_admins 表已删除：\dt lottery_admins
-- 2. 确认废弃函数已删除：\df verify_lottery_*
-- 3. 确认触发器已删除：\dy trigger_encrypt_*

-- 如果一切正常，可以提交事务
-- 如果发现问题，可以回滚：ROLLBACK;
