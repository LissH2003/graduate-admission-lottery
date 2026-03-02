# Volunteer Storage Contract

志愿者数据存储契约，基于 `frontend/src/storage/volunteerStorage.ts`。

## TypeScript 接口

```typescript
interface Volunteer {
  id: string;
  username: string;             // 用户名
  name: string;                 // 真实姓名
  phone: string;                // 联系电话
  password?: string;            // 密码（可选，建议用 Supabase Auth 替代）
  examRoomIds: string[];        // 分配的考场ID数组（多对多关系）
  createdAt: string;            // 创建时间
  status: 'active' | 'inactive'; // 账号状态
}
```

## 函数契约

### getAllVolunteers
获取所有志愿者列表。

**签名**：
```typescript
export const getAllVolunteers = (): Volunteer[]
```

**返回值**：`Volunteer[]` - 志愿者对象数组

**行为**：
- 从 localStorage 读取志愿者数据
- 解析失败或数据不存在时返回空数组

---

### getVolunteerById
根据ID获取单个志愿者。

**签名**：
```typescript
export const getVolunteerById = (id: string): Volunteer | undefined
```

**参数**：
- `id: string` - 志愿者唯一标识

**返回值**：`Volunteer | undefined` - 志愿者对象或 undefined

---

### getVolunteerByUsername
根据用户名获取志愿者。

**签名**：
```typescript
export const getVolunteerByUsername = (username: string): Volunteer | undefined
```

**参数**：
- `username: string` - 用户名

**返回值**：`Volunteer | undefined` - 志愿者对象或 undefined

---

### addVolunteer
添加新志愿者。

**签名**：
```typescript
export const addVolunteer = (volunteer: Volunteer): void
```

**参数**：
- `volunteer: Volunteer` - 完整的志愿者对象（包含id）

---

### updateVolunteer
更新志愿者信息。

**签名**：
```typescript
export const updateVolunteer = (id: string, updates: Partial<Volunteer>): void
```

**参数**：
- `id: string` - 要更新的志愿者ID
- `updates: Partial<Volunteer>` - 部分更新的字段

**行为**：
- 查找指定ID的志愿者
- 合并 updates 到原对象
- 如果找不到对应ID，不做任何操作

---

### deleteVolunteer
删除指定志愿者。

**签名**：
```typescript
export const deleteVolunteer = (id: string): void
```

**参数**：
- `id: string` - 要删除的志愿者ID

---

### clearAllVolunteers
清空所有志愿者（保留管理员）。

**签名**：
```typescript
export const clearAllVolunteers = (): void
```

**行为**：
- 保留 username 为 'admin' 的志愿者
- 删除其他所有志愿者

---

### assignExamRoomToVolunteer
分配单个考场给志愿者。

**签名**：
```typescript
export const assignExamRoomToVolunteer = (volunteerId: string, examRoomId: string): void
```

**参数**：
- `volunteerId: string` - 志愿者ID
- `examRoomId: string` - 考场ID

**行为**：
- 如果考场ID已存在，不重复添加
- 将考场ID追加到志愿者的 examRoomIds 数组

---

### unassignExamRoomFromVolunteer
取消分配考场。

**签名**：
```typescript
export const unassignExamRoomFromVolunteer = (volunteerId: string, examRoomId: string): void
```

**参数**：
- `volunteerId: string` - 志愿者ID
- `examRoomId: string` - 要移除的考场ID

**行为**：
- 从志愿者的 examRoomIds 数组中移除指定考场ID

---

### batchAssignExamRoomsToVolunteer
批量分配考场给志愿者。

**签名**：
```typescript
export const batchAssignExamRoomsToVolunteer = (volunteerId: string, examRoomIds: string[]): void
```

**参数**：
- `volunteerId: string` - 志愿者ID
- `examRoomIds: string[]` - 考场ID数组（将替换原有分配）

**说明**：
- 与 `assignExamRoomToVolunteer` 不同，此函数直接设置完整的考场列表

---

### getVolunteersByExamRoomId
获取指定考场下的所有志愿者。

**签名**：
```typescript
export const getVolunteersByExamRoomId = (examRoomId: string): Volunteer[]
```

**参数**：
- `examRoomId: string` - 考场ID

**返回值**：`Volunteer[]` - examRoomIds 包含该考场的所有志愿者

---

### assignVolunteersToExamRoom
批量分配志愿者到考场。

**签名**：
```typescript
export const assignVolunteersToExamRoom = (examRoomId: string, volunteerIds: string[]): void
```

**参数**：
- `examRoomId: string` - 考场ID
- `volunteerIds: string[]` - 志愿者ID数组

**行为**：
- 为每个志愿者调用 `assignExamRoomToVolunteer`
- 如果志愿者已被分配该考场，则跳过

---

### validateLogin
验证登录凭据。

**签名**：
```typescript
export const validateLogin = (username: string, password: string): Volunteer | null
```

**参数**：
- `username: string` - 用户名
- `password: string` - 密码

**返回值**：`Volunteer | null` - 验证成功返回志愿者对象，失败返回 null

**验证逻辑**：
1. 根据 username 查找志愿者
2. 检查 password 是否匹配
3. 检查 status 是否为 'active'
4. 全部通过返回志愿者对象，否则返回 null

---

### isUsernameExists
检查用户名是否已存在。

**签名**：
```typescript
export const isUsernameExists = (username: string): boolean
```

**参数**：
- `username: string` - 用户名

**返回值**：`boolean` - 存在返回 true，否则返回 false

---

## 初始化行为

模块加载时会自动执行 `initializeDefaultAdmin()`：
- 如果 localStorage 中没有志愿者数据
- 则创建默认管理员账号：
  - username: `admin`
  - name: `系统管理员`
  - phone: `13800000000`
  - password: `123456`
  - status: `active`

**⚠️ 安全提示**：生产环境应移除默认密码或使用 Supabase Auth 进行身份验证。
