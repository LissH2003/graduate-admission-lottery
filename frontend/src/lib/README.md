# 前端密码加密使用说明

## 🔐 安全登录流程

### 加密流程

```
用户输入: admin123
    ↓
前端 SHA256: SHA256("admin:admin123")
           = "bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d"
    ↓
发送请求: { input_username: "admin", input_password: "bf6b5bdb..." }
    ↓
DevTools 显示: 只看到哈希值，看不到原始密码
    ↓
后端验证: bcrypt(哈希值) vs 数据库存储的 bcrypt 哈希
```

## 📦 使用方式

### 1. 导入加密函数

```typescript
import { hashPassword } from '../lib/crypto';
```

### 2. 登录时调用

```typescript
const handleLogin = async (username: string, password: string) => {
  // 1. 前端预哈希密码
  const hashedPassword = await hashPassword(password, username);
  
  // 2. 发送哈希值到后端
  const { data, error } = await supabase.rpc('verify_lottery_admin', {
    input_username: username,
    input_password: hashedPassword,  // 64位哈希值，非明文
  });
  
  // 3. 处理返回结果
  if (data?.success) {
    // 登录成功
  }
};
```

## ⚠️ 重要提示

### 不要这样做 ❌

```typescript
// 错误：发送明文密码
const { data } = await supabase.rpc('verify_lottery_admin', {
  input_username: username,
  input_password: password,  // ❌ 明文密码会暴露在 DevTools 中
});
```

### 应该这样做 ✅

```typescript
// 正确：发送哈希值
const hashedPassword = await hashPassword(password, username);
const { data } = await supabase.rpc('verify_lottery_admin', {
  input_username: username,
  input_password: hashedPassword,  // ✅ 64位哈希值
});
```

## 🧪 测试账号

| 用户名 | 密码 | 预期 SHA256 值 |
|--------|------|---------------|
| `admin` | `admin123` | `bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d` |
| `mech_admin` | `mech123` | `e02023da701ed20515479d3a541978797491f069de3bc9ec01028011e1f04134` |
| `cs_admin` | `cs123` | `2d6fef65db99240eb529892baf126515bd3dbca9772c7842284abfc8ad395fe3` |
| `volunteer1` | `volunteer123` | `c415dc0ec47ea01c0b377a4c4ee76e24a053a9eb0d36eba3fe47468e7df316b8` |
| `volunteer2` | `volunteer456` | `00df52225f81e5f40d302423bcb9d5d840b36746654003d2e8e8eead6e003450` |

## 🔧 API 函数

### `hashPassword(password: string, username: string): Promise<string>`

计算带盐值的 SHA256 哈希。

**参数:**
- `password`: 明文密码
- `username`: 用户名（作为盐值）

**返回:**
- 64 位十六进制字符串

**示例:**
```typescript
const hash = await hashPassword('admin123', 'admin');
// 返回: "bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d"
```

### `sha256(message: string): Promise<string>`

计算字符串的 SHA256 哈希。

**参数:**
- `message`: 输入字符串

**返回:**
- 64 位十六进制字符串

## 🛡️ 安全说明

### 为什么需要前端预哈希？

1. **防止密码泄露**：即使用户在公共电脑上登录，下一个用户打开 DevTools 也看不到原始密码
2. **防止恶意插件**：浏览器插件无法直接获取用户输入的明文密码
3. **双重保护**：前端 SHA256 + 后端 bcrypt，即使数据库泄露也难以破解

### 哈希算法说明

- **前端**: SHA256("username:password")
  - 使用用户名作为盐值，确保相同密码不同用户哈希值不同
  - 防止彩虹表攻击
  
- **后端**: bcrypt(SHA256哈希)
  - bcrypt 是慢哈希算法，抵抗暴力破解
  - 每次生成不同盐值，防止哈希碰撞

## 🐛 调试

### 如何计算某个密码的哈希值？

```typescript
import { debugHash } from '../lib/crypto';

// 在控制台输出哈希值
debugHash('admin', 'admin123');
// 输出:
// Username: admin
// Password: admin123
// SHA256("admin:admin123"):
// bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d
```

### 验证哈希是否正确

```typescript
const hash = await hashPassword('admin123', 'admin');
console.log(hash === 'bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d');
// 应该输出: true
```
