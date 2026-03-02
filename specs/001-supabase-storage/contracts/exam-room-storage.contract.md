# Exam Room Storage Contract

考场数据存储契约，基于 `frontend/src/storage/examRoomStorage.ts`。

## TypeScript 接口

```typescript
interface ExamRoom {
  id: string;
  name: string;           // 考场名称，如"机械楼301"
  location: string;       // 考场位置
  building: string;       // 楼栋
  floor: string;          // 楼层
  capacity: number;       // 容量
  facilities: string[];   // 设施，如["投影仪", "白板", "音响"]
  status: 'active' | 'inactive';  // 状态
  createdAt: string;
  description?: string;   // 备注
}
```

## 函数契约

### getAllExamRooms
获取所有考场列表。

**签名**：
```typescript
export const getAllExamRooms = (): ExamRoom[]
```

**返回值**：`ExamRoom[]` - 考场对象数组

**行为**：
- 从 localStorage 读取考场数据
- 解析失败或数据不存在时返回空数组

---

### getExamRoomById
根据ID获取单个考场。

**签名**：
```typescript
export const getExamRoomById = (id: string): ExamRoom | undefined
```

**参数**：
- `id: string` - 考场唯一标识

**返回值**：`ExamRoom | undefined` - 考场对象或 undefined

---

### getActiveExamRooms
获取活动状态的考场列表。

**签名**：
```typescript
export const getActiveExamRooms = (): ExamRoom[]
```

**返回值**：`ExamRoom[]` - 状态为 'active' 的考场数组

---

### getExamRoomsByBuilding
根据楼栋获取考场列表。

**签名**：
```typescript
export const getExamRoomsByBuilding = (building: string): ExamRoom[]
```

**参数**：
- `building: string` - 楼栋名称

**返回值**：`ExamRoom[]` - 指定楼栋的考场数组

---

### addExamRoom
添加新考场。

**签名**：
```typescript
export const addExamRoom = (room: ExamRoom): void
```

**参数**：
- `room: ExamRoom` - 完整的考场对象（包含id）

**副作用**：
- 将考场追加到 localStorage 中的考场列表

---

### updateExamRoom
更新考场信息。

**签名**：
```typescript
export const updateExamRoom = (id: string, updates: Partial<ExamRoom>): void
```

**参数**：
- `id: string` - 要更新的考场ID
- `updates: Partial<ExamRoom>` - 部分更新的字段

**行为**：
- 查找指定ID的考场
- 合并 updates 到原对象
- 如果找不到对应ID，不做任何操作

---

### deleteExamRoom
删除指定考场。

**签名**：
```typescript
export const deleteExamRoom = (id: string): void
```

**参数**：
- `id: string` - 要删除的考场ID

---

### clearAllExamRooms
清空所有考场数据。

**签名**：
```typescript
export const clearAllExamRooms = (): void
```

**副作用**：
- 从 localStorage 移除所有考场数据

---

### getAllBuildings
获取所有楼栋列表（去重）。

**签名**：
```typescript
export const getAllBuildings = (): string[]
```

**返回值**：`string[]` - 按字母排序的楼栋名称数组

---

## 初始化行为

模块加载时会自动执行 `initializeDefaultRooms()`：
- 如果 localStorage 中没有考场数据
- 则创建4个默认考场（机械楼301、302、401，行政楼201）
