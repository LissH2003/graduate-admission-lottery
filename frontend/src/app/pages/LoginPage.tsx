// 登录页 - 提供统一身份认证登录和本地测试登录两种方式
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import { Shield, Users, LogIn, Lock, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { redirectToSSO, getAuthState } from '../../lib/auth';
import { initBatchStorage } from '../../storage/batchStorage';
import { initExamRoomStorage } from '../../storage/examRoomStorage';
import { initGroupStorage } from '../../storage/groupStorage';
import { initCandidateStorage } from '../../storage/candidateStorage';

const logoImage = './logo.png';

// 登录方式类型
type LoginMode = 'select' | 'sso' | 'local';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser, setCurrentAcademy } = useAppContext();

  // 当前登录方式
  const [loginMode, setLoginMode] = useState<LoginMode>('select');
  const [isLoading, setIsLoading] = useState(false);

  // 本地登录表单状态
  const [role, setRole] = useState<'admin' | 'volunteer'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 检查是否已登录
  useEffect(() => {
    const authState = getAuthState();
    if (authState.isAuthenticated && authState.user) {
      // 已登录，跳转到对应页面
      if (authState.user.role === 'admin') {
        navigate('/admin-home');
      } else {
        navigate('/volunteer-exam-select');
      }
    }
  }, [navigate]);

  // SSO 登录：跳转竹云
  const handleSSOLogin = () => {
    setIsLoading(true);
    redirectToSSO();
  };

  // 本地登录：使用 lottery_volunteers 表验证
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.warning('请输入用户名和密码');
      return;
    }

    setIsLoading(true);

    try {
      // 使用 verify_user RPC 函数验证
      const { data, error } = await (supabase.rpc as any)('verify_user', {
        p_username: username,
        p_password: password
      });

      if (error) {
        console.error('RPC 错误:', error);
        toast.error('验证服务暂时不可用，请稍后重试');
        return;
      }

      // RPC 返回数组，取第一个元素
      const result = (Array.isArray(data) ? data[0] : data) as {
        success: boolean;
        message?: string;
        user_id: string;
        username: string;
        name: string;
        role: 'admin' | 'volunteer';
        academy_id?: string;
        academy_name?: string;
      };

      if (!result?.success) {
        toast.error(result?.message || '用户名或密码错误');
        return;
      }

      // 检查用户角色与选择的角色是否匹配
      if (result.role !== role) {
        toast.warning(`该账号为${result.role === 'admin' ? '管理员' : '志愿者'}账号，请选择正确角色登录`);
        setIsLoading(false);
        return;
      }

      // 登录成功
      setCurrentUser({
        id: result.user_id,
        username: result.username,
        name: result.name,
        role: result.role,
      });

      setCurrentAcademy({
        id: result.academy_id || '564af4fc-1bbb-4a14-89ce-0178661d7ab0',
        name: result.academy_name || '机械工程学院'
      });

      // 初始化各 Storage 模块（登录后才加载数据）
      try {
        await initBatchStorage();
        await initExamRoomStorage();
        await initGroupStorage();
        await initCandidateStorage();
      } catch (e) {
        console.error('Storage 初始化失败:', e);
      }

      toast.success(`登录成功，欢迎 ${result.name}`);

      // 根据角色跳转
      if (result.role === 'admin') {
        navigate('/admin-home');
      } else {
        navigate('/volunteer-exam-select');
      }

    } catch (error) {
      console.error('登录异常:', error);
      toast.error('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F3F4F6] p-4">
      {/* 背景装饰 */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(to right, #E5E7EB 1px, transparent 1px),
            linear-gradient(to bottom, #E5E7EB 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* 登录卡片 */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-8 relative z-10">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src={logoImage}
              alt="USTB Logo"
              className="h-16 w-auto"
              style={{ filter: 'brightness(0)' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-[#111827] mb-2 leading-tight">
            北京科技大学<br />研究生复试抽签系统
          </h1>
          <p className="text-sm text-[#6B7280] mt-2">Graduate Admission Lottery System</p>
        </div>

        {/* 选择登录方式 */}
        {loginMode === 'select' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-[#6B7280] mb-6">
              请选择登录方式
            </p>

            {/* 统一身份认证登录 */}
            <LotteryButton
              onClick={() => setLoginMode('sso')}
              fullWidth
              className="flex items-center justify-center gap-2 py-3"
            >
              <Shield size={20} />
              统一身份认证登录
            </LotteryButton>

            {/* 本地测试登录 */}
            <button
              onClick={() => setLoginMode('local')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 
                         bg-white border-2 border-[#E5E7EB] text-[#374151] 
                         rounded-lg hover:bg-[#F9FAFB] hover:border-[#D1D5DB]
                         transition-all duration-200 font-medium"
            >
              <Lock size={20} />
              系统账号登录
            </button>

            {/* 说明文字 */}
            <div className="mt-6 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
              <p className="text-xs text-[#166534] text-center">
                <strong>提示：</strong>校内用户请使用统一身份认证登录
              </p>
            </div>
          </div>
        )}

        {/* SSO 登录方式 */}
        {loginMode === 'sso' && (
          <div className="space-y-4">
            <button
              onClick={() => setLoginMode('select')}
              className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] mb-2"
            >
              <ArrowLeft size={16} />
              返回
            </button>

            <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-[#1E40AF]" />
                <span className="font-medium text-[#1E40AF]">统一身份认证</span>
              </div>
              <p className="text-sm text-[#374151]">
                点击下方按钮跳转至北京科技大学统一身份认证平台进行登录。
              </p>
            </div>

            <LotteryButton
              onClick={handleSSOLogin}
              fullWidth
              disabled={isLoading}
              className="flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              {isLoading ? '跳转中...' : '立即跳转登录'}
            </LotteryButton>

            <p className="text-xs text-[#9CA3AF] text-center">
              登录成功后，系统将自动返回并进入抽签系统
            </p>
          </div>
        )}

        {/* 本地测试登录方式 */}
        {loginMode === 'local' && (
          <div className="space-y-4">
            <button
              onClick={() => setLoginMode('select')}
              className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] mb-2"
            >
              <ArrowLeft size={16} />
              返回
            </button>

            {/* 角色选择 */}
            <div className="flex gap-2 p-1 bg-[#F3F4F6] rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`
                  flex-1 py-2 px-3 rounded-md transition-all duration-200
                  flex items-center justify-center gap-1.5 text-sm font-medium
                  ${role === 'admin'
                    ? 'bg-white text-[#1E3A8A] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#111827]'
                  }
                `}
              >
                <Shield size={14} />
                <span>管理员</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('volunteer')}
                className={`
                  flex-1 py-2 px-3 rounded-md transition-all duration-200
                  flex items-center justify-center gap-1.5 text-sm font-medium
                  ${role === 'volunteer'
                    ? 'bg-white text-[#1E3A8A] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#111827]'
                  }
                `}
              >
                <Users size={14} />
                <span>志愿者</span>
              </button>
            </div>

            {/* 登录表单 */}
            <form onSubmit={handleLocalLogin} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#374151] block mb-1.5">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full h-10 px-3 text-sm text-[#111827] bg-white border border-[#D1D5DB] rounded-lg 
                           focus:border-[#3B82F6] focus:ring-2 focus:ring-[#BFDBFE] outline-none transition-all 
                           placeholder:text-[#9CA3AF]"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#374151] block mb-1.5">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full h-10 px-3 text-sm text-[#111827] bg-white border border-[#D1D5DB] rounded-lg 
                           focus:border-[#3B82F6] focus:ring-2 focus:ring-[#BFDBFE] outline-none transition-all 
                           placeholder:text-[#9CA3AF]"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="pt-1">
                <LotteryButton type="submit" fullWidth disabled={isLoading}>
                  {isLoading ? '登录中...' : '登录系统'}
                </LotteryButton>
              </div>
            </form>

            {/* 测试账号提示 */}
            <div className="mt-3 p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
              <p className="text-xs font-medium text-[#92400E] mb-1">登录说明</p>
              <div className="text-xs text-[#92400E] space-y-0.5">
                <div>1、使用工号及系统密码登录<span className="font-mono">admin</span> / <span className="font-mono">admin123</span></div>
                <div>注意：若：<span className="font-mono">volunteer1</span> / <span className="font-mono">volunteer123</span></div>
              </div>
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#9CA3AF]">
            北京科技大学研究生院 © 2026 版本 2.1.0
          </p>
        </div>
      </div>
    </div>
  );
}
