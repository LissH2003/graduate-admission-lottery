# 数据模型设计

本文档定义了研究生复试抽签系统的 Supabase 数据模型，包含5张核心表及其关系。

## 表结构概览

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   batches   │◄────┤   groups    │◄────┤  candidates │
│   (批次)     │     │   (分组)     │     │   (考生)     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ exam_rooms  │
                    │   (考场)     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  volunteers │
                    │   (志愿者)   │
                    └─────────────┘
```

## 1. batches 表（批次表）

存储考试批次信息，如"2024年春季机械工程学院复试"。

```sql
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                           -- 批次名称
  year TEXT NOT NULL,                           -- 年份，如 "2024"
  semester TEXT NOT NULL,                       -- 学期，如 "春季"、"秋季"
  academy TEXT NOT NULL,                        -- 学院名称
  start_date DATE NOT NULL,                     -- 开始日期
  end_date DATE NOT NULL,                       -- 结束日期
  status TEXT NOT NULL DEFAULT 'draft',         -- 状态: draft | active | completed
  created_at TIMESTAMPTZ DEFAULT now(),
  total_groups INTEGER DEFAULT 0,               -- 分组总数（冗余统计）
  total_candidates INTEGER DEFAULT 0            -- 考生总数（冗余统计）
);

-- 注释
COMMENT ON TABLE batches IS '考试批次表';
COMMENT ON COLUMN batches.status IS '批次状态: draft-草稿, active-进行中, completed-已完成';
```

**对应 TypeScript 接口**（Batch from batchStorage.ts）:
```typescript
interface Batch {
  id: string;
  name: string;
  year: string;
  semester: string;
  academy: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  totalGroups: number;
  totalCandidates: number;
}
```

## 2. groups 表（分组表）

存储考试分组信息，一个批次下可有多个分组。

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,                     -- 批次名称（冗余，方便显示）
  name TEXT NOT NULL,                           -- 分组名称
  description TEXT DEFAULT '',                  -- 分组描述
  candidate_count INTEGER DEFAULT 0,            -- 考生数量
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- 考场和时间配置
  exam_room_id UUID REFERENCES exam_rooms(id),  -- 关联考场
  exam_room_name TEXT,                          -- 考场名称（冗余）
  date DATE NOT NULL,                           -- 面试日期 YYYY-MM-DD
  start_time TIME NOT NULL,                     -- 开始时间 HH:mm
  end_time TIME NOT NULL                        -- 结束时间 HH:mm
);

-- 索引
CREATE INDEX idx_groups_batch_id ON groups(batch_id);
CREATE INDEX idx_groups_exam_room_id ON groups(exam_room_id);

-- 注释
COMMENT ON TABLE groups IS '考试分组表';
```

**对应 TypeScript 接口**（Group from groupStorage.ts）:
```typescript
interface Group {
  id: string;
  batchId: string;
  batchName: string;
  name: string;
  description: string;
  candidateCount: number;
  createdAt: string;
  examRoomId: string;
  examRoomName?: string;
  date: string;
  time: string;
  endTime: string;
  volunteerIds?: string[];
}
```

## 3. candidates 表（考生表）

存储考生信息，属于某个分组。

```sql
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- 姓名
  id_card TEXT NOT NULL,                        -- 身份证号
  registration_no TEXT,                         -- 准考证号
  candidate_no TEXT,                            -- 考生编号
  phone TEXT,                                   -- 联系电话
  status TEXT NOT NULL DEFAULT 'waiting',       -- 状态: waiting | drawn | absent
  drawn_number INTEGER,                         -- 抽签号码
  drawn_time TIMESTAMPTZ                        -- 抽签时间
);

-- 索引
CREATE INDEX idx_candidates_group_id ON candidates(group_id);
CREATE INDEX idx_candidates_status ON candidates(status);

-- 注释
COMMENT ON TABLE candidates IS '考生表';
COMMENT ON COLUMN candidates.status IS '考生状态: waiting-等待中, drawn-已抽签, absent-缺席';
```

**对应 TypeScript 接口**（Candidate from candidateStorage.ts）:
```typescript
interface Candidate {
  id: string;
  groupId: string;
  name: string;
  idCard: string;
  registrationNo?: string;
  candidateNo?: string;
  phone?: string;
  status: 'waiting' | 'drawn' | 'absent';
  drawnNumber?: number;
  drawnTime?: string;
}
```

