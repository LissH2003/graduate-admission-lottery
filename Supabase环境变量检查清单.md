# Supabase 连接环境变量检查清单

**检查时间**: 2026-03-11  
**检查范围**: 前端 + Edge Function

---

## 一、前端环境变量检查

### 1.1 核心 Supabase 配置

| 变量名 | 文件 | 当前值 | 用途 | 部署修改 |
|--------|------|--------|------|----------|
| `VITE_SUPABASE_URL` | .env | `https://bmvjhgvjdpmfycptlvla.supabase.co` | Supabase 项目 URL | ✅ 无需修改 |
| `VITE_SUPABASE_ANON_KEY` | .env | `eyJhbGciOiJIUzI1NiIs...` | 匿名用户 API Key | ✅ 无需修改 |

### 1.2 前端使用位置

```
frontend/src/lib/supabase.ts (第4-5行)
├── import.meta.env.VITE_SUPABASE_URL
└── import.meta.env.VITE_SUPABASE_ANON_KEY
```

**检查状态**: ✅ 已通过环境变量读取，无硬编码

### 1.3 依赖该配置的模块

| 模块 | 导入路径 | 说明 |
|------|---------|------|
| examRoomStorage.ts | `import { supabase } from '../lib/supabase'` | 考场数据存储 |
| batchStorage.ts | `import { supabase } from '../lib/supabase'` | 批次数据存储 |
| volunteerStorage.ts | `import { supabase } from '../lib/supabase'` | 用户数据存储 |
| candidateStorage.ts | `import { supabase } from '../lib/supabase'` | 考生数据存储 |
| groupStorage.ts | `import { supabase } from '../lib/supabase'` | 分组数据存储 |

**检查状态**: ✅ 所有 Storage 层都通过 lib/supabase.ts 连接

---

## 二、Edge Function 环境变量检查

### 2.1 Edge Function 内 Supabase 配置

**文件**: `supabase/functions/sso-auth/index.ts`

| 变量名 | 行号 | 读取方式 | 用途 | 部署设置位置 |
|--------|------|----------|------|-------------|
| `SUPABASE_URL` | 336 | `Deno.env.get('SUPABASE_URL')` | Supabase 项目 URL | Supabase Dashboard > Secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | 337 | `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` | 服务角色密钥（高权限） | Supabase Dashboard > Secrets |
| `SUPABASE_DB_URL` | 336 | `Deno.env.get('SUPABASE_DB_URL')` | 数据库 URL（备选） | 自动提供 |

**注意**: Edge Function 中使用的是 **SERVICE_ROLE_KEY**（高权限），不是 ANON_KEY

### 2.2 Edge Function 其他环境变量

| 变量名 | 行号 | 用途 | 部署时必须设置 |
|--------|------|------|---------------|
| `SSO_CLIENT_ID` | 51 | 竹云 OAuth client_id | ✅ 是 |
| `SSO_CLIENT_SECRET` | 52 | 竹云 OAuth client_secret | ✅ 是 |
| `SSO_CALLBACK_URL` | 53 | 回调地址 | ✅ 是 |
| `JWT_SECRET` | 374 | JWT 签名密钥（可选） | ⚠️ 可选，默认使用 SERVICE_ROLE_KEY |

---

## 三、环境变量文件清单

### 3.1 前端构建所需文件

#### 开发环境
| 文件 | 用途 | 部署时 |
|------|------|--------|
| `.env` | 基础默认配置 | ❌ 不直接使用 |
| `.env.local` | 本地开发覆盖 | ❌ 不打包 |
| `.env.example` | 配置模板 | ❌ 不打包 |

#### 生产环境
| 文件 | 用途 | 部署时 |
|------|------|--------|
| `.env.production` | **生产环境配置** | ✅ **必须修改并使用** |

### 3.2 生产环境配置模板

创建 `frontend/.env.production`：

```bash
# ============================================
# 生产环境配置 - 部署前必须修改
# ============================================

# Supabase 配置（已配置，通常无需修改）
VITE_SUPABASE_URL=https://bmvjhgvjdpmfycptlvla.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdmpoZ3ZqZHBtZnljcHRsdmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTMwNjMsImV4cCI6MjA4NjE4OTA2M30.UC_dAsFyGxGV2ifL06m4OkzsJpAB9TS0NCbgxjHpkpI

# 认证模式：生产环境必须使用 sso
VITE_AUTH_MODE=sso

# 【必须修改】竹云 SSO 配置
VITE_SSO_CLIENT_ID=your-client-id-from-school
VITE_SSO_CALLBACK_URL=http://YOUR_DEPLOY_IP/auth/callback

# Edge Function URL（已配置，通常无需修改）
VITE_EDGE_FUNCTION_URL=https://bmvjhgvjdpmfycptlvla.supabase.co/functions/v1
```

---

## 四、部署时需要设置的环境变量

### 4.1 前端构建时注入（.env.production）

