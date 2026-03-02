// 状态标签组件 - Tag/Status（四种：amber待抽签/green已抽签/red缺考/blue进行中）
import React from 'react';

export type TagStatus = 'pending' | 'completed' | 'absent' | 'inProgress';

interface StatusTagProps {
  status: TagStatus;
  children: React.ReactNode;
  className?: string;
}

export function StatusTag({ status, children, className = '' }: StatusTagProps) {
  const statusStyles = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    absent: 'bg-red-100 text-red-800 border-red-300',
    inProgress: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${statusStyles[status]} ${className}`}
    >
      {children}
    </span>
  );
}
