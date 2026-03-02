// 时间范围选择器组件
import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimeRangePickerProps {
  value: string; // 格式: "09:00-12:00"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimeRangePicker({
  value,
  onChange,
  placeholder = '请选择时间范围',
  className = '',
}: TimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startHour, setStartHour] = useState<number>(9);
  const [startMinute, setStartMinute] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(12);
  const [endMinute, setEndMinute] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化已选值
  useEffect(() => {
    if (value && value.includes('-')) {
      const [start, end] = value.split('-');
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      
      setStartHour(startH);
      setStartMinute(startM);
      setEndHour(endH);
      setEndMinute(endM);
    }
  }, [value]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 小时列表 (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // 分钟列表 (0-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // 格式化时间为两位数
  const formatTime = (num: number) => num.toString().padStart(2, '0');

  // 确认选择
  const handleConfirm = () => {
    const startTime = `${formatTime(startHour)}:${formatTime(startMinute)}`;
    const endTime = `${formatTime(endHour)}:${formatTime(endMinute)}`;
    
    // 验证时间顺序
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    if (startMinutes >= endMinutes) {
      alert('结束时间必须晚于开始时间');
      return;
    }
    
    onChange(`${startTime}-${endTime}`);
    setIsOpen(false);
  };

  // 快速选择预设时间段
  const handlePresetTime = (preset: string) => {
    switch (preset) {
      case 'morning':
        setStartHour(9);
        setStartMinute(0);
        setEndHour(12);
        setEndMinute(0);
        break;
      case 'afternoon':
        setStartHour(14);
        setStartMinute(0);
        setEndHour(17);
        setEndMinute(0);
        break;
      case 'fullday':
        setStartHour(9);
        setStartMinute(0);
        setEndHour(17);
        setEndMinute(0);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 输入框 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-left flex items-center justify-between hover:border-[#3B82F6] transition-colors"
      >
        <span className={value ? 'text-[#111827]' : 'text-[#9CA3AF]'}>
          {value || placeholder}
        </span>
        <Clock size={18} className="text-[#9CA3AF]" />
      </button>

      {/* 下拉选择器 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 p-2 w-max min-w-full">
          
          {/* 时间选择器 - 居中显示 */}
          <div className="flex gap-2 justify-center">
            {/* 开始时间 */}
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1 text-center">开始时间</label>
              <div className="flex gap-1">
                {/* 开始小时 */}
                <div>
                  <label className="block text-[10px] text-[#9CA3AF] mb-0.5 text-center">时</label>
                  <div className="h-24 overflow-y-auto border border-[#E5E7EB] rounded scrollbar-hide w-12">
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => setStartHour(hour)}
                        className={`w-full px-1 py-0.5 text-xs text-center hover:bg-[#F3F4F6] transition-colors ${
                          startHour === hour
                            ? 'bg-[#EFF6FF] text-[#3B82F6] font-medium'
                            : 'text-[#374151]'
                        }`}
                      >
                        {formatTime(hour)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 开始分钟 */}
                <div>
                  <label className="block text-[10px] text-[#9CA3AF] mb-0.5 text-center">分</label>
                  <div className="h-24 overflow-y-auto border border-[#E5E7EB] rounded scrollbar-hide w-12">
                    {minutes.map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => setStartMinute(minute)}
                        className={`w-full px-1 py-0.5 text-xs text-center hover:bg-[#F3F4F6] transition-colors ${
                          startMinute === minute
                            ? 'bg-[#EFF6FF] text-[#3B82F6] font-medium'
                            : 'text-[#374151]'
                        }`}
                      >
                        {formatTime(minute)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 分隔符 */}
            <div className="flex items-center pt-4">
              <span className="text-[#9CA3AF] text-xs">至</span>
            </div>

            {/* 结束时间 */}
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1 text-center">结束时间</label>
              <div className="flex gap-1">
                {/* 结束小时 */}
                <div>
                  <label className="block text-[10px] text-[#9CA3AF] mb-0.5 text-center">时</label>
                  <div className="h-24 overflow-y-auto border border-[#E5E7EB] rounded scrollbar-hide w-12">
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => setEndHour(hour)}
                        className={`w-full px-1 py-0.5 text-xs text-center hover:bg-[#F3F4F6] transition-colors ${
                          endHour === hour
                            ? 'bg-[#EFF6FF] text-[#3B82F6] font-medium'
                            : 'text-[#374151]'
                        }`}
                      >
                        {formatTime(hour)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 结束分钟 */}
                <div>
                  <label className="block text-[10px] text-[#9CA3AF] mb-0.5 text-center">分</label>
                  <div className="h-24 overflow-y-auto border border-[#E5E7EB] rounded scrollbar-hide w-12">
                    {minutes.map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => setEndMinute(minute)}
                        className={`w-full px-1 py-0.5 text-xs text-center hover:bg-[#F3F4F6] transition-colors ${
                          endMinute === minute
                            ? 'bg-[#EFF6FF] text-[#3B82F6] font-medium'
                            : 'text-[#374151]'
                        }`}
                      >
                        {formatTime(minute)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 预览 */}
          <div className="mt-2 p-1 bg-[#F3F4F6] rounded text-center text-xs text-[#374151]">
            {formatTime(startHour)}:{formatTime(startMinute)} - {formatTime(endHour)}:{formatTime(endMinute)}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-1.5 pt-1.5 border-t border-[#E5E7EB] mt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-1.5 text-xs text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-3 py-1.5 text-xs text-white bg-[#3B82F6] rounded-lg hover:bg-[#1E40AF] transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}