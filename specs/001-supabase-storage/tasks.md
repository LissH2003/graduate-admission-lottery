---

description: "Task list for Supabase Storage Migration - 研究生复试抽签系统"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/001-supabase-storage/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Unit tests for storage layer (optional but recommended)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/tests/`
- All paths relative to repository root `北科大研究生复试抽签系统/`

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 安装依赖、配置环境

- [ ] T001 [P] 安装 Supabase 客户端依赖: `cd frontend && npm install @supabase/supabase-js`
- [ ] T002 创建 Supabase 项目并在 Dashboard 中创建数据库表 (exam_rooms, candidates, groups, volunteers, batches)
- [ ] T003 [P] 创建 specs/001-supabase-storage/ 文档目录结构

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Supabase 核心基础设施，必须在任何存储改造前完成

**⚠️ CRITICAL**: 所有 User Story 都依赖此阶段完成

- [ ] T004 [P] 创建 `frontend/src/lib/supabase.ts` - Supabase 客户端配置（包含 URL 和 Anon Key 环境变量读取）
- [ ] T005 [P] 创建 `frontend/src/lib/database.types.ts` - 基于 Supabase 表结构生成 TypeScript 类型（使用 supabase-cli 生成或手动定义）
- [ ] T006 创建 `frontend/.env.local` - 添加 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY（不提交到 git）
- [ ] T007 创建 `frontend/src/storage/index.ts` - 统一导出所有 storage 函数，重新导出 AppContext 类型避免循环依赖
- [ ] T008 [P] 创建数据转换工具函数 `frontend/src/lib/transforms.ts` - snake_case 与 camelCase 互转（用于适配 Supabase 字段命名）

**Checkpoint**: Supabase 客户端可连接，类型定义完整，环境变量配置正确

---

## Phase 3: User Story 1 - [管理员配置考场数据持久化] (Priority: P1) 🎯 MVP

**Goal**: 实现考场、考生、分组、批次数据的持久化存储，支持多管理员实时查看

**Independent Test**: 管理员创建考场 → 刷新页面 → 数据仍存在 → 另一台电脑登录能看到相同数据

### Implementation for User Story 1

- [ ] T009 [P] [US1] 改造 `frontend/src/storage/examRoomStorage.ts` - 实现 getExamRooms(), getExamRoomById(), createExamRoom(), updateExamRoom(), deleteExamRoom() 使用 Supabase 客户端
- [ ] T010 [P] [US1] 改造 `frontend/src/storage/groupStorage.ts` - 实现 getGroups(), getGroupById(), createGroup(), updateGroup(), deleteGroup() 使用 Supabase
- [ ] T011 [P] [US1] 改造 `frontend/src/storage/batchStorage.ts` - 实现 getBatches(), createBatch(), updateBatch(), deleteBatch() 使用 Supabase
- [ ] T012 [US1] 改造 `frontend/src/storage/candidateStorage.ts` - 实现基础 CRUD: getCandidates(), getCandidatesByGroup(), createCandidate(), updateCandidate(), deleteCandidate()（不含抽签逻辑）
- [ ] T013 [US1] 改造 `frontend/src/storage/volunteerStorage.ts` - 实现 validateVolunteer(), getVolunteers(), createVolunteer()（不含实时同步）
- [ ] T014 [US1] 验证所有 storage 函数返回的数据格式与改造前完全一致（camelCase 字段名）

**Checkpoint**: US1 完成 - 管理员可以配置数据，刷新不丢失，多设备可见

---

## Phase 4: User Story 2 - [志愿者执行抽签并实时同步] (Priority: P1)

**Goal**: 实现抽签逻辑和实时同步到大屏幕，防止重复抽签

**Independent Test**: 志愿者点击抽签 → 大屏幕自动更新 → 数据库记录抽签结果 → 其他志愿者看到已抽签状态

### Implementation for User Story 2

- [ ] T015 [US2] 改造 `frontend/src/storage/candidateStorage.ts` - 实现 updateCandidateDrawResult() 方法，使用 Supabase 事务确保原子性更新（防止并发重复抽签）
- [ ] T016 [US2] 改造 `frontend/src/storage/candidateStorage.ts` - 实现 resetDraw() 方法，批量重置考生抽签状态
- [ ] T017 [US2] 在 `frontend/src/app/context/AppContext.tsx` 中添加 Supabase Realtime 订阅 - 监听 candidates 表 UPDATE 事件，实时更新本地状态
- [ ] T018 [P] [US2] 创建 `frontend/src/lib/realtime.ts` - 封装 Realtime 频道管理（订阅、重连、错误处理）
- [ ] T019 [US2] 在抽签页面添加乐观更新 - 点击后立即更新 UI，失败后回滚并提示

**Checkpoint**: US2 完成 - 抽签实时同步，无重复抽签，大屏幕自动更新

---

## Phase 5: User Story 3 - [系统支持数据导出与备份] (Priority: P2)

**Goal**: 支持导出抽签结果 Excel/PDF，查询历史批次

**Independent Test**: 点击导出按钮 → 下载包含所有考生抽签结果的 Excel 文件

### Implementation for User Story 3

- [ ] T020 [P] [US3] 在 `frontend/src/storage/` 中添加导出函数 exportLotteryResults(batchId, format) - 使用 xlsx 库生成 Excel（已有依赖）
- [ ] T021 [US3] 改造 `frontend/src/storage/batchStorage.ts` - 添加 getBatchStatistics() 获取批次统计信息（总人数、已抽签人数等）
- [ ] T022 [US3] 在 AdminHomePage 或导出页面集成导出功能（不修改页面逻辑，仅添加 storage 层支持）

**Checkpoint**: US3 完成 - 可以导出复试数据存档

---

## Phase 6: User Story 4 - [系统故障恢复与数据一致性] (Priority: P3)

**Goal**: 网络断开恢复后自动同步，页面刷新后状态恢复

**Independent Test**: 抽签到一半 → 断网5秒 → 恢复网络 → 数据自动同步无丢失

### Implementation for User Story 4

- [ ] T023 [US4] 在 `frontend/src/lib/supabase.ts` 中添加连接状态监听 - 检测在线/离线状态
- [ ] T024 [US4] 创建 `frontend/src/lib/offline.ts` - 实现简单离线缓存策略（可选：使用 localStorage 作为临时缓存）
- [ ] T025 [US4] 在 AppContext 中添加网络状态提示组件 - 断网时显示"离线模式"提示
- [ ] T026 [US4] 实现页面加载时的数据恢复 - 从 Supabase 重新加载当前批次状态，恢复抽签进度

**Checkpoint**: US4 完成 - 系统具备故障恢复能力

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 代码优化、文档、测试

- [ ] T027 [P] 更新 `frontend/README.md` - 添加 Supabase 环境变量配置说明
- [ ] T028 [P] 创建 `frontend/src/storage/README.md` - 说明 storage 层接口契约（供后续维护）
- [ ] T029 运行全量 TypeScript 类型检查: `cd frontend && npx tsc --noEmit` - 确保无类型错误
- [ ] T030 运行 ESLint 检查: `cd frontend && npm run lint` - 修复代码风格问题
- [ ] T031 [P] 验证所有前端页面功能正常（登录、考场配置、抽签、大屏幕显示）
- [ ] T032 创建简单的测试脚本验证 storage 层 - 在浏览器控制台测试各 storage 函数

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 无依赖，立即开始
- **Phase 2 (Foundational)**: 依赖 Phase 1，阻塞所有 US
- **Phase 3 (US1)**: 依赖 Phase 2，可独立测试
- **Phase 4 (US2)**: 依赖 Phase 2 和 US1（需要基础 CRUD 完成），可独立测试
- **Phase 5 (US3)**: 依赖 Phase 2 和 US1，可独立测试
- **Phase 6 (US4)**: 依赖 Phase 2 和 US2（需要 Realtime 基础），可独立测试
- **Phase 7 (Polish)**: 依赖所有核心功能完成

### Critical Path (最小可行路径)

如果资源有限，按此顺序执行：
1. Phase 1 → Phase 2 (基础必须)
2. US1 (P1 - 数据持久化，没有系统无法使用)
3. US2 (P1 - 实时抽签，核心功能)
4. US4 (P3 - 故障恢复，现场稳定性)
5. US3 (P2 - 导出，锦上添花)


### Parallel Opportunities

- T009, T010, T011, T012, T013 可并行（不同 storage 文件）
- T027, T028, T029, T030 可并行（文档和检查）

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- 所有改造必须保持函数签名不变，确保 frontend/src/app/ 无需修改
- 每次修改 storage 文件后，立即在浏览器测试对应功能
- 提交信息格式: `feat(storage): migrate examRoomStorage to supabase`
- 遇到问题先检查环境变量是否正确配置
- Realtime 功能需要 Supabase 项目开启 Realtime 功能（在 Dashboard 中配置）
