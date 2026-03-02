# Feature Specification: [Supabase Storage Migration]

**Feature Branch**: `[001-supabase-storage]`  
**Created**: [2026-03-02]  
**Status**: Draft  
**Input**: User description: "[将前端本地存储迁移至 Supabase，实现数据持久化与实时同步，零破坏现有前端代码]"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [管理员配置考场数据持久化] (Priority: [P1])

[管理员在管理端创建考场、分组、导入考生名单后，刷新页面或重新登录，之前配置的数据不会丢失，且其他管理员能实时看到更新]

**Why this priority**: [基础功能 - 如果数据不能持久化，系统无法在实际复试场景使用。当前 LocalStorage 方案刷新即丢失，必须优先解决]

**Independent Test**: [管理员创建考场 → 刷新页面 → 验证考场列表仍存在 → 验证数据库中有对应记录]

**Acceptance Scenarios**:

1. **Given** [管理员已登录并创建考场"第一考场"]，**When** [刷新页面]，**Then** ["第一考场"仍显示在列表中且数据来自 Supabase]
2. **Given** [管理员A创建了考场]，**When** [管理员B登录查看]，**Then** [管理员B能看到管理员A创建的考场]
3. **Given** [网络断开恢复后]，**When** [管理员继续操作]，**Then** [之前未同步的数据自动恢复同步]

---

### User Story 2 - [志愿者执行抽签并实时同步] (Priority: [P1])

[志愿者在考场点击"抽签"按钮后，考生获得随机号码，该结果立即显示在大屏幕上，且其他志愿者无法重复抽取该考生]

**Why this priority**: [核心功能 - 抽签必须实时同步到展示屏，且避免重复抽签。需要 Supabase Realtime 和事务保证]

**Independent Test**: [志愿者点击抽签 → 大屏幕自动更新显示结果 → 数据库记录抽签时间和操作人]

**Acceptance Scenarios**:

1. **Given** [考生张三未抽签]，**When** [志愿者点击抽签]，**Then** [大屏幕实时显示"张三 - 号码12"且数据库状态更新为已抽签]
2. **Given** [志愿者A已为张三抽签]，**When** [志愿者B尝试为张三再次抽签]，**Then** [系统提示"该考生已抽签"并拒绝操作]
3. **Given** [多设备同时查看]，**When** [抽签发生]，**Then** [所有设备在1秒内同步显示新结果]

---

### User Story 3 - [系统支持数据导出与备份] (Priority: [P2])

[复试结束后，管理员能导出本次抽签的完整数据（Excel/PDF），且历史批次数据可查询]

**Why this priority**: [业务需求 - 学校需要存档复试记录。依赖 Supabase 的持久化能力，但可在 Phase 2 实现导出功能]

**Independent Test**: [管理员点击导出 → 下载包含所有考生抽签结果的 Excel 文件]

**Acceptance Scenarios**:

1. **Given** [批次已结束]，**When** [管理员点击导出]，**Then** [下载文件包含考生姓名、准考证号、抽签号码、抽签时间]
2. **Given** [存在多个历史批次]，**When** [管理员查询去年数据]，**Then** [能查看去年的抽签记录]

---
### User Story 4 - [系统故障恢复与数据一致性] (Priority: [P3])

[在抽签过程中，如果志愿者设备断网或刷新页面，系统能恢复当前状态，不丢失已抽签结果]

**Why this priority**: [可靠性 - 复试现场不能容忍数据丢失。Supabase 的实时订阅和本地状态管理配合实现]

**Independent Test**: [抽签进行到一半 → 强制刷新页面 → 验证已抽签结果不变且可继续抽签]

**Acceptance Scenarios**:

1. **Given** [已抽取10个考生]，**When** [志愿者刷新页面]，**Then** [页面恢复显示当前进度，已抽签的10人状态正确]
2. **Given** [网络中断5秒]，**When** [网络恢复]，**Then** [系统自动重连并同步期间错过的更新]

---

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [两个志愿者同时点击同一个考生的抽签按钮]? [Supabase 事务保证只有一个成功，另一个返回冲突错误]
- How does system handle [Supabase 连接失败]? [显示离线提示，启用本地缓存，恢复后自动同步]
- What happens when [考生数据导入中途出错]? [事务回滚，已导入数据不保留，返回错误提示]
- How does system handle [并发超过50人同时抽签]? [Supabase 连接池管理，队列处理避免竞争]

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: [System MUST 将考场、考生、分组、志愿者数据持久化到 Supabase PostgreSQL 数据库，替换现有内存/LocalStorage 存储]
- **FR-002**: [System MUST 保持 frontend/src/storage/ 目录下所有函数的输入参数和返回值类型完全不变，确保 frontend/src/app/ 组件无需修改]
- **FR-003**: [System MUST 自动处理数据字段命名转换 - 前端 camelCase (groupId) 与数据库 snake_case (group_id) 双向映射]
- **FR-004**: [System MUST 实现抽签结果的实时广播，使用 Supabase Realtime 订阅机制，延迟 <100ms]
- **FR-005**: [System MUST 实现基础错误处理 - 网络错误时返回 Promise rejection，保持与本地存储相同的错误格式]
- **FR-006**: [System MUST 支持离线检测 - 当 Supabase 连接断开时，显示状态提示，恢复后自动重连]

### Key Entities *(include if feature involves data)*

- **[ExamRoom]**: [考场实体，包含 id, name, capacity, group_id(外键), created_at。与 Group 多对一关系]
- **[Candidate]**: [考生实体，包含 id, name, candidate_no(准考证号), group_id(外键), draw_number(抽签号), status(状态), drawn_at(抽签时间)。与 Group 多对一]
- **[Volunteer]**: [志愿者实体，包含 id, account(账号), password(密码), name(姓名), assigned_rooms(分配考场ID数组)]
- **[Group]**: [分组/场次实体，包含 id, name, batch_id(批次外键), candidate_count(考生数)]
- **[Batch]**: [批次实体，包含 id, name, year(年份), status(状态：未开始/进行中/已结束)]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [页面加载时，从 Supabase 获取考场列表数据耗时 <300ms（光纤网络环境下）]
- **SC-002**: [抽签操作从点击到数据库更新并广播到所有客户端，端到端延迟 <100ms]
- **SC-003**: [frontend/src/app/ 目录下的组件代码零修改 - 通过代码 diff 验证无变更]
- **SC-004**: [storage/ 层所有函数的单元测试通过率 100%，且测试用例无需修改（仅修改 mock 实现）]
- **SC-005**: [系统能稳定支持 1000 人规模复试，并发抽签操作 50次/秒无性能下降]
- **SC-006**: [网络中断后 30 秒内恢复，数据自动同步，无丢失或重复]
