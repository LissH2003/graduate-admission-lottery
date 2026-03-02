// 日期时间选择器组件
import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // 格式: "2024-03" 或 "2024-03-15"
  onChange: (value: string) => void;
  type?: 'month' | 'date';
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  type = 'month',
  placeholder = '请选择日期',
  className = '',
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化已选值
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      setSelectedYear(parseInt(parts[0]));
      setSelectedMonth(parseInt(parts[1]));
      if (parts.length > 2) {
        setSelectedDay(parseInt(parts[2]));
      }
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

  // 生成年份列表 (当前年份前后各5年)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // 月份列表
  const months = [
    { value: 1, label: '1月' },
    { value: 2, label: '2月' },
    { value: 3, label: '3月' },
    { value: 4, label: '4月' },
    { value: 5, label: '5月' },
    { value: 6, label: '6月' },
    { value: 7, label: '7月' },
    { value: 8, label: '8月' },
    { value: 9, label: '9月' },
    { value: 10, label: '10月' },
    { value: 11, label: '11月' },
    { value: 12, label: '12月' },
  ];

  // 获取某月的天数
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // 生成日期列表
  const days = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, i) => i + 1
  );

  // 格式化显示值
  const getDisplayValue = () => {
    if (!value) return '';
    
    if (type === 'month') {
      const [year, month] = value.split('-');
      return `${year}年${parseInt(month)}月`;
    } else {
      const [year, month, day] = value.split('-');
      return `${year}年${parseInt(month)}月${parseInt(day)}日`;
    }
  };

  // 确认选择
  const handleConfirm = () => {
    const monthStr = selectedMonth.toString().padStart(2, '0');
    
    if (type === 'month') {
      onChange(`${selectedYear}-${monthStr}`);
    } else {
      const dayStr = selectedDay.toString().padStart(2, '0');
      onChange(`${selectedYear}-${monthStr}-${dayStr}`);
    }
    
    setIsOpen(false);
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
          {getDisplayValue() || placeholder}
        </span>
        <CalendarIcon size={18} className="text-[#9CA3AF]" />
      </button>

      {/* 下拉选择器 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 p-4">
          <div className="flex gap-3 mb-4">
            {/* 年份选择 */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#6B7280] mb-2">年份</label>
              <div className="max-h-48 overflow-y-auto border border-[#E5E7EB] rounded-lg scrollbar-hide">
                {years.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setSelectedYear(year)}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-[#F3F4F6] transition-colors ${
                      selectedYear === year
                        ? 'bg-[#EFF6FF] text-[#3B82F6] font-medium'
                        : 'text-[#374151]'
                    }`}
                  >
                    {year}年
                  </button>
                ))}
              </div>
            </div>

            {/* 月份选择 */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#6B7280] mb-2">月份</label>
              <div className="max-h-48 overflow-y-auto border border-[#E5E7EB] rounded-lg scrollbar-hide">
                {months.map((month) => (
                  <button
                    key={month.value}
                    type="button"
                    onClick={() => setSelectedMonth(month.value)}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-[#F3F4F6] transition-colors ${
                      selectedMonth === month.value
                        ? 'bg-[#EFF6FF] text-[#3B82F6] font-medium'
                        : 'text-[#374151]'
                    }`}
                  >
                    {month.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 日期选择（仅在 type='date' 时显示） */}
            {type === 'date' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#6B7280] mb-2">日期</label>
                <div className="max-h-48 overflow-y-auto border border-[#E5E7EB] rounded-lg scrollbar-hide">
                  {days.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-[#F3F4F6] transition-colors ${
                        selectedDay === day
                          ? 'bg-[#EFF6FF] text-[#3B82F6] font-medium'
                          : 'text-[#374151]'
                      }`}
                    >
                      {day}日
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 text-sm text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 text-sm text-white bg-[#3B82F6] rounded-lg hover:bg-[#1E40AF] transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}