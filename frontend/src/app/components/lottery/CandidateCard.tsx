// 考生卡片组件 - Card/Candidate（72px高，圆角8px，含选中态左边框4px）
import React from 'react';
import { StatusTag, TagStatus } from './StatusTag';

export interface CandidateCardProps {
  id: string;
  name: string;
  idNumber: string; // 身份证后四位
  status: TagStatus;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CandidateCard({
  name,
  idNumber,
  status,
  isSelected = false,
  onClick,
}: CandidateCardProps) {
  // 姓名脱敏：首字加**
  const maskedName = name.charAt(0) + '**';

  return (
    <div
      onClick={onClick}
      className={`
        h-[72px] rounded-lg bg-white p-4 cursor-pointer
        transition-all duration-200
        flex items-center justify-between
        ${isSelected ? 'border-l-4 border-l-[#3B82F6] bg-[#EFF6FF]' : 'border border-[#E5E7EB] hover:bg-gray-50'}
      `}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-medium text-[#111827]">{maskedName}</span>
          <StatusTag status={status}>
            {status === 'pending' && '待抽签'}
            {status === 'completed' && '已抽签'}
            {status === 'absent' && '缺考'}
            {status === 'inProgress' && '进行中'}
          </StatusTag>
        </div>
        <span className="text-sm text-[#9CA3AF]">****{idNumber}</span>
      </div>
    </div>
  );
}
