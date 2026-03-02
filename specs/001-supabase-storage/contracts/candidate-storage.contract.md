# Candidate Storage Contract

考生数据存储契约，基于 `frontend/src/storage/candidateStorage.ts`。

## TypeScript 接口

```typescript
interface Candidate {
  id: string;
  groupId: string;              // 所属分组ID
  name: string;                 // 姓名
  idCard: string;               // 身份证号
  registrationNo?: string;      // 准考证号（可选）
  candidateNo?: string;         // 考生编号（可选）
  phone?: string;               // 联系电话（可选）
  status: 'waiting' | 'drawn' | 'absent';  // 考生状态
  drawnNumber?: number;         // 抽签号码（可选）
  drawnTime?: string;           // 抽签时间（可选）
}
```

## 函数契约

### getAllCandidates
获取所有考生列表。

**签名**：
```typescript
export const getAllCandidates = (): Candidate[]
```

**返回值**：`Candidate[]` - 考生对象数组

**行为**：
- 从 localStorage 读取考生数据
- 解析失败或数据不存在时返回空数组

---

### getCandidateById
根据ID获取单个考生。

**签名**：
```typescript
export const getCandidateById = (id: string): Candidate | undefined
```

**参数**：
- `id: string` - 考生唯一标识

**返回值**：`Candidate | undefined` - 考生对象或 undefined

---

### getCandidatesByGroupId
根据分组ID获取考生列表。

**签名**：
```typescript
export const getCandidatesByGroupId = (groupId: string): Candidate[]
```

**参数**：
- `groupId: string` - 分组ID

**返回值**：`Candidate[]` - 属于该分组的所有考生

---

### getCandidatesByBatchId
根据批次ID获取所有考生。

**签名**：
```typescript
export const getCandidatesByBatchId = (batchId: string, groups: any[]): Candidate[]
```

**参数**：
- `batchId: string` - 批次ID
- `groups: any[]` - 分组列表（用于查找批次下的分组）

**返回值**：`Candidate[]` - 该批次下的所有考生

**实现逻辑**：
1. 从 groups 中筛选出 batchId 匹配的分组
2. 提取这些分组的 id 列表
3. 返回 groupId 在列表中的考生

---

### addCandidate
添加单个考生。

**签名**：
```typescript
export const addCandidate = (candidate: Candidate): void
```

**参数**：
- `candidate: Candidate` - 完整的考生对象（包含id）

---

### addCandidates
批量添加考生。

**签名**：
```typescript
export const addCandidates = (newCandidates: Candidate[]): void
```

**参数**：
- `newCandidates: Candidate[]` - 考生对象数组

**行为**：
- 将新考生追加到现有列表末尾

---

### updateCandidate
更新考生信息。

**签名**：
```typescript
export const updateCandidate = (id: string, updates: Partial<Candidate>): void
```

**参数**：
- `id: string` - 要更新的考生ID
- `updates: Partial<Candidate>` - 部分更新的字段

**行为**：
- 查找指定ID的考生
- 合并 updates 到原对象
- 如果找不到对应ID，不做任何操作

---

### deleteCandidate
删除指定考生。

**签名**：
```typescript
export const deleteCandidate = (id: string): void
```

**参数**：
- `id: string` - 要删除的考生ID

---

### deleteCandidatesByGroupId
删除分组下的所有考生。

**签名**：
```typescript
export const deleteCandidatesByGroupId = (groupId: string): void
```

**参数**：
- `groupId: string` - 分组ID

---

### clearAllCandidates
清空所有考生数据。

**签名**：
```typescript
export const clearAllCandidates = (): void
```

---

### getGroupCandidateStats
获取分组的考生统计信息。

**签名**：
```typescript
export const getGroupCandidateStats = (groupId: string): {
  total: number;
  waiting: number;
  drawn: number;
  absent: number;
}
```

**参数**：
- `groupId: string` - 分组ID

**返回值**：统计对象，包含：
- `total: number` - 总考生数
- `waiting: number` - 等待中考生数
- `drawn: number` - 已抽签考生数
- `absent: number` - 缺席考生数

---

## 状态说明

| 状态值 | 含义 | 说明 |
|--------|------|------|
| `waiting` | 等待中 | 尚未抽签 |
| `drawn` | 已抽签 | 已完成抽签，有抽签号码 |
| `absent` | 缺席 | 未到场参加考试 |
