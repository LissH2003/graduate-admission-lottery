// OAuth 回调处理页
// 处理竹云 SSO 回调，解析 code 和 state，调用 Edge Function 完成登录

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { handleSSOCallback, getAuthState } from '../../lib/auth';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// 修复：使用相对路径，自动适配 /lottery/ 子目录
const logoImage = './logo.png';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentUser, setCurrentAcademy } = useAppContext();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // 检查是否已登录（避免重复处理）
      const authState = getAuthState();
      if (authState.isAuthenticated) {
        handleRedirect(authState.user?.role);
        return;
      }

      // 处理竹云返回的错误
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || error || '认证失败');
        toast.error(`登录失败：${errorDescription || error}`);
        return;
      }

      // 检查必要参数
      if (!code || !state) {
        setStatus('error');
        setErrorMessage('缺少必要的认证参数');
        toast.error('登录失败：缺少必要的认证参数');
        return;
      }

      try {
        // 调用 Edge Function 处理回调
        const result = await handleSSOCallback(code, state);

        if (result.success && result.user) {
          // 登录成功
          setStatus('success');

          // 设置用户状态
          setCurrentUser({
            id: result.user.id,
            username: result.user.student_id,
            name: result.user.name,
            role: result.user.role === 'admin' ? 'admin' : 'volunteer',
          });

          // 设置学院
          setCurrentAcademy({
            id: '564af4fc-1bbb-4a14-89ce-0178661d7ab0',
            name: result.user.department || '机械工程学院',
          });

          toast.success(`登录成功，欢迎 ${result.user.name}`);

          // 延迟跳转，让用户看到成功状态
          setTimeout(() => {
            handleRedirect(result.user?.role);
          }, 1000);
        } else {
          // 登录失败（账号不存在或已禁用）
          setStatus('error');
          setErrorMessage(result.error || '登录失败');
          toast.error(result.error || '登录失败');

          // 注意：此时竹云会话已被 Edge Function 清除
          // 用户需要重新输入密码登录
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '处理回调时发生错误');
        toast.error('登录失败，请稍后重试');
      }
    };

    processCallback();
  }, [searchParams, navigate, setCurrentUser, setCurrentAcademy]);

  // 根据角色跳转（lottery_volunteers 表的 role 字段：admin 或 volunteer）
  const handleRedirect = (role?: string) => {
    if (role === 'admin') {
      navigate('/admin-home');
    } else {
      // volunteer 或其他角色都跳转到志愿者页面
      navigate('/volunteer-exam-select');
    }
  };

  // 返回登录页
  const handleBackToLogin = () => {
    navigate('./');
  };

  // 修复：重试登录（使用 navigate 避免硬编码路径）
  const handleRetry = () => {
    navigate('/', { replace: true });
    // 如果需要强制刷新触发 SSO 重定向，使用 replace + reload
    setTimeout(() => {
      window.location.reload();
    }, 100);
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

      {/* 状态卡片 */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-8 relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <img
              src={logoImage}
              alt="USTB Logo"
              className="h-12 w-auto"
              style={{ filter: 'brightness(0)' }}
            />
          </div>
          <h1 className="text-xl font-bold text-[#111827]">统一身份认证</h1>
        </div>

        {/* 处理中状态 */}
        {status === 'processing' && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <Loader2 size={48} className="text-[#3B82F6] animate-spin" />
            </div>
            <h2 className="text-lg font-medium text-[#111827] mb-2">正在登录...</h2>
            <p className="text-sm text-[#6B7280]">正在验证身份信息，请稍候</p>
          </div>
        )}

        {/* 成功状态 */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle size={48} className="text-[#10B981]" />
            </div>
            <h2 className="text-lg font-medium text-[#111827] mb-2">登录成功</h2>
            <p className="text-sm text-[#6B7280]">正在跳转至系统...</p>
          </div>
        )}

        {/* 错误状态 */}
        {status === 'error' && (
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              <AlertCircle size={48} className="text-[#EF4444]" />
            </div>
            <h2 className="text-lg font-medium text-[#111827] mb-2">登录失败</h2>
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mb-4">
              <p className="text-sm text-[#DC2626]">{errorMessage}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-[#6B7280]">
                可能的原因：
              </p>
              <ul className="text-xs text-[#6B7280] text-left list-disc pl-5 space-y-1">
                <li>您的账号未在系统中注册</li>
                <li>您的账号已被禁用</li>
                <li>认证会话已过期</li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <button
                onClick={handleRetry}
                className="w-full py-2.5 px-4 bg-[#3B82F6] hover:bg-[#1E40AF] text-white text-sm font-medium rounded-lg transition-colors"
              >
                重新登录
              </button>
              <button
                onClick={handleBackToLogin}
                className="w-full py-2.5 px-4 bg-white border border-[#D1D5DB] text-[#374151] text-sm font-medium rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                返回首页
              </button>
            </div>

            {/* 帮助信息 */}
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              <p className="text-xs text-[#9CA3AF]">
                如需帮助，请联系管理员或拨打信息中心电话：010-xxxxxxxx
              </p>
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="mt-6 pt-4 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#9CA3AF]">
            北京科技大学研究生院 © 2026
          </p>
        </div>
      </div>
    </div>
  );
}