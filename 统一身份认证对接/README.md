# 北科大研究生复试抽签系统 - 统一身份认证对接文档

## 概述

本系统已接入北京科技大学统一身份认证平台（竹云 OAuth2），支持通过学校 SSO 登录。

## 文件结构

```
supabase/
├── migrations/
│   └── 006_add_sso_support.sql      # 数据库迁移：创建 lottery_users 表
├── functions/
│   └── sso-auth/
│       └── index.ts                 # Edge Function：处理 OAuth 回调
└── config.toml                      # Edge Function 配置

frontend/
├── .env.development                 # 开发环境配置（Mock 模式）
├── .env.production                  # 生产环境配置（SSO 模式）
├── .env.example                     # 环境变量模板
├── src/
│   ├── lib/
│   │   └── auth.ts                  # 认证工具函数
│   └── app/
│       ├── pages/
│       │   ├── LoginSSO.tsx         # SSO 登录页
│       │   └── AuthCallback.tsx     # OAuth 回调处理页
│       └── routes.ts                # 路由配置（已修改）

scripts/
├── import_examinees.py              # 用户数据导入脚本
└── requirements.txt                 # Python 依赖
```

## 部署步骤

### 1. 数据库迁移

```bash
# 应用迁移文件
supabase db push
# 或本地执行
psql $DATABASE_URL -f supabase/migrations/006_add_sso_support.sql
```

### 2. Edge Function 配置

#### 2.1 部署 Edge Function

```bash
# 部署 sso-auth 函数
supabase functions deploy sso-auth

# 设置环境变量
supabase secrets set SSO_CLIENT_ID=your-client-id
supabase secrets set SSO_CLIENT_SECRET=your-client-secret
supabase secrets set SSO_CALLBACK_URL=http://10.x.x.x/auth/callback
supabase secrets set JWT_SECRET=your-jwt-secret  # 可选
```

#### 2.2 确认 config.toml

确保 `supabase/config.toml` 包含：

```toml
[functions.sso-auth]
verify_jwt = false
```

### 3. 前端配置

#### 3.1 开发环境（Mock 模式）

```bash
# 使用 .env.development（已配置为 Mock 模式）
cd frontend
npm run dev
```

#### 3.2 生产环境（SSO 模式）

编辑 `frontend/.env.production`：

```bash
# 1. 设置竹云分配的 client_id
VITE_SSO_CLIENT_ID=your-client-id-from-zhuyun

# 2. 设置实际部署的内网 IP
VITE_SSO_CALLBACK_URL=http://10.x.x.x/auth/callback

# 3. 构建生产包
npm run build
```

### 4. 用户数据导入

```bash
cd scripts

# 安装依赖
pip install -r requirements.txt

# 设置环境变量
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 导入用户数据
python import_examinees.py students.xlsx --auth-source sso
```

Excel 文件格式：

| 学工号 | 姓名 | 身份 | 学院 | 状态 |
|--------|------|------|------|------|
| 2024001 | 张三 | student | 机械工程学院 | active |
| T001 | 李老师 | teacher | 信息学院 | active |

## 环境变量说明

### 前端环境变量（Vite）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | https://xxx.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | eyJhbG... |
| `VITE_AUTH_MODE` | 认证模式 | `mock` 或 `sso` |
| `VITE_SSO_CLIENT_ID` | 竹云 OAuth Client ID | client-id-xxx |
| `VITE_SSO_CALLBACK_URL` | 回调地址 | http://10.0.0.1/auth/callback |
| `VITE_SSO_AUTH_URL` | 竹云授权端点 | https://sso.ustb.edu.cn/... |
| `VITE_EDGE_FUNCTION_URL` | Edge Function URL | https://xxx.supabase.co/functions/v1 |

### Edge Function 环境变量

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `SSO_CLIENT_ID` | 竹云 Client ID | 信息中心申请 |
| `SSO_CLIENT_SECRET` | 竹云 Client Secret | 信息中心申请 |
| `SSO_CALLBACK_URL` | 回调地址（必须内网 IP） | 部署前确认 |
| `SUPABASE_URL` | Supabase URL | 自动设置 |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | 自动设置 |
| `JWT_SECRET` | JWT 签名密钥 | 可选，自动生成 |

## 认证流程

```
用户访问系统
    │
    ▼
┌─────────────────┐
│  VITE_AUTH_MODE │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  mock       sso
    │         │
    ▼         ▼
LoginPage  LoginSSO
    │         │
    │         ▼
    │    跳转竹云
    │         │
    │         ▼
    │    用户登录
    │         │
    │         ▼
    │    回调 /auth/callback
    │         │
    │         ▼
    │    AuthCallback
    │         │
    │         ▼
    │    调用 Edge Function
    │         │
    │         ▼
    │    sso-auth/index.ts
    │         │
    │    ┌────┴────┐
    │    ▼         ▼
    │  成功       失败
    │    │         │
    │    ▼         ▼
    │  存Token   调用GLO
    │    │      （全局退出）
    ▼    ▼         ▼
  Dashboard    显示错误
```

## 安全说明

1. **Client Secret 保护**
   - `client_secret` 仅存储在 Edge Function 环境变量中
   - 前端代码无法访问 client_secret

2. **Token 安全**
   - JWT Token 有效期 8 小时
   - Token 存储在 localStorage
   - 退出时清除 Token 和 SSO 会话

3. **账号安全**
   - SSO 不自动创建账号，必须提前导入
   - 学工号不存在时调用 GLO 全局退出
   - 账号状态为 inactive 时拒绝登录

## 常见问题

### Q: 部署后提示"账号不存在"

A: 需要先用导入脚本将用户信息导入数据库：
```bash
python scripts/import_examinees.py users.xlsx
```

### Q: 回调地址配置错误

A: 回调地址必须是内网 IP（如 10.x.x.x），且需要：
1. 在 `frontend/.env.production` 中设置 `VITE_SSO_CALLBACK_URL`
2. 在 Edge Function 环境变量中设置 `SSO_CALLBACK_URL`
3. 在竹云平台注册回调地址

### Q: 如何切换回本地登录模式

A: 修改 `frontend/.env.production`：
```bash
VITE_AUTH_MODE=mock
```
然后重新构建部署。

### Q: 如何退出 SSO 登录

A: 系统退出时会自动调用竹云全局退出（GLO）接口，确保：
1. 本地 Token 被清除
2. 竹云会话被清除（再次访问 SSO 需重新输入密码）

## 联系方式

- 系统问题：请联系开发团队
- SSO 问题：请联系信息中心
