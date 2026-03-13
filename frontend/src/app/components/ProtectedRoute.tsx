// 路由守卫组件 - 未登录用户重定向到登录页
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'volunteer'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { currentUser, isLoading } = useAppContext();

  useEffect(() => {
    // 等待 AppContext 初始化完成
    if (isLoading) return;

    // 未登录，重定向到登录页
    if (!currentUser) {
      navigate('/', { replace: true });
      return;
    }

    // 检查角色权限
    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      // 角色不匹配，根据角色跳转到对应页面
      if (currentUser.role === 'admin') {
        navigate('/admin-home', { replace: true });
      } else {
        navigate('/volunteer-exam-select', { replace: true });
      }
      return;
    }
  }, [currentUser, isLoading, navigate, allowedRoles]);

  // 加载中或未登录时不渲染子组件
  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-[#6B7280]">正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  // 角色不匹配时不渲染
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return null;
  }

  return <>{children}</>;
}
