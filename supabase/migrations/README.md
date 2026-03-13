# 数据库迁移说明

## 文件结构

```
supabase/migrations/
├── 000_init_database.sql    # 数据库初始化（唯一需要的文件）
├── README.md                # 本说明文件
└── archive/                 # 旧迁移文件备份
    ├── 001_create_tables.sql
    ├── 002_create_indexes.sql
    └── ...
```

## 使用方法

### 全新部署

如果是全新的 Supabase 项目，只需执行：

```bash
# 使用 Supabase CLI
supabase db reset

# 或手动在 SQL Editor 中执行
# 1. 打开 Supabase Dashboard
# 2. 进入 SQL Editor
# 3. 粘贴 000_init_database.sql 内容
# 4. 点击 Run
```

### 文件内容说明

`000_init_database.sql` 包含：

1. **表结构** (8个表)
   - lottery_academies - 学院表
   - lottery_volunteers - 统一用户表（管理员+志愿者）
   - lottery_batches - 批次表
   - lottery_exam_rooms - 考场表
   - lottery_groups - 分组表
   - lottery_candidates - 考生表
   - lottery_volunteer_exam_rooms - 志愿者-考场关联
   - lottery_group_volunteers - 分组-志愿者关联

2. **索引** (17个索引)
   - 主键索引（自动创建）
   - 唯一索引（username, login_id）
   - 查询优化索引（role, status, academy_id等）

3. **函数** (2个)
   - verify_user - 本地登录验证
   - find_user_by_student_id - SSO登录查询

4. **RLS策略**
   - 所有表启用行级安全
   - 认证用户可读取
   - 服务角色可修改

5. **初始数据**
   - 10个学院
   - 1个管理员账号（admin/admin123）
   - 2个志愿者账号（volunteer1/volunteer123）

## 已移除的内容

相比旧版本，以下废弃内容已移除：

- ❌ lottery_users 表（从未使用）
- ❌ update_user_login_time 函数（无用）
- ❌ 密码加密触发器（已改为明文存储）
- ❌ 重复定义的函数

## 账号信息

部署后可用以下账号登录：

| 账号 | 密码 | 角色 | 说明 |
|------|------|------|------|
| admin | admin123 | 管理员 | 超级管理员 |
| volunteer1 | volunteer123 | 志愿者 | 机械工程学院 |
| volunteer2 | volunteer123 | 志愿者 | 计算机学院 |

## 注意事项

1. **密码存储**：当前使用明文存储（依赖HTTPS传输安全）
2. **SSO配置**：如需使用统一身份认证，需额外配置 Edge Function
3. **角色类型**：统一为 'admin' 或 'volunteer'，无 'student'/'teacher'

## 验证部署

执行后检查：

```sql
-- 检查表数量（应为8个）
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'lottery_%';

-- 检查初始账号
SELECT username, name, role FROM lottery_volunteers;

-- 检查函数
SELECT proname FROM pg_proc WHERE proname IN ('verify_user', 'find_user_by_student_id');
```
