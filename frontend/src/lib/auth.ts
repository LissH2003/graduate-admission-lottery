// 认证工具函数 - 支持 Mock 模式和 SSO 模式
// 提供统一的登录状态管理、Token 操作、退出功能

// ============================================
// 类型定义
// ============================================

export interface AuthUser {
  id: string;
  student_id: string;
  name: string;
  role: 'admin' | 'volunteer';
  department?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  authSource: 'mock' | 'sso' | null;
}

// ============================================
// 环境变量读取
// ============================================

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'mock';
const SSO_CLIENT_ID = import.meta.env.VITE_SSO_CLIENT_ID || 'YW2025032';
const SSO_CALLBACK_URL = import.meta.env.VITE_SSO_CALLBACK_URL || '';
const SSO_AUTH_URL = import.meta.env.VITE_SSO_AUTH_URL || 'https://sso.ustb.edu.cn/idp/authCenter/authenticate';
const EDGE_FUNCTION_URL = import.meta.env.VITE_EDGE_FUNCTION_URL || '';

// ============================================
// 本地存储 Key
// ============================================

const STORAGE_KEYS = {
  TOKEN: 'lottery_auth_token',
  USER: 'lottery_auth_user',
  AUTH_SOURCE: 'lottery_auth_source',
  STATE: 'lottery_auth_state',
};

// ============================================
// Token 操作
// ============================================

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

export function removeToken(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}

// ============================================
// 用户信息操作
// ============================================

export function getUser(): AuthUser | null {
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as AuthUser;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function removeUser(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// ============================================
// 认证状态
// ============================================

export function getAuthSource(): 'mock' | 'sso' | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_SOURCE) as 'mock' | 'sso' | null;
}

export function setAuthSource(source: 'mock' | 'sso'): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_SOURCE, source);
}

export function removeAuthSource(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_SOURCE);
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

export function getAuthState(): AuthState {
  return {
    user: getUser(),
    token: getToken(),
    isAuthenticated: isAuthenticated(),
    authSource: getAuthSource(),
  };
}

// ============================================
// SSO 模式：生成 state 防 CSRF
// ============================================

export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(STORAGE_KEYS.STATE, state);
  return state;
}

export function validateState(state: string): boolean {
  const savedState = sessionStorage.getItem(STORAGE_KEYS.STATE);
  sessionStorage.removeItem(STORAGE_KEYS.STATE);
  return savedState === state;
}

// ============================================
// SSO 模式：跳转竹云登录
// ============================================

export function redirectToSSO(): void {
  const state = generateState();
  const params = new URLSearchParams({
    client_id: SSO_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SSO_CALLBACK_URL,
    state: state,
  });

  const authUrl = `${SSO_AUTH_URL}?${params.toString()}`;
  window.location.href = authUrl;
}

// ============================================
// SSO 模式：处理回调
// ============================================

import { setSupabaseAuth } from './supabase';

export interface SSOResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export async function handleSSOCallback(code: string, state: string): Promise<SSOResult> {
  // 校验 state 防 CSRF
  if (!validateState(state)) {
    return { success: false, error: 'Invalid state parameter' };
  }

  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/sso-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'SSO authentication failed'
      };
    }

    // 保存认证信息
    setToken(data.token);
    setUser(data.user);
    setAuthSource('sso');

    // 更新 Supabase 客户端的认证 token
    setSupabaseAuth(data.token);

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    console.error('SSO callback error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

// ============================================
// 退出登录
// ============================================

export async function logout(): Promise<void> {
  const authSource = getAuthSource();

  if (authSource === 'sso') {
    // SSO 模式：调用竹云全局退出
    await logoutSSO();
  }

  // 清除本地存储
  removeToken();
  removeUser();
  removeAuthSource();

  // 清除 Supabase 认证
  setSupabaseAuth(null);
}

async function logoutSSO(): Promise<void> {
  try {
    // 竹云全局退出 URL
    const ssoLogoutUrl = 'https://sso.ustb.edu.cn/idp/authCenter/logout';

    // 在新窗口打开退出页面（避免影响当前页面跳转）
    const logoutWindow = window.open(ssoLogoutUrl, '_blank', 'width=100,height=100');

    // 短暂延迟后关闭退出窗口
    setTimeout(() => {
      logoutWindow?.close();
    }, 2000);
  } catch (error) {
    console.error('SSO logout error:', error);
  }
}

// ============================================
// 检查当前认证模式
// ============================================

export function isSSOMode(): boolean {
  return AUTH_MODE === 'sso';
}

export function isMockMode(): boolean {
  return AUTH_MODE === 'mock';
}

// ============================================
// 初始化认证状态（应用启动时调用）
// ============================================

export function initAuth(): AuthState {
  const token = getToken();
  const user = getUser();

  if (token && user) {
    // 检查 Mock Token 是否过期
    if (token.startsWith('mock_token_')) {
      const timestamp = parseInt(token.split('_')[2]);
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        // Token 过期，清除登录状态
        removeToken();
        removeUser();
        removeAuthSource();
        setSupabaseAuth(null);
        return { user: null, token: null, isAuthenticated: false, authSource: null };
      }
    }

    // 恢复 Supabase 认证
    setSupabaseAuth(token);
  }

  return getAuthState();
}

// ============================================
// 与现有 AppContext 兼容的转换函数
// ============================================

export function convertToAppContextUser(authUser: AuthUser) {
  // 转换为 AppContext 中的 CurrentUser 格式（类型已统一，直接透传）
  return {
    id: authUser.id,
    username: authUser.student_id,
    name: authUser.name,
    role: authUser.role,
  };
}
