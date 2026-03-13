import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local'
  );
}

// 存储当前使用的 token
let currentAuthToken: string | null = null;
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

// 获取或创建 Supabase 客户端
function getSupabaseClient(): ReturnType<typeof createClient<Database>> {
  const storedToken = typeof window !== 'undefined' 
    ? localStorage.getItem('lottery_auth_token') 
    : null;
  
  // 如果 token 变化了或客户端未创建，重新创建
  if (storedToken !== currentAuthToken || !supabaseInstance) {
    currentAuthToken = storedToken;
    const token = storedToken || supabaseAnonKey || '';
    
    supabaseInstance = createClient<Database>(
      supabaseUrl || '',
      supabaseAnonKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey || '',
          },
        },
      }
    );
  }
  
  return supabaseInstance;
}

// 导出代理对象，所有方法都通过 getSupabaseClient() 获取最新客户端
export const supabase = {
  from: (table: string) => getSupabaseClient().from(table),
  rpc: (fn: string, params?: Record<string, unknown>) => getSupabaseClient().rpc(fn, params as any),
  
  auth: {
    getSession: () => getSupabaseClient().auth.getSession(),
    onAuthStateChange: (callback: Parameters<ReturnType<typeof createClient>['auth']['onAuthStateChange']>[0]) => 
      getSupabaseClient().auth.onAuthStateChange(callback),
  },
};

// 设置/清除认证 token
export function setSupabaseAuth(token: string | null): void {
  if (typeof window === 'undefined') return;
  
  if (token) {
    localStorage.setItem('lottery_auth_token', token);
  } else {
    localStorage.removeItem('lottery_auth_token');
  }
  
  // 重置客户端，下次调用时会重新创建
  currentAuthToken = token;
  supabaseInstance = null;
}

// 连接状态检查
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('lottery_batches').select('count').single();
    return !error;
  } catch {
    return false;
  }
};

// 获取连接状态
export const getConnectionStatus = () => {
  return {
    url: supabaseUrl,
    connected: supabaseUrl && supabaseAnonKey ? true : false,
  };
};
