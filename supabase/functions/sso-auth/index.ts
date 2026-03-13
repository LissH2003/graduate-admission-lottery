// Edge Function: SSO 统一身份认证处理（竹云 OAuth2）
// 接收 {code, state}，完成：
// 1. 用 code 换 access_token
// 2. 用 access_token 获取用户信息
// 3. 验证用户存在且状态有效
// 4. 生成 JWT 返回

import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS 头配置
// 生产环境建议修改为自己的域名，如：'https://your-domain.com'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 竹云 SSO 配置（从环境变量读取）
const SSO_BASE_URL = 'https://sso.ustb.edu.cn';

interface SSOConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface UserInfoResponse {
  spRoleList?: string[];  // 学工号列表，取第一个
  name?: string;          // 姓名
  [key: string]: unknown;
}

interface DatabaseUser {
  id: string;
  student_id: string;
  name: string;
  role: string;
  department: string | null;
  status: string;
  auth_source: string;
}

// 从环境变量获取配置
function getSSOConfig(): SSOConfig {
  const clientId = Deno.env.get('SSO_CLIENT_ID');
  const clientSecret = Deno.env.get('SSO_CLIENT_SECRET');
  const callbackUrl = Deno.env.get('SSO_CALLBACK_URL');

  if (!clientId || !clientSecret) {
    throw new Error('Missing SSO_CLIENT_ID or SSO_CLIENT_SECRET environment variable');
  }

  return {
    clientId,
    clientSecret,
    callbackUrl: callbackUrl || 'http://115.25.59.77/auth/callback',
  };
}

// Base64 编码（用于 Basic Auth）
function base64Encode(str: string): string {
  return btoa(str);
}

// 带超时的 fetch 包装函数
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// 用 authorization code 换取 access_token
async function exchangeCodeForToken(
  code: string,
  config: SSOConfig
): Promise<TokenResponse> {
  const tokenUrl = `${SSO_BASE_URL}/idp/api/v3/oauth2/token`;

  // Basic Auth: client_id:client_secret 的 Base64 编码
  const basicAuth = base64Encode(`${config.clientId}:${config.clientSecret}`);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.callbackUrl,
  });

  const response = await fetchWithTimeout(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  }, 10000); // 10秒超时

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', response.status, errorText);
    throw new Error(`Failed to exchange code for token: ${response.status}`);
  }

  return await response.json() as TokenResponse;
}

// 用 access_token 获取用户信息
async function getUserInfo(accessToken: string): Promise<UserInfoResponse> {
  const userInfoUrl = `${SSO_BASE_URL}/idp/api/v3/oauth2/userInfo`;

  const response = await fetchWithTimeout(userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }, 10000); // 10秒超时

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Get user info failed:', response.status, errorText);
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return await response.json() as UserInfoResponse;
}

// 调用竹云全局退出（GLO）
async function globalLogout(accessToken: string): Promise<void> {
  try {
    const logoutUrl = `${SSO_BASE_URL}/idp/api/v3/oauth2/globalLogout`;

    await fetch(logoutUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('Global logout called successfully');
  } catch (error) {
    console.error('Global logout failed:', error);
    // 不抛异常，因为退出失败不影响主流程
  }
}

// 查找数据库用户（查询 lottery_volunteers 表，使用 login_id 匹配）
async function findDatabaseUser(
  supabase: ReturnType<typeof createClient>,
  studentId: string
): Promise<DatabaseUser | null> {
  // 直接查询 lottery_volunteers 表，使用 login_id 匹配
  const { data, error } = await supabase
    .from('lottery_volunteers')
    .select('id, login_id, username, name, role, status, academy_id')
    .ilike('login_id', studentId)  // 忽略大小写匹配
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Database query error:', error);
    throw new Error('Database query failed');
  }

  if (!data) {
    console.log('User not found for studentId:', studentId);
    return null;
  }

  // 获取学院名称
  let department = null;
  if (data.academy_id) {
    const { data: academyData } = await supabase
      .from('lottery_academies')
      .select('name')
      .eq('id', data.academy_id)
      .maybeSingle();
    department = academyData?.name || null;
  }

  return {
    id: data.id,
    student_id: data.login_id || data.username,  // login_id 或 username
    name: data.name,
    role: data.role,  // 'admin' 或 'volunteer'，直接用于前端路由判断
    department: department,
    status: data.status,
    auth_source: 'sso',
  };
}

