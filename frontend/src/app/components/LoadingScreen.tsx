// 加载页面组件 - 品牌加载动画 + 进度显示
import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  // 当前加载步骤 (0-5)
  currentStep?: number;
  // 总步骤数
  totalSteps?: number;
  // 当前步骤名称
  stepName?: string;
  // 是否显示超时提示
  showTimeout?: boolean;
}

// 加载步骤配置
const LOADING_STEPS = [
  '正在连接服务器...',
  '正在加载考场数据...',
  '正在加载批次数据...',
  '正在加载分组数据...',
  '正在加载考生数据...',
  '正在加载志愿者数据...',
];

export function LoadingScreen({
  currentStep = 0,
  totalSteps = 5,
  stepName,
  showTimeout = false,
}: LoadingScreenProps) {
  const [dots, setDots] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  // 动态省略号动画
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 计算已用时间
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 计算进度百分比
  const progressPercent = Math.min(
    Math.round((currentStep / totalSteps) * 100),
    99
  );

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  // 获取当前显示文本
  const displayText = stepName || LOADING_STEPS[currentStep] || LOADING_STEPS[0];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF]">
      {/* 主内容区 */}
      <div className="flex flex-col items-center max-w-md w-full px-8">
        {/* Logo 区域 */}
        <div className="relative mb-8">
          {/* 外圈旋转动画 */}
          <div className="absolute inset-0 -m-4">
            <div className="w-32 h-32 rounded-full border-4 border-[#E0E7FF] border-t-[#3B82F6] animate-spin" 
                 style={{ animationDuration: '1.5s' }} />
          </div>
          
          {/* Logo 容器 */}
          <div className="relative w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center">
            <img
              src="/logo.png"
              alt="USTB Logo"
              className="w-16 h-16 object-contain"
              style={{ filter: 'brightness(0)' }}
            />
          </div>
        </div>

        {/* 系统标题 */}
        <h1 className="text-xl font-bold text-[#1E3A8A] mb-2 text-center">
          北京科技大学
        </h1>
        <p className="text-sm text-[#6B7280] mb-8 text-center">
          研究生复试抽签系统
        </p>

        {/* 加载状态卡片 */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#6B7280] mb-2">
              <span>加载进度</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#1E40AF] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 当前步骤 */}
          <div className="flex items-center justify-center gap-2 text-sm text-[#374151]">
            <div className="w-5 h-5 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" 
                 style={{ animationDuration: '0.8s' }} />
            <span>{displayText}{dots}</span>
          </div>

          {/* 步骤指示器 */}
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: totalSteps + 1 }).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'bg-[#3B82F6] w-4'
                    : 'bg-[#E5E7EB]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 时间提示 */}
        <div className="mt-6 text-xs text-[#9CA3AF]">
          已用时: {formatTime(elapsedTime)}
        </div>

        {/* 超时提示 */}
        {showTimeout && elapsedTime > 10 && (
          <div className="mt-4 px-4 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg max-w-sm">
            <p className="text-sm text-[#92400E] text-center">
              网络连接较慢，请耐心等待...
            </p>
          </div>
        )}
      </div>

      {/* 底部版权 */}
      <div className="absolute bottom-6 text-xs text-[#9CA3AF]">
        北京科技大学研究生院 © 2024
      </div>
    </div>
  );
}

// 错误页面组件
interface ErrorScreenProps {
  error: string;
  onRetry: () => void;
}

export function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF]">
      <div className="flex flex-col items-center max-w-md w-full px-8">
        {/* 错误图标 */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg 
            className="w-10 h-10 text-red-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-[#111827] mb-2">加载失败</h2>
        <p className="text-sm text-[#6B7280] mb-6 text-center">{error}</p>

        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#2563EB] transition-colors shadow-sm"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
