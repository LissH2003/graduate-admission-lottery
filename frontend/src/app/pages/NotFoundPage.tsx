// 404 页面
import React from 'react';

export default function NotFoundPage() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#111827] mb-4">404</h1>
        <p className="text-xl text-[#9CA3AF] mb-8">页面未找到</p>
        <a href="/" className="text-[#3B82F6] hover:underline">
          返回首页
        </a>
      </div>
    </div>
  );
}
