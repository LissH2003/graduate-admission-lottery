// 根布局组件 - 包裹 AppProvider
import { Outlet } from 'react-router';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}
