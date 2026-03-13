-- Migration: 002_create_indexes
-- Description: 创建所有索引以优化查询性能
-- Created: 2026-03-05

-- ============================================
-- lottery_academies 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_academies_name ON lottery_academies(name);

-- ============================================
-- lottery_admins 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_admins_username ON lottery_admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_role ON lottery_admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON lottery_admins(is_active);

-- ============================================
-- lottery_batches 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_batches_status ON lottery_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_academy_id ON lottery_batches(academy_id);
CREATE INDEX IF NOT EXISTS idx_batches_year_semester ON lottery_batches(year, semester);

-- ============================================
-- lottery_groups 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_groups_batch_id ON lottery_groups(batch_id);
CREATE INDEX IF NOT EXISTS idx_groups_exam_room_id ON lottery_groups(exam_room_id);
CREATE INDEX IF NOT EXISTS idx_groups_date ON lottery_groups(date);
CREATE INDEX IF NOT EXISTS idx_groups_academy_id ON lottery_groups(academy_id);

-- ============================================
-- lottery_candidates 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_candidates_group_id ON lottery_candidates(group_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON lottery_candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_drawn_number ON lottery_candidates(drawn_number);
CREATE INDEX IF NOT EXISTS idx_candidates_id_card ON lottery_candidates(id_card);

-- ============================================
-- lottery_exam_rooms 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_exam_rooms_building ON lottery_exam_rooms(building);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_status ON lottery_exam_rooms(status);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_academy_id ON lottery_exam_rooms(academy_id);

-- ============================================
-- lottery_volunteers 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_volunteers_username ON lottery_volunteers(username);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON lottery_volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_academy_id ON lottery_volunteers(academy_id);

-- ============================================
-- 关联表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ver_volunteer_id ON lottery_volunteer_exam_rooms(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_ver_exam_room_id ON lottery_volunteer_exam_rooms(exam_room_id);

CREATE INDEX IF NOT EXISTS idx_gv_group_id ON lottery_group_volunteers(group_id);
CREATE INDEX IF NOT EXISTS idx_gv_volunteer_id ON lottery_group_volunteers(volunteer_id);
