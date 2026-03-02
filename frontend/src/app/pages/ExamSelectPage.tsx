// 考场选择页 - 用户登录后选择要进入的考场
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import { Calendar, MapPin, Users, Settings, User } from 'lucide-react';

interface ExamRoom {
  id: string;
  name: string;
  academy: string;
  date: string;
  time: string;
  location: string;
  total: number;
  completed: number;
  status: 'pending' | 'inProgress' | 'completed';
  supervisor: string;
  progress: number;
  drawn: number;
  waiting: number;
  absent: number;
}

const mockExamRooms: ExamRoom[] = [
  {
    id: '1',
    name: '机械工程专业复试',
    academy: '机械工程学院',
    date: '2024年3月15日',
    time: '09:00 - 17:00',
    location: '工程楼 A301',
    total: 35,
    completed: 12,
    status: 'inProgress',
    supervisor: '张三',
    progress: 34,
    drawn: 12,
    waiting: 23,
    absent: 0,
  },
  {
    id: '2',
    name: '电子信息专业复试',
    academy: '电子信息学院',
    date: '2024年3月16日',
    time: '09:00 - 17:00',
    location: '信息楼 B205',
    total: 42,
    completed: 0,
    status: 'pending',
    supervisor: '李四',
    progress: 0,
    drawn: 0,
    waiting: 42,
    absent: 0,
  },
  {
    id: '3',
    name: '计算机科学专业复试',
    academy: '计算机学院',
    date: '2024年3月14日',
    time: '09:00 - 17:00',
    location: '科技楼 C108',
    total: 38,
    completed: 38,
    status: 'completed',
    supervisor: '王五',
    progress: 100,
    drawn: 38,
    waiting: 0,
    absent: 0,
  },
];

export default function ExamSelectPage() {
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const getStatusLabel = (status: ExamRoom['status']) => {
    switch (status) {
      case 'pending':
        return '未开始';
      case 'inProgress':
        return '进行中';
      case 'completed':
        return '已结束';
    }
  };

  const getStatusType = (status: ExamRoom['status']) => {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'inProgress':
        return 'inProgress';
      case 'completed':
        return 'completed';
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-auto sm:h-20 py-4 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">考场管理</h1>
            <p className="text-xs sm:text-sm text-[#9CA3AF]">选择要进入的考场</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            <LotteryButton variant="secondary" onClick={() => navigate('/batch-manage')} className="flex-1 sm:flex-initial">
              <Calendar size={18} />
              <span className="hidden sm:inline">批次管理</span>
            </LotteryButton>
            <LotteryButton variant="secondary" onClick={() => navigate('/exam-config')} className="flex-1 sm:flex-initial">
              <Settings size={18} />
              <span className="hidden sm:inline">考场配置</span>
            </LotteryButton>
            <LotteryButton variant="secondary" onClick={() => navigate('/volunteer-manage')} className="flex-1 sm:flex-initial">
              <Users size={18} />
              <span className="hidden sm:inline">志愿者管理</span>
            </LotteryButton>
            <LotteryButton variant="secondary" onClick={() => navigate('/')} className="flex-1 sm:flex-initial">
              退出登录
            </LotteryButton>
          </div>
        </div>
      </div>

      {/* 考场卡片网格 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {mockExamRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`
                bg-white rounded-xl p-4 sm:p-6 text-left transition-all duration-200
                hover:shadow-lg active:scale-98
                ${
                  selectedRoom === room.id
                    ? 'border-2 border-[#3B82F6] shadow-lg'
                    : 'border-2 border-transparent hover:border-[#E5E7EB]'
                }
              `}
            >
              {/* 顶部：考场名称和状态 */}
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-[#111827] mb-1 truncate">{room.name}</h3>
                  <p className="text-xs sm:text-sm text-[#9CA3AF]">{room.academy}</p>
                </div>
                <span
                  className={`
                    flex-shrink-0 ml-2 px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                    ${
                      room.status === 'inProgress'
                        ? 'bg-[#D1FAE5] text-[#059669]'
                        : room.status === 'pending'
                        ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                        : 'bg-[#F3F4F6] text-[#6B7280]'
                    }
                  `}
                >
                  {room.status === 'inProgress' ? '进行中' : room.status === 'pending' ? '未开始' : '已结束'}
                </span>
              </div>

              {/* 信息行 */}
              <div className="space-y-2 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#4B5563]">
                  <Calendar size={14} className="text-[#9CA3AF] flex-shrink-0" />
                  <span className="truncate">{room.date}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#4B5563]">
                  <MapPin size={14} className="text-[#9CA3AF] flex-shrink-0" />
                  <span className="truncate">{room.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#4B5563]">
                  <Users size={14} className="text-[#9CA3AF] flex-shrink-0" />
                  <span>负责人：{room.supervisor}</span>
                </div>
              </div>

              {/* 环形进度图 */}
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#3B82F6"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${room.progress * 2.51} 251`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-xl sm:text-2xl font-bold text-[#111827]">{room.progress}%</div>
                    <div className="text-[10px] sm:text-xs text-[#9CA3AF]">已完成</div>
                  </div>
                </div>
              </div>

              {/* 人数统计 */}
              <div className="grid grid-cols-3 gap-2 text-center border-t border-[#E5E7EB] pt-3">
                <div>
                  <div className="text-base sm:text-lg font-bold text-[#059669]">{room.drawn}</div>
                  <div className="text-[10px] sm:text-xs text-[#9CA3AF]">已抽签</div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold text-[#D97706]">{room.waiting}</div>
                  <div className="text-[10px] sm:text-xs text-[#9CA3AF]">待抽签</div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold text-[#9CA3AF]">{room.absent}</div>
                  <div className="text-[10px] sm:text-xs text-[#9CA3AF]">缺考</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 底部操作按钮 - 移动端固定在底部 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E7EB] sm:relative sm:mt-6 sm:bg-transparent sm:border-0 sm:p-0 z-10">
          <LotteryButton
            fullWidth
            disabled={!selectedRoom}
            onClick={() => navigate('/lottery-console')}
            className="shadow-lg sm:shadow-none sm:max-w-md sm:mx-auto sm:block"
          >
            进入控制台
          </LotteryButton>
        </div>
        
        {/* 底部占位，防止内容被固定按钮遮挡 */}
        <div className="h-20 sm:hidden" />
      </div>
    </div>
  );
}