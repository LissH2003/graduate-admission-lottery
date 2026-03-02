# Implementation Plan: [FEATURE]

**Branch**: `feat/supabase-storage` | **Date**: [2026-03-02] | **Spec**: [specs/001-supabase-storage/spec.md]
**Input**: Feature specification from `/specs/001-supabase-storage/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[将前端本地存储层（内存/LocalStorage）迁移至 Supabase 实现数据持久化，保持 frontend/src/storage/ 层 API 完全不变，零破坏 frontend/src/app/ 目录代码，通过数据转换层适配 Supabase snake_case 与前端 camelCase 命名差异，Phase 2 接入 Realtime 实现抽签实时同步]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [TypeScript 5.9 + React 18.3]  
**Primary Dependencies**: [Vite 6.4, @supabase/supabase-js 2.x, React Context, React Router v7]  
**Storage**: [Supabase (PostgreSQL + Realtime)]  
**Testing**: [Vitest (后续补充) 或 NEEDS_CLARIFICATION]  
**Target Platform**: [Web (Chrome/Edge/Firefox latest)]
**Project Type**: [web-application (frontend + BaaS)]  
**Performance Goals**: [CRUD <300ms, Realtime latency <100ms, 支持并发抽签 50/s]  
**Constraints**: [
- 零破坏原则：禁止修改 frontend/src/app/ 下任何文件
- 接口冻结：保持 storage/ 层所有函数签名完全不变
- 渐进式改造：Phase 1 基础 CRUD，Phase 2 Realtime
- 命名转换：自动处理 snake_case <-> camelCase
]  
**Scale/Scope**: [支持 1000 人规模复试抽签，单批次 50 考场，每考场 200 人]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[G1 - Single Project Limit]: [✅ PASS - 仅改造 frontend/src/storage/ 层，不新增独立后端项目]  
[G2 - API Stability]: [✅ PASS - 保持 storage/ 接口签名不变，前端调用代码零修改]  
[G3 - No Premature Abstraction]: [✅ PASS - 直接替换存储实现，不引入 Repository/DAO 过度封装]  
[G4 - Technology Alignment]: [✅ PASS - 使用 Supabase 官方 SDK 与最佳实践]  

**Result**: [✅ PASS] - [符合所有约束，可以继续执行]

## Project Structure

### Documentation (this feature)

```text
specs/001-supabase-storage/
├── plan.md              # This file - 整体规划
├── research.md          # Phase 0: Supabase SDK 与表结构调研
├── data-model.md        # Phase 1: 数据库 Schema 与 TypeScript 类型映射
├── quickstart.md        # Phase 1: 环境配置与 Supabase 项目设置指南
├── contracts/           # Phase 1: storage/ 层接口契约文档
│   ├── exam-room-storage.contract.md
│   ├── candidate-storage.contract.md
│   ├── volunteer-storage.contract.md
│   └── group-storage.contract.md
└── tasks.md             # Phase 2: 具体改造任务清单
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)

# [SELECTED] Option 2: Web application (frontend + BaaS)
frontend/
├── src/
│   ├── lib/                       # [NEW] Supabase 客户端配置
│   │   ├── supabase.ts
│   │   └── database.types.ts
│   ├── storage/                   # [MODIFIED] 存储层改造（保持 API 不变）
│   │   ├── index.ts
│   │   ├── examRoomStorage.ts
│   │   ├── candidateStorage.ts
│   │   ├── volunteerStorage.ts
│   │   ├── groupStorage.ts
│   │   └── batchStorage.ts
│   ├── app/                       # [FROZEN] 禁止修改！
│   │   ├── context/AppContext.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── layouts/
│   ├── main.tsx
│   └── styles/
├── public/
├── .env.local                     # [NEW] Supabase 环境变量
├── package.json                   # [MODIFIED] 添加 @supabase/supabase-js
└── vite.config.ts
```

**Structure Decision**: [选择 Option 2 Web application 结构，frontend/ 为项目根目录，内部 src/lib/ 新增 Supabase 配置，src/storage/ 改造为数据库访问层，src/app/ 严格冻结不修改]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [N/A]| [无违规 - 符合所有约束] | [N/A] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