| 变量 | 当前状态 | 需要修改 | 获取方式 |
|------|---------|----------|---------|
| VITE_SUPABASE_URL | ✅ 已配置 | ❌ 无需修改 | - |
| VITE_SUPABASE_ANON_KEY | ✅ 已配置 | ❌ 无需修改 | - |
| VITE_AUTH_MODE | ✅ 已配置(sso) | ❌ 无需修改 | - |
| VITE_SSO_CLIENT_ID | ❌ 占位符 | ✅ 必须修改 | 学校信息中心 |
| VITE_SSO_CALLBACK_URL | ❌ 占位符 | ✅ 必须修改 | 部署服务器IP |
| VITE_EDGE_FUNCTION_URL | ✅ 已配置 | ❌ 无需修改 | - |

### 4.2 Supabase Edge Function Secrets

在 Supabase Dashboard > Edge Functions > Secrets 中设置：

```bash
# Supabase 内置（通常已自动设置）
SUPABASE_URL=https://bmvjhgvjdpmfycptlvla.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 竹云 SSO（必须手动设置）
SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
SSO_CALLBACK_URL=http://your-domain/auth/callback

# JWT（可选，如不设置则使用 SERVICE_ROLE_KEY）
JWT_SECRET=your-jwt-secret
```

---

## 五、检查结论

### 5.1 环境变量读取方式汇总

| 层级 | 读取方式 | 文件 | 状态 |
|------|---------|------|------|
| 前端 | `import.meta.env.VITE_*` | supabase.ts | ✅ 正确 |
| Edge Function | `Deno.env.get('*')` | sso-auth/index.ts | ✅ 正确 |
| Storage 层 | 从 lib/supabase.ts 导入 | 所有 storage 文件 | ✅ 正确 |

### 5.2 硬编码检查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Supabase URL 硬编码 | ❌ 未发现 | 均通过环境变量读取 |
| Supabase Key 硬编码 | ❌ 未发现 | 均通过环境变量读取 |
| 回调地址硬编码 | ❌ 未发现 | 均通过环境变量读取 |

### 5.3 部署配置完整性

| 配置项 | 状态 | 备注 |
|--------|------|------|
| 前端 Supabase URL | ✅ | 已配置 |
| 前端 Supabase Key | ✅ | 已配置 |
| Edge Function Supabase URL | ⚠️ | 自动获取，无需手动设置 |
| Edge Function Service Role Key | ⚠️ | 自动获取，无需手动设置 |
| 竹云 Client ID | ❌ | 需要学校提供 |
| 竹云 Client Secret | ❌ | 需要学校提供 |
| 回调地址 | ❌ | 需要确认部署IP |

---

## 六、部署操作清单

### 6.1 前端部署步骤

```bash
# 1. 确认生产配置
cat frontend/.env.production
# 检查 VITE_SSO_CLIENT_ID 和 VITE_SSO_CALLBACK_URL 是否已修改

# 2. 复制生产配置
cp frontend/.env.production frontend/.env

# 3. 构建生产包
cd frontend
npm ci
npm run build

# 4. 部署 dist/ 目录到服务器
```

### 6.2 Edge Function 部署步骤

```bash
# 1. 部署 Edge Function
supabase functions deploy sso-auth

# 2. 设置环境变量
supabase secrets set SSO_CLIENT_ID=your-client-id
supabase secrets set SSO_CLIENT_SECRET=your-client-secret
supabase secrets set SSO_CALLBACK_URL=http://your-domain/auth/callback

# 3. 验证部署
supabase functions list
```

### 6.3 部署验证命令

```bash
# 验证前端可以连接 Supabase
curl -I https://bmvjhgvjdpmfycptlvla.supabase.co/rest/v1/

# 验证 Edge Function 运行正常
 curl https://bmvjhgvjdpmfycptlvla.supabase.co/functions/v1/sso-auth \
   -X POST \
   -H "Content-Type: application/json" \
   -d '{"code":"test","state":"test"}'
```

---

## 七、风险提示

### 🔴 高优先级
1. **Edge Function 环境变量独立**: 前端的 `.env.production` 和 Edge Function 的 Secrets 是两套独立配置，都需要设置
2. **Service Role Key 权限**: Edge Function 使用 SERVICE_ROLE_KEY，具有数据库完全权限，务必保护好
3. **回调地址一致性**: 前端 VITE_SSO_CALLBACK_URL、Edge Function SSO_CALLBACK_URL、竹云平台注册的回调地址必须完全一致

### 🟡 中优先级
1. **ANON_KEY vs SERVICE_ROLE_KEY**: 
   - 前端使用 ANON_KEY（受 RLS 限制）
   - Edge Function 使用 SERVICE_ROLE_KEY（绕过 RLS）
2. **JWT_SECRET 可选**: 如不设置，Edge Function 会使用 SERVICE_ROLE_KEY 作为 JWT 签名密钥

---

## 八、总结

| 检查项 | 结果 |
|--------|------|
| 环境变量读取方式 | ✅ 全部通过环境变量，无硬编码 |
| 前端配置完整性 | ⚠️ 需修改 client_id 和回调地址 |
| Edge Function 配置 | ⚠️ 需部署并设置 Secrets |
| 安全性 | ✅ 使用不同权限的 Key |

**部署前必须完成**:
1. ✅ 修改 `frontend/.env.production` 中的 `VITE_SSO_CLIENT_ID`
2. ✅ 修改 `frontend/.env.production` 中的 `VITE_SSO_CALLBACK_URL`
3. ✅ 部署 Edge Function 并设置 Secrets
4. ✅ 在竹云平台注册回调地址
