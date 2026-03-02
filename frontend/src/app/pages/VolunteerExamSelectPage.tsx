// 志愿者端 - 分组选择页（按志愿者有权限的分组展示）
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import { Calendar, MapPin, Users, User, LogOut, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as examRoomStorage from '../../storage/examRoomStorage';
import * as volunteerStorage from '../../storage/volunteerStorage';
import * as groupStorage from '../../storage/groupStorage';
import * as candidateStorage from '../../storage/candidateStorage';
const logoImage = '/logo.png';

export default function VolunteerExamSelectPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    setCurrentUser,
    setSelectedExamRoom,
    setSelectedGroup,
  } = useAppContext();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [assignedGroups, setAssignedGroups] = useState<groupStorage.Group[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // 检查是否已登录
    if (!currentUser || currentUser.role !== 'volunteer') {
      navigate('/');
      return;
    }

    // 加载志愿者被分配的分组
    loadAssignedGroups();
  }, [currentUser, navigate]);

  // 定时更新当前时间，用于实时计算状态
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每分钟更新一次

    return () => clearInterval(timer);
  }, []);

  const loadAssignedGroups = () => {
    if (!currentUser) return;

    // 获取当前志愿者信息
    const volunteer = volunteerStorage.getVolunteerById(currentUser.id);
    if (!volunteer) {
      setAssignedGroups([]);
      return;
    }

    // 获取志愿者被分配到的所有分组
    const groups = groupStorage.getGroupsByVolunteerId(volunteer.id);

    // 按日期和时间排序
    groups.sort((a, b) => {
      const dateTimeA = new Date(`${a.date} ${a.time}`);
      const dateTimeB = new Date(`${b.date} ${b.time}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });

    setAssignedGroups(groups);
  };

  // 计算分组状态
  const getGroupStatus = (group: groupStorage.Group): 'pending' | 'inProgress' | 'completed' => {
    // 解析日期和时间
    const parseDateTime = (dateStr: string, timeStr: string) => {
      // 支持 YYYY-MM-DD 和 YYYY/M/D 格式
      const dateParts = dateStr.replace(/\//g, '-').split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // 月份从0开始
      const day = parseInt(dateParts[2]);

      // 解析时间 HH:mm
      const timeParts = timeStr.split(':');
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);

      return new Date(year, month, day, hour, minute);
    };

    const now = currentTime;
    const groupStartDateTime = parseDateTime(group.date, group.time);
    const groupEndDateTime = parseDateTime(group.date, group.endTime || group.time);

    // 如果当前时间 > 结束时间，则为已结束
    if (now > groupEndDateTime) {
      return 'completed';
    }

    // 如果当前时间 >= 开始时间，且 <= 结束时间，则为进行中
    if (now >= groupStartDateTime && now <= groupEndDateTime) {
      return 'inProgress';
    }

    // 否则为未开始
    return 'pending';
  };

  // 计算每个分组的统计数据
  const getGroupStats = (groupId: string) => {
    const candidates = candidateStorage.getCandidatesByGroupId(groupId);

    const drawn = candidates.filter(c => c.status === 'drawn').length;
    const waiting = candidates.filter(c => c.status === 'waiting').length;
    const absent = candidates.filter(c => c.status === 'absent').length;
    const total = candidates.length;

    // 已完成 = 已抽签 + 缺考，即排除掉待抽签的都算完成
    const completed = drawn + absent;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { drawn, waiting, absent, total, completed, progress };
  };

  const getStatusLabel = (status: 'pending' | 'inProgress' | 'completed') => {
    switch (status) {
      case 'pending':
        return '未开始';
      case 'inProgress':
        return '进行中';
      case 'completed':
        return '已结束';
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  const handleEnterGroup = () => {
    const group = assignedGroups.find((g) => g.id === selectedGroupId);
    if (!group) return;

    // 获取分组对应的考场信息
    const examRoom = examRoomStorage.getExamRoomById(group.examRoomId);
    if (examRoom) {
      setSelectedExamRoom(examRoom);
      // 传递分组信息到抽签控制台
      setSelectedGroup(group);
      navigate('/lottery-console');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <img
              src={logoImage}
              alt="USTB Logo"
              className="h-7 sm:h-9 w-auto"
              style={{ filter: 'brightness(0)' }}
            />
            <div className="h-6 sm:h-8 w-px bg-[#E5E7EB]"></div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-[#111827]">志愿者工作台</h1>
              <p className="text-xs text-[#9CA3AF] hidden sm:block">选择要进入的分组</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
              <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white text-xs font-medium">
                志
              </div>
              <span className="text-xs text-[#059669] font-medium hidden sm:inline">{currentUser?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">退出登录</span>
            </button>
          </div>
        </div>
      </div>

      {/* 分组卡片网格 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {assignedGroups.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <Users size={64} className="mx-auto text-[#D1D5DB] mb-4" />
            <p className="text-lg text-[#9CA3AF] mb-2">暂无分配的分组</p>
            <p className="text-sm text-[#D1D5DB]">请联系管理员分配分组权限</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {assignedGroups.map((group) => {
              const stats = getGroupStats(group.id);
              const status = getGroupStatus(group);
              const examRoom = examRoomStorage.getExamRoomById(group.examRoomId);

              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`bg-white rounded-xl shadow-sm border-2 p-6 text-left transition-all hover:shadow-lg ${selectedGroupId === group.id
                    ? 'border-[#3B82F6] bg-[#EFF6FF]'
                    : 'border-[#E5E7EB] hover:border-[#9CA3AF]'
                    }`}
                >
                  {/* 分组状态标签 */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${status === 'pending'
                        ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                        : status === 'inProgress'
                          ? 'bg-[#D1FAE5] text-[#059669] animate-pulse'
                          : 'bg-[#F3F4F6] text-[#6B7280]'
                        }`}
                    >
                      {getStatusLabel(status)}
                    </span>
                    {selectedGroupId === group.id && (
                      <div className="w-6 h-6 rounded-full bg-[#3B82F6] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M13.3334 4L6.00002 11.3333L2.66669 8"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* 分组信息 */}
                  <h3 className="text-lg font-bold text-[#111827] mb-1 line-clamp-2">
                    {group.name}
                  </h3>
                  <p className="text-sm text-[#9CA3AF] mb-4">{group.batchName}</p>

                  {/* 分组详情 */}
                  <div className="space-y-2 mb-4 pb-4 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Calendar size={14} className="text-[#9CA3AF]" />
                      {group.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Clock size={14} className="text-[#9CA3AF]" />
                      {group.endTime ? `${group.time}-${group.endTime}` : group.time}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <MapPin size={14} className="text-[#9CA3AF]" />
                      {examRoom?.name || group.examRoomName || '未指定考场'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Users size={14} className="text-[#9CA3AF]" />
                      考生 {stats.total} 人
                    </div>
                  </div>

                  {/* 进度统计 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#9CA3AF]">完成进度</span>
                      <span className="font-semibold text-[#111827]">
                        {stats.completed}/{stats.total}
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] transition-all duration-500"
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                      <span>待抽签: {stats.waiting}人</span>
                      <span>缺考: {stats.absent}人</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 进入按钮 */}
        {selectedGroupId && (() => {
          const selectedGroup = assignedGroups.find((g) => g.id === selectedGroupId);
          const examRoom = selectedGroup ? examRoomStorage.getExamRoomById(selectedGroup.examRoomId) : null;

          return (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] p-4 sm:p-6 shadow-lg z-10">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center text-white font-bold flex-shrink-0">
                    {selectedGroup?.batchName?.slice(0, 2) || '分'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#111827] truncate">
                      {selectedGroup?.name || ''}
                    </div>
                    <div className="text-sm text-[#9CA3AF] truncate">
                      {examRoom?.name || selectedGroup?.examRoomName || ''}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <LotteryButton
                    variant="secondary"
                    onClick={() => setSelectedGroupId(null)}
                    className="flex-1 sm:flex-initial"
                  >
                    取消
                  </LotteryButton>
                  <LotteryButton onClick={handleEnterGroup} className="flex-1 sm:flex-initial">
                    进入抽签控制台
                  </LotteryButton>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 帮助提示 */}
      {!selectedGroupId && assignedGroups.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#1E40AF] mb-2">
              使用说明
            </h3>
            <ul className="space-y-2 text-sm text-[#1E40AF]">
              <li>• 点击选择您需要协助的分组</li>
              <li>• 状态说明：开始时间前2小时为"进中"，开始时间后为"已结束"，其他为"未开始"</li>
              <li>• 点击"进入抽签控制台"开始工作</li>
              <li>• 在控制台中可以进行考生抽签、标记缺考等操作</li>
              <li>• 如有问题请联系考场负责老师</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}