// 使用 Web Crypto API 生成 HMAC-SHA256 签名
async function generateSignature(input: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(input);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = new Uint8Array(signature);

  return btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// 生成 JWT Token（统一使用异步版本）
async function generateJWT(user: DatabaseUser, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    student_id: user.student_id,
    name: user.name,
    role: user.role,
    department: user.department,
    iat: now,
    exp: now + 8 * 60 * 60, // 8小时有效期
  };

  const encodeBase64 = (obj: Record<string, unknown>): string => {
    const str = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    return btoa(String.fromCharCode(...bytes))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const encodedHeader = encodeBase64(header);
  const encodedPayload = encodeBase64(payload);
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await generateSignature(signatureInput, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// 更新用户最后登录时间（暂空实现，lottery_volunteers 表无 last_login_at 字段）
// 如需记录登录时间，请先在表中添加该字段
async function updateLastLogin(
  _supabase: ReturnType<typeof createClient>,
  studentId: string
): Promise<void> {
  // 暂时仅记录日志，不执行数据库更新
  console.log('User logged in:', studentId, 'at', new Date().toISOString());
}

// 主处理函数
Deno.serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 解析请求体
    const body = await req.json();
    const { code, state } = body;

    // 验证必要参数
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证 state 参数（防 CSRF）
    // 注意：完整的 state 验证需要前后端配合存储 state
    // 这里做基本检查，确保 state 存在且不为空
    if (!state || typeof state !== 'string' || state.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: 如需完整 state 验证，需要：
    // 1. 前端在跳转竹云前将 state 存入 Redis/Session
    // 2. 回调时 Edge Function 读取并验证 state 匹配
    // 3. 验证通过后删除 state 防止重放攻击
    console.log('State parameter received:', state.substring(0, 8) + '...');

    // 获取配置
    const config = getSSOConfig();

    // 1. 用 code 换取 access_token
    const tokenResponse = await exchangeCodeForToken(code, config);

    // 2. 用 access_token 获取用户信息
    const userInfo = await getUserInfo(tokenResponse.access_token);

    // 3. 提取学工号（spRoleList[0]）
    const studentId = userInfo.userName || userInfo.loginName;
    if (!studentId) {
      await globalLogout(tokenResponse.access_token);
      return new Response(
        JSON.stringify({ error: '无效用户信息: 缺少 student ID' }),
        {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 4. 查询数据库验证用户存在
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_DB_URL')?.replace('/postgres', '') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const dbUser = await findDatabaseUser(supabase, studentId);

    // 5. 用户不存在或状态无效
    if (!dbUser) {
      // 调用全局退出，清除竹云会话
      await globalLogout(tokenResponse.access_token);
      return new Response(
        JSON.stringify({
          error: '账号不存在',
          message: '您的账号未在系统中注册，请联系管理员'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dbUser.status !== 'active') {
      await globalLogout(tokenResponse.access_token);
      return new Response(
        JSON.stringify({
          error: '账号已禁用',
          message: '您的账号已被禁用，请联系管理员'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. 更新最后登录时间（可选，不影响主流程）
    await updateLastLogin(supabase, studentId).catch(() => {
      // 忽略错误，不影响登录
    });

    // 7. 生成 JWT
    const jwtSecret = Deno.env.get('JWT_SECRET') || supabaseServiceKey;
    const token = await generateJWT(dbUser, jwtSecret);

    // 8. 返回成功响应
    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: dbUser.id,
          student_id: dbUser.student_id,
          name: dbUser.name,
          role: dbUser.role,
          department: dbUser.department,
        },
        expires_in: 8 * 60 * 60, // 8小时
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SSO auth error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({
        error: 'Authentication failed',
        message: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
