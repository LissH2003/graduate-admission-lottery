// 环形进度条组件 - SVG（直径120px，中央显示百分比）
import React from 'react';

interface CircularProgressProps {
  percentage: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({ percentage, size = 120, strokeWidth = 8 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10B981"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {/* 中央百分比文字 */}
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-[#111827]">{percentage}%</span>
        <span className="text-xs text-[#9CA3AF]">完成率</span>
      </div>
    </div>
  );
}
