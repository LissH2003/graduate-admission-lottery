// React Router 配置
import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import AdminHomePage from './pages/AdminHomePage';
import ExamSelectPage from './pages/ExamSelectPage';
import VolunteerExamSelectPage from './pages/VolunteerExamSelectPage';
import LotteryConsolePage from './pages/LotteryConsolePage';
import DisplayScreenPage from './pages/DisplayScreenPage';
import ExamConfigPage from './pages/ExamConfigPage';
import VolunteerManagePage from './pages/VolunteerManagePage';
import BatchManagePage from './pages/BatchManagePage';
import GroupManagePage from './pages/GroupManagePage';
import NotFoundPage from './pages/NotFoundPage';

// 路由守卫包装组件
import { ProtectedRoute } from './components/ProtectedRoute';

// 管理员专属页面包装器
const AdminOnly = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>
);

// 志愿者专属页面包装器
const VolunteerOnly = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={['volunteer']}>{children}</ProtectedRoute>
);

// 通用登录保护页面包装器（管理员和志愿者都可以访问）
const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: LoginPage,  // 登录页（统一身份认证 + 本地测试）
      },
      {
        path: 'auth/callback',
        Component: AuthCallback,
      },
      // 管理员专属页面
      {
        path: 'admin-home',
        element: <AdminOnly><AdminHomePage /></AdminOnly>,
      },
      {
        path: 'exam-select',
        element: <AdminOnly><ExamSelectPage /></AdminOnly>,
      },
      {
        path: 'exam-config',
        element: <AdminOnly><ExamConfigPage /></AdminOnly>,
      },
      {
        path: 'volunteer-manage',
        element: <AdminOnly><VolunteerManagePage /></AdminOnly>,
      },
      {
        path: 'batch-manage',
        element: <AdminOnly><BatchManagePage /></AdminOnly>,
      },
      {
        path: 'group-manage',
        element: <AdminOnly><GroupManagePage /></AdminOnly>,
      },
      // 志愿者专属页面
      {
        path: 'volunteer-exam-select',
        element: <VolunteerOnly><VolunteerExamSelectPage /></VolunteerOnly>,
      },
      // 通用页面（管理员和志愿者都可以访问，但都需要登录）
      {
        path: 'lottery-console',
        element: <Protected><LotteryConsolePage /></Protected>,
      },
      {
        path: 'display',
        element: <Protected><DisplayScreenPage /></Protected>,
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
], {
  basename: '/lottery',  // 关键修改：添加这一行
});