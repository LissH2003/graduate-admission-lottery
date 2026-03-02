// React Router 配置
import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import LoginPage from './pages/LoginPage';
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

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: LoginPage,
      },
      {
        path: 'admin-home',
        Component: AdminHomePage,
      },
      {
        path: 'exam-select',
        Component: ExamSelectPage,
      },
      {
        path: 'volunteer-exam-select',
        Component: VolunteerExamSelectPage,
      },
      {
        path: 'lottery-console',
        Component: LotteryConsolePage,
      },
      {
        path: 'display',
        Component: DisplayScreenPage,
      },
      {
        path: 'exam-config',
        Component: ExamConfigPage,
      },
      {
        path: 'volunteer-manage',
        Component: VolunteerManagePage,
      },
      {
        path: 'batch-manage',
        Component: BatchManagePage,
      },
      {
        path: 'group-manage',
        Component: GroupManagePage,
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
]);