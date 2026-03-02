// M1-登录页（角色选择）
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import { UserCircle, Lock, Shield, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as volunteerStorage from '../../storage/volunteerStorage';
const logoImage = '/logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser } = useAppContext();
  const [role, setRole] = useState<'admin' | 'volunteer'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      alert('请输入用户名和密码');
      return;
    }

    if (role === 'admin') {
      // 管理员登录：简单验证（实际应该调用后端API）
      // 这里使用硬编码的管理员账号，实际应该从后端验证
      if (username === 'admin' && password === 'admin123') {
        setCurrentUser({
          id: 'admin-1',
          username: username,
          name: '系统管理员',
          role: 'admin',
        });
        navigate('/admin-home');
      } else {
        alert('用户名或密码错误');
      }
    } else {
      // 志愿者登录：从volunteerStorage中验证
      const volunteer = volunteerStorage.getVolunteerByUsername(username);

      if (!volunteer) {
        alert('用户名不存在，请联系管理员');
        return;
      }

      // 验证密码
      if (volunteer.password !== password) {
        alert('密码错误，请重试');
        return;
      }

      // 检查是否有分配的考场
      if (!volunteer.examRoomIds || volunteer.examRoomIds.length === 0) {
        alert('您暂未分配考场，请联系管理员');
        return;
      }

      // 登录成功，设置当前用户
      setCurrentUser({
        id: volunteer.id,
        username: volunteer.username,
        name: volunteer.name,
        role: 'volunteer',
      });
      navigate('/volunteer-exam-select');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F3F4F6] p-4">
      {/* 背景装饰 - 更加低调 */}
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

      {/* 登录卡片 - 更紧凑的宽度 */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-8 relative z-10">
        {/* Logo 和标题 - 更正式的设计 */}
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

        {/* 角色选择 - Tab式设计，更方形紧凑 */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-[#F3F4F6] rounded-lg">
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`
                flex-1 py-2.5 px-4 rounded-md transition-all duration-200
                flex items-center justify-center gap-2 text-sm font-medium
                ${role === 'admin'
                  ? 'bg-white text-[#1E3A8A] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
                }
              `}
            >
              <Shield size={16} />
              <span>管理员</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('volunteer')}
              className={`
                flex-1 py-2.5 px-4 rounded-md transition-all duration-200
                flex items-center justify-center gap-2 text-sm font-medium
                ${role === 'volunteer'
                  ? 'bg-white text-[#1E3A8A] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
                }
              `}
            >
              <Users size={16} />
              <span>志愿者</span>
            </button>
          </div>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="text-sm font-medium text-[#374151] block mb-2">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="w-full h-11 px-4 text-sm text-[#111827] bg-white border border-[#D1D5DB] rounded-lg focus:border-[#3B82F6] focus:ring-2 focus:ring-[#BFDBFE] outline-none transition-all placeholder:text-[#9CA3AF]"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-[#374151] block mb-2">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full h-11 px-4 text-sm text-[#111827] bg-white border border-[#D1D5DB] rounded-lg focus:border-[#3B82F6] focus:ring-2 focus:ring-[#BFDBFE] outline-none transition-all placeholder:text-[#9CA3AF]"
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-2 text-[#6B7280] cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[#3B82F6] rounded" />
              <span className="text-sm">记住登录</span>
            </label>
            <a href="#" className="text-[#3B82F6] hover:text-[#1E40AF] text-sm">
              忘记密码？
            </a>
          </div>

          <div className="pt-2">
            <LotteryButton type="submit" fullWidth>
              登录系统
            </LotteryButton>
          </div>
        </form>

        {/* 测试账号提示 - 更低调的设计 */}
        <div className="mt-6 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
          <p className="text-xs font-medium text-[#92400E] mb-1.5">测试账号</p>
          <div className="text-xs text-[#92400E] leading-relaxed space-y-1">
            <div>管理员：<span className="font-mono font-medium">admin</span> / <span className="font-mono font-medium">admin123</span></div>
            <div>志愿者：请在管理员端创建账号</div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#9CA3AF]">
            北京科技大学研究生院 © 2024 版本 2.0.1
          </p>
        </div>
      </div>
    </div>
  );
}