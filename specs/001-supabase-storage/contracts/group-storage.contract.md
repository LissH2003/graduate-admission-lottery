# Group Storage Contract

分组数据存储契约，基于 `frontend/src/storage/groupStorage.ts`。

## TypeScript 接口

```typescript
interface Group {
  id: string;
  batchId: string;              // 所属批次ID
  batchName: string;            // 批次名称（冗余字段，方便显示）
  name: string;                 // 分组名称
  description: string;          // 分组描述
  candidateCount: number;       // 考生数量
  createdAt: string;            // 创建时间
  
  // 考场和时间配置
  examRoomId: string;           // 关联的考场ID
  examRoomName?: string;        // 考场名称（冗余字段，方便显示）
  date: string;                 // 面试日期（格式：YYYY-MM-DD）
  time: string;                 // 面试开始时间（格式：HH:mm）
  endTime: string;              // 面试结束时间（格式：HH:mm）
  
  // 志愿者配置
  volunteerIds?: string[];      // 分配的志愿者ID数组
}
```

## 函数契约

### getAllGroups
获取所有分组列表。

**签名**：
```typescript
export const getAllGroups = (): Group[]
```

**返回值**：`Group[]` - 分组对象数组

**行为**：
- 从 localStorage 读取分组数据
- 解析失败或数据不存在时返回空数组

---

### getGroupById
根据ID获取单个分组。

**签名**：
```typescript
export const getGroupById = (id: string): Group | undefined
```

**参数**：
- `id: string` - 分组唯一标识

**返回值**：`Group | undefined` - 分组对象或 undefined

---

### getGroupsByBatchId
根据批次ID获取分组列表。

**签名**：
```typescript
export const getGroupsByBatchId = (batchId: string): Group[]
```

**参数**：
- `batchId: string` - 批次ID

**返回值**：`Group[]` - 属于该批次的所有分组

---

### getGroupsByExamRoomId
根据考场ID获取分组列表。

**签名**：
```typescript
export const getGroupsByExamRoomId = (examRoomId: string): Group[]
```

**参数**：
- `examRoomId: string` - 考场ID

**返回值**：`Group[]` - 使用该考场的所有分组

---

### addGroup
添加新分组。

**签名**：
```typescript
export const addGroup = (group: Group): void
```

**参数**：
- `group: Group` - 完整的分组对象（包含id）

---

### updateGroup
更新分组信息。

**签名**：
```typescript
export const updateGroup = (id: string, updates: Partial<Group>): void
```

**参数**：
- `id: string` - 要更新的分组ID
- `updates: Partial<Group>` - 部分更新的字段

**行为**：
- 查找指定ID的分组
- 合并 updates 到原对象
- 如果找不到对应ID，不做任何操作

---

### deleteGroup
删除指定分组。

**签名**：
```typescript
export const deleteGroup = (id: string): void
```

**参数**：
- `id: string` - 要删除的分组ID

---

### deleteGroupsByBatchId
删除批次下的所有分组。

**签名**：
```typescript
export const deleteGroupsByBatchId = (batchId: string): void
```

**参数**：
- `batchId: string` - 批次ID

---

### clearAllGroups
清空所有分组数据。

**签名**：
```typescript
export const clearAllGroups = (): void
```

---

### updateGroupCandidateCount
更新分组的考生数量。

**签名**：
```typescript
export const updateGroupCandidateCount = (groupId: string, count: number): void
```

**参数**：
- `groupId: string` - 分组ID
- `count: number` - 新的考生数量

**说明**：
- 内部调用 `updateGroup` 更新 candidateCount 字段

---

### assignVolunteersToGroup
分配志愿者给分组。

**签名**：
```typescript
export const assignVolunteersToGroup = (groupId: string, volunteerIds: string[]): void
```

**参数**：
- `groupId: string` - 分组ID
- `volunteerIds: string[]` - 志愿者ID数组

---

### getGroupsByVolunteerId
获取志愿者被分配的所有分组。

**签名**：
```typescript
export const getGroupsByVolunteerId = (volunteerId: string): Group[]
```

**参数**：
- `volunteerId: string` - 志愿者ID

**返回值**：`Group[]` - volunteerIds 包含该志愿者的所有分组

**实现逻辑**：
- 遍历所有分组
- 检查 `group.volunteerIds` 数组是否包含指定 volunteerId
- 返回匹配的分组列表