## 4. exam_rooms 表（考场表）

存储考场信息，如教室、设备等。

```sql
CREATE TABLE exam_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                           -- 考场名称，如"机械楼301"
  location TEXT NOT NULL,                       -- 详细位置
  building TEXT NOT NULL,                       -- 楼栋
  floor TEXT NOT NULL,                          -- 楼层
  capacity INTEGER NOT NULL,                    -- 容量
  facilities JSONB DEFAULT '[]',                -- 设施列表，如 ["投影仪", "白板"]
  status TEXT NOT NULL DEFAULT 'active',        -- 状态: active | inactive
  created_at TIMESTAMPTZ DEFAULT now(),
  description TEXT                              -- 备注
);

-- 索引
CREATE INDEX idx_exam_rooms_building ON exam_rooms(building);
CREATE INDEX idx_exam_rooms_status ON exam_rooms(status);

-- 注释
COMMENT ON TABLE exam_rooms IS '考场表';
COMMENT ON COLUMN exam_rooms.facilities IS '设施列表，JSON数组格式';
```

**对应 TypeScript 接口**（ExamRoom from examRoomStorage.ts）:
```typescript
interface ExamRoom {
  id: string;
  name: string;
  location: string;
  building: string;
  floor: string;
  capacity: number;
  facilities: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  description?: string;
}
```

## 5. volunteers 表（志愿者表）

存储志愿者/管理员账号信息。

```sql
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,                -- 用户名
  name TEXT NOT NULL,                           -- 真实姓名
  phone TEXT NOT NULL,                          -- 联系电话
  password_hash TEXT,                           -- 密码哈希（Supabase Auth 可替代）
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'         -- 状态: active | inactive
);

-- 索引
CREATE INDEX idx_volunteers_username ON volunteers(username);

-- 注释
COMMENT ON TABLE volunteers IS '志愿者/管理员表';
```

**对应 TypeScript 接口**（Volunteer from volunteerStorage.ts）:
```typescript
interface Volunteer {
  id: string;
  username: string;
  name: string;
  phone: string;
  password?: string;
  examRoomIds: string[];
  createdAt: string;
  status: 'active' | 'inactive';
}
```

## 6. 关联表

### 6.1 volunteer_exam_rooms（志愿者-考场关联）

志愿者与考场的多对多关系。

```sql
CREATE TABLE volunteer_exam_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  exam_room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(volunteer_id, exam_room_id)
);

CREATE INDEX idx_ver_volunteer_id ON volunteer_exam_rooms(volunteer_id);
CREATE INDEX idx_ver_exam_room_id ON volunteer_exam_rooms(exam_room_id);

COMMENT ON TABLE volunteer_exam_rooms IS '志愿者与考场的分配关系';
```

### 6.2 group_volunteers（分组-志愿者关联）

分组与志愿者的多对多关系。

```sql
CREATE TABLE group_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, volunteer_id)
);

CREATE INDEX idx_gv_group_id ON group_volunteers(group_id);
CREATE INDEX idx_gv_volunteer_id ON group_volunteers(volunteer_id);

COMMENT ON TABLE group_volunteers IS '分组与志愿者的分配关系';
```

## 外键关系图

```
batches (id) ◄────── groups.batch_id
groups (id) ◄─────── candidates.group_id
groups (id) ◄─────── groups_exam_rooms.group_id
exam_rooms (id) ◄─── groups.exam_room_id
exam_rooms (id) ◄─── volunteer_exam_rooms.exam_room_id
volunteers (id) ◄─── volunteer_exam_rooms.volunteer_id
volunteers (id) ◄─── group_volunteers.volunteer_id
groups (id) ◄─────── group_volunteers.group_id
```

## RLS (Row Level Security) 策略建议

```sql
-- 启用 RLS
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- 示例：允许所有用户读取考场信息
CREATE POLICY "允许读取考场" ON exam_rooms
  FOR SELECT USING (true);

-- 示例：仅管理员可修改
CREATE POLICY "仅管理员可修改考场" ON exam_rooms
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM volunteers WHERE username = 'admin'
    )
  );
```
