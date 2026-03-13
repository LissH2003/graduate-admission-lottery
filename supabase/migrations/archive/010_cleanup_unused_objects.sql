-- Migration: 010_cleanup_unused_objects
-- Description: 清理废弃的数据库对象（lottery_users 表及相关函数）
-- Created: 2026-03-11
-- WARNING: 执行前请确认 lottery_users 表无重要数据

-- ============================================
-- 1. 删除废弃的 lottery_users 表
-- ============================================
-- 说明：此表已不再使用，SSO 直接查询 lottery_volunteers 表
-- 验证SQL：SELECT COUNT(*) FROM lottery_users;  -- 应为0

DROP TABLE IF EXISTS lottery_users CASCADE;

-- ============================================
-- 2. 删除废弃的函数
-- ============================================
-- update_user_login_time 函数更新的是 lottery_users 表
-- 现在 lottery_volunteers 表没有 last_login_at 字段，该函数已无用

DROP FUNCTION IF EXISTS update_user_login_time(TEXT);

-- ============================================
-- 3. 删除废弃的触发器和触发器函数
-- ============================================
-- 这些触发器关联到 lottery_users 表

DROP TRIGGER IF EXISTS trg_update_user_last_login ON lottery_users;
DROP FUNCTION IF EXISTS update_user_last_login();

-- ============================================
-- 4. 删除 lottery_users 相关的 RLS 策略（如果存在）
-- ============================================
-- 表已删除，策略自动删除，这里做保险处理

-- 无需显式删除，CASCADE 已处理

-- ============================================
-- 5. 清理完成验证
-- ============================================

-- 验证SQL（执行后检查）：
-- 1. SELECT COUNT(*) FROM lottery_users;  -- 应报错：表不存在
-- 2. \dt lottery_users;  -- 应无结果
-- 3. \df update_user_login_time;  -- 应无结果

-- 刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 完成
