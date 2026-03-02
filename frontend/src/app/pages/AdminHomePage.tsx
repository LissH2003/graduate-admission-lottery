// 管理员主页 - 功能导航中心
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import {
  Calendar,
  Settings,
  Users,
  Building2,
  LogOut,
  Shield,
  TrendingUp,
  Download,
  Eye,
  X,
  Play,
  ArrowRight,
  StopCircle,
  Search,
} from 'lucide-react';
import * as batchStorage from '../../storage/batchStorage';
import * as groupStorage from '../../storage/groupStorage';
import * as candidateStorage from '../../storage/candidateStorage';
import * as examRoomStorage from '../../storage/examRoomStorage';
import * as volunteerStorage from '../../storage/volunteerStorage';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';
const logoImage = '/logo.png';

export default function AdminHomePage() {
  const navigate = useNavigate();
  const { setSelectedGroup } = useAppContext();

  // 实时统计数据状态
  const [stats, setStats] = useState({
    batchCount: 0,
    groupCount: 0,
    candidateCount: 0,
    activeExamRooms: 0,
  });

  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<examRoomStorage.ExamRoom | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEndBatchConfirm, setShowEndBatchConfirm] = useState(false);
  const [selectedEndGroup, setSelectedEndGroup] = useState<groupStorage.Group | null>(null);
  const [examRoomSearch, setExamRoomSearch] = useState(''); // 考场搜索关键词
  const [showHistoryModal, setShowHistoryModal] = useState(false); // 历史场次弹窗
  const [historyBatchSearch, setHistoryBatchSearch] = useState(''); // 历史批次搜索关键词
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null); // 展开的批次ID

  // 获取今天的日期字符串（格式：YYYY-MM-DD）
  const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // 检查分组是否是今天的批次
  const isTodayGroup = (group: groupStorage.Group): boolean => {
    // 直接比较分组的 date 字段和今天的日期
    if (!group.date) return false;

    // 标准化日期格式（处理 YYYY/M/D 和 YYYY-MM-DD 两种格式）
    const groupDate = group.date.replace(/\//g, '-');
    const todayStr = getTodayString();

    return groupDate === todayStr;
  };

  // 加载实时统计数据
  useEffect(() => {
    loadStats();

    // 设置定时器，每5秒刷新一次数据
    const interval = setInterval(() => {
      loadStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = () => {
    const batches = batchStorage.getAllBatches();
    const groups = groupStorage.getAllGroups();
    const candidates = candidateStorage.getAllCandidates();
    const examRooms = examRoomStorage.getAllExamRooms();

    setStats({
      batchCount: batches.length,
      groupCount: groups.length,
      candidateCount: candidates.length,
      activeExamRooms: examRooms.filter(room => room.status === 'active').length,
    });

    // 更新最后刷新时间
    const now = new Date();
    setLastUpdateTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const statsDisplay = [
    { label: '当前批次', value: stats.batchCount.toString(), trend: '', color: 'text-[#3B82F6]' },
    { label: '总分组数', value: stats.groupCount.toString(), trend: '', color: 'text-[#059669]' },
    { label: '总考生数', value: stats.candidateCount.toString(), trend: '', color: 'text-[#D97706]' },
    { label: '启用考场', value: stats.activeExamRooms.toString(), trend: '', color: 'text-[#DC2626]' },
  ];

  const modules = [
    {
      title: '批次及分组管理',
      description: '创建和管理面试批次及分组',
      icon: Calendar,
      color: 'from-[#3B82F6] to-[#1E40AF]',
      route: '/batch-manage',
    },
    {
      title: '考场配置',
      description: '配置考场信息和参数',
      icon: Settings,
      color: 'from-[#059669] to-[#047857]',
      route: '/exam-config',
    },
    {
      title: '志愿者管理',
      description: '管理志愿者和权限分配',
      icon: Users,
      color: 'from-[#D97706] to-[#B45309]',
      route: '/volunteer-manage',
    },
  ];

  // 计算考场完成进度（只统计今天的批次）
  const calculateRoomProgress = (roomId: string) => {
    const roomGroups = groupStorage.getGroupsByExamRoomId(roomId);

    // 只过滤出今天的分组
    const todayGroups = roomGroups.filter(isTodayGroup);

    let totalCandidates = 0;
    let drawnCandidates = 0;
    let absentCandidates = 0;
    let waitingCandidates = 0;

    todayGroups.forEach((group) => {
      const groupCandidates = candidateStorage.getCandidatesByGroupId(group.id);
      totalCandidates += groupCandidates.length;
      drawnCandidates += groupCandidates.filter(c => c.status === 'drawn').length;
      absentCandidates += groupCandidates.filter(c => c.status === 'absent').length;
      waitingCandidates += groupCandidates.filter(c => c.status === 'waiting').length;
    });

    // 已完成 = 已抽签 + 缺考，即排除掉待抽签的都算完成
    const completedCandidates = drawnCandidates + absentCandidates;
    const percentage = totalCandidates > 0 ? Math.round((completedCandidates / totalCandidates) * 100) : 0;

    return {
      totalCandidates,
      drawnCandidates,
      absentCandidates,
      waitingCandidates,
      completedCandidates,
      percentage,
    };
  };

  // 查看考场详情
  const handleViewRoomDetail = (room: examRoomStorage.ExamRoom) => {
    setSelectedRoom(room);
    setShowDetailModal(true);
  };

  // 下载考场数据
  const handleDownloadRoomData = (room: examRoomStorage.ExamRoom) => {
    const roomGroups = groupStorage.getGroupsByExamRoomId(room.id);

    if (roomGroups.length === 0) {
      alert('该考场没有分组数据');
      return;
    }

    const exportData: any[] = [];

    roomGroups.forEach((group) => {
      const groupCandidates = candidateStorage.getCandidatesByGroupId(group.id);

      // 获取该分组的志愿者名单
      const volunteerNames = (group.volunteerIds || [])
        .map(id => {
          const volunteer = volunteerStorage.getVolunteerById(id);
          return volunteer?.name;
        })
        .filter(Boolean)
        .join('、') || '未配置';

      groupCandidates.forEach((candidate) => {
        // 状态转换
        let status = '待抽签';
        if (candidate.status === 'drawn') status = '已抽签';
        else if (candidate.status === 'absent') status = '缺考';

        exportData.push({
          '考场名称': room.name,
          '分组名称': group.name,
          '面试日期': group.date || '',
          '面试时间': group.endTime ? `${group.time}-${group.endTime}` : group.time || '',
          '姓名': candidate.name,
          '身份证号': candidate.idCard,
          '报名编号': candidate.registrationNo || '',
          '考生': candidate.candidateNo || '',
          '手机号': candidate.phone || '',
          '抽签状态': status,
          '签号': candidate.drawnNumber || '',
          '志愿者': volunteerNames,
        });
      });
    });

    if (exportData.length === 0) {
      alert('该考场没有考生数据');
      return;
    }

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    const colWidths = [
      { wch: 20 }, // 考场名称
      { wch: 25 }, // 分组名称
      { wch: 12 }, // 面试日期
      { wch: 12 }, // 面试时间
      { wch: 10 }, // 姓名
      { wch: 20 }, // 身份证号
      { wch: 15 }, // 报名编号
      { wch: 15 }, // 考生号
      { wch: 12 }, // 手机号
      { wch: 10 }, // 抽签状态
      { wch: 10 }, // 签号
      { wch: 20 }, // 志愿者
    ];
    worksheet['!cols'] = colWidths;

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '考场数据');

    // 生成文件名
    const fileName = `${room.name}_考场数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;

    // 导出文件
    XLSX.writeFile(workbook, fileName);
  };

  // 结束批次
  const handleEndBatch = (group: groupStorage.Group) => {
    setSelectedEndGroup(group);
    setShowEndBatchConfirm(true);
  };

  const confirmEndBatch = () => {
    if (!selectedEndGroup) return;

    // 只清空该分组的志愿者权限，不重置考生状态
    groupStorage.updateGroup(selectedEndGroup.id, {
      volunteerIds: [],
    });

    // 关闭弹窗并刷新数据
    setShowEndBatchConfirm(false);
    setSelectedEndGroup(null);
    loadStats();
  };

  // 计算分组状态（根据当前时间和预定时间）
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

    const now = new Date();
    const groupStartDateTime = parseDateTime(group.date, group.time);
    const groupEndDateTime = parseDateTime(group.date, group.endTime || group.time);

    // 调试信息
    console.log('=== 分组状态计算 ===');
    console.log('分组名称:', group.name);
    console.log('分组日期:', group.date);
    console.log('开始时间字符串:', group.time);
    console.log('结束时间字符串:', group.endTime);
    console.log('当前时间:', now.toLocaleString('zh-CN'));
    console.log('解析后的开始时间:', groupStartDateTime.toLocaleString('zh-CN'));
    console.log('解析后的结束时间:', groupEndDateTime.toLocaleString('zh-CN'));
    console.log('now > groupEndDateTime:', now > groupEndDateTime);
    console.log('now >= groupStartDateTime:', now >= groupStartDateTime);
    console.log('now <= groupEndDateTime:', now <= groupEndDateTime);

    // 如果当前时间 > 结束时间，则为已结束
    if (now > groupEndDateTime) {
      console.log('判断结果: 已结束');
      return 'completed';
    }

    // 如果当前时间 >= 开始时间，且 <= 结束时间，则为进行中
    if (now >= groupStartDateTime && now <= groupEndDateTime) {
      console.log('判断结果: 进行中');
      return 'inProgress';
    }

    // 否则为未开始
    console.log('判断结果: 未开始');
    return 'pending';
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

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={logoImage}
              alt="USTB Logo"
              className="h-9 w-auto"
              style={{ filter: 'brightness(0)' }}
            />
            <div className="h-8 w-px bg-[#E5E7EB]"></div>
            <div>
              <h1 className="text-xl font-bold text-[#111827]">管理员控制台</h1>
              <p className="text-xs text-[#9CA3AF]">研究生复试抽签系统</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center text-white text-xs font-medium">
                管
              </div>
              <span className="text-xs text-[#1E40AF] font-medium">级管理</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <LogOut size={14} />
              退出登录
            </button>
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="max-w-7xl mx-auto p-6">
        {/* 管理功能快捷入口 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => navigate('/batch-manage')}
            className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Calendar size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#111827] mb-0.5">
                  批次及分组管理
                </h3>
                <p className="text-xs text-[#9CA3AF]">创建和管理抽签批次及分组</p>
                <div className="mt-1 text-xs text-[#3B82F6] font-medium">
                  当前批次: {stats.batchCount}
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/exam-config')}
            className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Building2 size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#111827] mb-0.5">
                  考场配置
                </h3>
                <p className="text-xs text-[#9CA3AF]">设置考场信息和安排</p>
                <div className="mt-1 text-xs text-[#10B981] font-medium">
                  活跃考场: {stats.activeExamRooms}
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/volunteer-manage')}
            className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Users size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#111827] mb-0.5">
                  志愿者管理
                </h3>
                <p className="text-xs text-[#9CA3AF]">管理志愿者账号和权限</p>
                <div className="mt-1 text-xs text-[#F59E0B] font-medium">
                  查看详情 →
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* 考场实时状态 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-[#3B82F6]" />
              <h3 className="text-lg font-bold text-[#111827]">考场实时状态</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-sm text-[#3B82F6] hover:underline"
                onClick={() => navigate('/exam-config')}
              >
                管理考场
              </button>
              <span className="text-[#E5E7EB]">|</span>
              <button
                className="text-sm text-[#3B82F6] hover:underline"
                onClick={() => setShowHistoryModal(true)}
              >
                查看历史场次
              </button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="搜索考场名称或地点..."
                value={examRoomSearch}
                onChange={(e) => setExamRoomSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>

          {/* 考场列表（可滚动） */}
          <div
            className="max-h-[600px] overflow-y-auto space-y-3 pr-2"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#fff #F9FAFB'
            }}
          >
            {(() => {
              // 获取所有考场，过滤出有当天批次的考场，并支持搜索
              const allExamRooms = examRoomStorage.getAllExamRooms()
                .filter(room => {
                  // 先进行搜索过滤
                  if (examRoomSearch) {
                    const searchLower = examRoomSearch.toLowerCase();
                    if (!room.name.toLowerCase().includes(searchLower) &&
                      !room.location.toLowerCase().includes(searchLower)) {
                      return false;
                    }
                  }

                  // 检查该考场是否有当天的分组
                  const roomGroups = groupStorage.getGroupsByExamRoomId(room.id);
                  const hasTodayGroup = roomGroups.some(isTodayGroup);

                  return hasTodayGroup;
                });

              if (allExamRooms.length === 0) {
                return (
                  <div className="text-center py-8 text-[#9CA3AF]">
                    <Building2 size={48} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {examRoomSearch ? '未找到匹配的考场' : '今日暂无考场安排'}
                    </p>
                    {!examRoomSearch && (
                      <button
                        onClick={() => navigate('/exam-config')}
                        className="mt-3 text-sm text-[#3B82F6] hover:underline"
                      >
                        前往考场管理
                      </button>
                    )}
                  </div>
                );
              }

              return allExamRooms.map((room) => {
                // 只统计今天的分组和考生
                const allRoomGroups = groupStorage.getGroupsByExamRoomId(room.id);
                const todayRoomGroups = allRoomGroups.filter(isTodayGroup);
                const totalCandidates = todayRoomGroups.reduce((sum, group) => sum + group.candidateCount, 0);
                const progress = calculateRoomProgress(room.id);

                return (
                  <div
                    key={room.id}
                    className="bg-[#F9FAFB] rounded-lg p-4 hover:bg-[#F3F4F6] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full ${room.status === 'active' ? 'bg-[#10B981] animate-pulse' : 'bg-[#9CA3AF]'
                          }`}></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[#111827]">
                              {room.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${room.status === 'active'
                                ? 'bg-[#D1FAE5] text-[#059669]'
                                : 'bg-[#F3F4F6] text-[#6B7280]'
                              }`}>
                              {room.status === 'active' ? '启用' : '禁用'}
                            </span>
                          </div>
                          <p className="text-xs text-[#9CA3AF]">{room.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-sm font-bold text-[#3B82F6]">{todayRoomGroups.length}</div>
                          <div className="text-xs text-[#9CA3AF]">分组数</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#059669]">{totalCandidates}</div>
                          <div className="text-xs text-[#9CA3AF]">考生数</div>
                        </div>
                      </div>
                    </div>

                    {/* 完成进度 */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[#6B7280]">完成进度</span>
                        <span className="text-xs font-medium text-[#111827]">
                          {progress.completedCandidates}/{progress.totalCandidates} ({progress.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#3B82F6] to-[#10B981] transition-all duration-500"
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewRoomDetail(room)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-[#3B82F6] bg-white border border-[#BFDBFE] rounded-lg hover:bg-[#EFF6FF] transition-colors"
                      >
                        <Eye size={14} />
                        查看详情
                      </button>
                      <button
                        onClick={() => handleDownloadRoomData(room)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-[#059669] bg-white border border-[#BBF7D0] rounded-lg hover:bg-[#F0FDF4] transition-colors"
                      >
                        <Download size={14} />
                        下载数据
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* 考场详情弹窗 */}
      {showDetailModal && selectedRoom && (() => {
        const allRoomGroups = groupStorage.getGroupsByExamRoomId(selectedRoom.id);
        // 只显示今天的分组
        const roomGroups = allRoomGroups.filter(isTodayGroup);
        const progress = calculateRoomProgress(selectedRoom.id);

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
                <div>
                  <h3 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                    <Building2 size={24} className="text-[#3B82F6]" />
                    {selectedRoom.name}
                  </h3>
                  <p className="text-sm text-[#9CA3AF] mt-1">{selectedRoom.location}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedRoom(null);
                  }}
                  className="text-[#9CA3AF] hover:text-[#111827] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* 统计概览 */}
              <div className="px-6 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#3B82F6]">{roomGroups.length}</div>
                    <div className="text-xs text-[#9CA3AF] mt-1">分组总数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#059669]">{progress.totalCandidates}</div>
                    <div className="text-xs text-[#9CA3AF] mt-1">考生总数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#10B981]">{progress.drawnCandidates}</div>
                    <div className="text-xs text-[#9CA3AF] mt-1">已抽签</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#F59E0B]">{progress.waitingCandidates}</div>
                    <div className="text-xs text-[#9CA3AF] mt-1">待抽签</div>
                  </div>
                </div>

                {/* 完成进度条 */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B7280]">整体完成进度</span>
                    <span className="text-sm font-bold text-[#111827]">{progress.percentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#3B82F6] to-[#10B981] transition-all duration-500"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* 分组列表 */}
              <div className="flex-1 overflow-y-auto p-6">
                <h4 className="text-sm font-bold text-[#111827] mb-4">分组详情</h4>
                <div className="space-y-3">
                  {roomGroups.length === 0 ? (
                    <div className="text-center py-12 text-[#9CA3AF]">
                      <Building2 size={48} className="mx-auto mb-2 opacity-30" />
                      <p>该考场暂无分组</p>
                    </div>
                  ) : (
                    roomGroups.map((group) => {
                      const groupCandidates = candidateStorage.getCandidatesByGroupId(group.id);
                      const groupDrawn = groupCandidates.filter(c => c.status === 'drawn').length;
                      const groupAbsent = groupCandidates.filter(c => c.status === 'absent').length;
                      const groupWaiting = groupCandidates.filter(c => c.status === 'waiting').length;
                      const groupTotal = groupCandidates.length;
                      const groupCompleted = groupDrawn + groupAbsent;
                      const groupProgress = groupTotal > 0 ? Math.round((groupCompleted / groupTotal) * 100) : 0;

                      // 获取志愿者信息
                      const volunteerNames = (group.volunteerIds || [])
                        .map(id => {
                          const volunteer = volunteerStorage.getVolunteerById(id);
                          return volunteer?.name;
                        })
                        .filter(Boolean)
                        .join('、') || '未配置';

                      // 获取分组状态
                      const groupStatus = getGroupStatus(group);

                      // 计算状态样式
                      const statusClassName = groupStatus === 'pending'
                        ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                        : groupStatus === 'inProgress'
                          ? 'bg-[#D1FAE5] text-[#059669]'
                          : 'bg-[#F3F4F6] text-[#6B7280]';

                      return (
                        <div key={group.id} className="bg-[#F9FAFB] rounded-lg p-4 hover:bg-[#F3F4F6] transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-sm font-bold text-[#111827]">{group.name}</h5>
                                {/* 分组状态标签 */}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClassName}`}>
                                  {getStatusLabel(groupStatus)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGroup(group);
                                    navigate('/lottery-console');
                                  }}
                                  className="flex items-center justify-center w-6 h-6 rounded-full bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors"
                                  title="快速抽签"
                                >
                                  <Play size={12} />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B7280]">
                                <span>📅 {group.date || '未设置'}</span>
                                <span>🕐 {group.endTime ? `${group.time}-${group.endTime}` : group.time || '未设置'}</span>
                                <span>👥 志愿者: {volunteerNames}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <div className="text-sm font-bold text-[#3B82F6]">{groupTotal}</div>
                                <div className="text-xs text-[#9CA3AF]">考生数</div>
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[#10B981]">{groupDrawn}</div>
                                <div className="text-xs text-[#9CA3AF]">已抽签</div>
                              </div>
                            </div>
                          </div>

                          {/* 分组进度条 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[#6B7280]">完成进度</span>
                              <span className="text-xs font-medium text-[#111827]">{groupProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#10B981]"
                                style={{ width: `${groupProgress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* 考生状态统计 */}
                          <div className="mt-3 pt-3 border-t border-[#E5E7EB] grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center px-2 py-1 bg-white rounded">
                              <span className="text-[#10B981] font-bold">{groupDrawn}</span>
                              <span className="text-[#9CA3AF] ml-1">已抽签</span>
                            </div>
                            <div className="text-center px-2 py-1 bg-white rounded">
                              <span className="text-[#F59E0B] font-bold">{groupWaiting}</span>
                              <span className="text-[#9CA3AF] ml-1">待抽签</span>
                            </div>
                            <div className="text-center px-2 py-1 bg-white rounded">
                              <span className="text-[#DC2626] font-bold">{groupAbsent}</span>
                              <span className="text-[#9CA3AF] ml-1">缺考</span>
                            </div>
                          </div>

                          {/* 结束批次按钮 - 仅在未开始和进行中时显示 */}
                          {(groupStatus === 'pending' || groupStatus === 'inProgress') && (
                            <div className="mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEndBatch(group);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-[#DC2626] bg-white border border-[#FEE2E2] rounded-lg hover:bg-[#FEF2F2] transition-colors"
                              >
                                <StopCircle size={14} />
                                结束批次
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 弹窗底部 */}
              <div className="flex items-center justify-between p-6 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="text-sm text-[#6B7280]">
                  实时数据，每5秒自动更新
                </div>
                <div className="flex gap-3">
                  <LotteryButton
                    variant="secondary"
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedRoom(null);
                    }}
                  >
                    关闭
                  </LotteryButton>
                  <LotteryButton onClick={() => handleDownloadRoomData(selectedRoom)}>
                    <Download size={18} />
                    下载数据
                  </LotteryButton>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 结束批次确认弹窗 */}
      {showEndBatchConfirm && selectedEndGroup && (() => {
        const groupCandidates = candidateStorage.getCandidatesByGroupId(selectedEndGroup.id);
        const drawnCount = groupCandidates.filter(c => c.status === 'drawn').length;
        const absentCount = groupCandidates.filter(c => c.status === 'absent').length;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <StopCircle size={24} className="text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#111827]">清空志愿者权限</h3>
                  <p className="text-sm text-[#9CA3AF]">此操作将清空该分组的所有志愿者权限</p>
                </div>
              </div>
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 mb-4">
                <p className="text-sm text-[#1E40AF] font-medium mb-2">
                  分组：{selectedEndGroup.name}
                </p>
                <p className="text-sm text-[#1E40AF] mb-2">
                  结束后，该分组的志愿者权限将被清空：
                </p>
                <ul className="text-xs text-[#3B82F6] space-y-1 list-disc list-inside">
                  <li>已抽签 <span className="font-bold">{drawnCount}</span> 人，缺考 <span className="font-bold">{absentCount}</span> 人</li>
                  <li>考生数据和抽签记录将保留，不会被重置</li>
                  <li>该分组的所有志愿者权限将被清空</li>
                  <li>志愿者将无法再访问该分组的抽签控制台</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <LotteryButton variant="secondary" className="flex-1" onClick={() => setShowEndBatchConfirm(false)}>
                  取消
                </LotteryButton>
                <LotteryButton variant="primary" className="flex-1" onClick={confirmEndBatch}>
                  确认结束批次
                </LotteryButton>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 历史场次弹窗 */}
      {showHistoryModal && (() => {
        // 获取所有批次，过滤出所有分组都已结束的批次
        const allBatches = batchStorage.getAllBatches();
        const completedBatches = allBatches.filter(batch => {
          const batchGroups = groupStorage.getAllGroups().filter(g => g.batchId === batch.id);
          // 如果批次没有分组，不显示在历史记录中
          if (batchGroups.length === 0) return false;
          // 检查是否所有分组都已结束
          return batchGroups.every(group => getGroupStatus(group) === 'completed');
        }).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

        // 搜索过滤
        const filteredBatches = completedBatches.filter(batch => {
          if (!historyBatchSearch) return true;
          const searchLower = historyBatchSearch.toLowerCase();
          return batch.name.toLowerCase().includes(searchLower) ||
            batch.academy.toLowerCase().includes(searchLower);
        });

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-5xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
                <div>
                  <h3 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                    <Calendar size={24} className="text-[#3B82F6]" />
                    历史场次记录
                  </h3>
                  <p className="text-sm text-[#9CA3AF] mt-1">
                    共 {completedBatches.length} 个历史批次
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryBatchSearch('');
                    setExpandedBatchId(null);
                  }}
                  className="text-[#9CA3AF] hover:text-[#111827] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* 搜索框 */}
              <div className="px-6 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    placeholder="搜索批次名称或学院..."
                    value={historyBatchSearch}
                    onChange={(e) => setHistoryBatchSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
                  />
                </div>
              </div>

              {/* 批次列表 */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredBatches.length === 0 ? (
                  <div className="text-center py-12 text-[#9CA3AF]">
                    <Calendar size={48} className="mx-auto mb-2 opacity-30" />
                    <p>{historyBatchSearch ? '未找到匹配的批次' : '暂无历史批次'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBatches.map((batch) => {
                      // 获取该批次的所有分组
                      const batchGroups = groupStorage.getAllGroups().filter(g => g.batchId === batch.id);

                      // 计算批次统计
                      let totalCandidates = 0;
                      let drawnCandidates = 0;
                      let absentCandidates = 0;
                      const examRoomIds = new Set<string>();

                      batchGroups.forEach((group) => {
                        examRoomIds.add(group.examRoomId);
                        const candidates = candidateStorage.getCandidatesByGroupId(group.id);
                        totalCandidates += candidates.length;
                        drawnCandidates += candidates.filter(c => c.status === 'drawn').length;
                        absentCandidates += candidates.filter(c => c.status === 'absent').length;
                      });

                      const isExpanded = expandedBatchId === batch.id;

                      return (
                        <div key={batch.id} className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                          {/* 批次概览卡片 */}
                          <div className="p-4 hover:bg-[#F9FAFB] transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-base font-bold text-[#111827]">📦 {batch.name}</h4>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">
                                    已完成
                                  </span>
                                </div>
                                <div className="space-y-1 text-sm text-[#6B7280]">
                                  <div className="flex items-center gap-4">
                                    <span>📅 {batch.startDate} ~ {batch.endDate}</span>
                                    <span>🏫 {batch.academy}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span>📊 {examRoomIds.size} 个考场</span>
                                    <span>👥 {totalCandidates} 名考生</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#3B82F6] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg hover:bg-[#DBEAFE] transition-colors"
                              >
                                <Eye size={14} />
                                {isExpanded ? '收起详情' : '查看详情'}
                              </button>
                            </div>

                            {/* 统计数据 */}
                            <div className="flex items-center gap-4 pt-3 border-t border-[#E5E7EB]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-[#9CA3AF]">✅ 已抽签:</span>
                                <span className="text-sm font-bold text-[#10B981]">{drawnCandidates}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-[#9CA3AF]">❌ 缺考:</span>
                                <span className="text-sm font-bold text-[#DC2626]">{absentCandidates}</span>
                              </div>
                            </div>
                          </div>

                          {/* 展开详情 */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0">
                              <div className="border-t border-[#E5E7EB] pt-4">
                                <h5 className="text-sm font-bold text-[#111827] mb-3">考场列表</h5>
                                <div className="space-y-2">
                                  {Array.from(examRoomIds).map((roomId) => {
                                    const room = examRoomStorage.getExamRoomById(roomId);
                                    if (!room) return null;

                                    const roomGroups = batchGroups.filter(g => g.examRoomId === roomId);
                                    let roomTotalCandidates = 0;
                                    let roomDrawnCandidates = 0;
                                    let roomAbsentCandidates = 0;

                                    roomGroups.forEach((group) => {
                                      const candidates = candidateStorage.getCandidatesByGroupId(group.id);
                                      roomTotalCandidates += candidates.length;
                                      roomDrawnCandidates += candidates.filter(c => c.status === 'drawn').length;
                                      roomAbsentCandidates += candidates.filter(c => c.status === 'absent').length;
                                    });

                                    return (
                                      <div key={roomId} className="bg-[#F9FAFB] rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-[#111827] mb-1">
                                              {room.name}
                                            </div>
                                            <div className="text-xs text-[#9CA3AF]">
                                              {room.location} · {roomGroups.length} 个分组
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3 text-right">
                                            <div>
                                              <div className="text-sm font-bold text-[#3B82F6]">{roomTotalCandidates}</div>
                                              <div className="text-xs text-[#9CA3AF]">考生数</div>
                                            </div>
                                            <div>
                                              <div className="text-sm font-bold text-[#10B981]">{roomDrawnCandidates}</div>
                                              <div className="text-xs text-[#9CA3AF]">已抽签</div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* 分组列表 */}
                                        <div className="space-y-1 mt-3 pt-3 border-t border-[#E5E7EB]">
                                          {roomGroups.map((group) => {
                                            const candidates = candidateStorage.getCandidatesByGroupId(group.id);
                                            const drawn = candidates.filter(c => c.status === 'drawn').length;
                                            const absent = candidates.filter(c => c.status === 'absent').length;

                                            return (
                                              <div key={group.id} className="flex items-center justify-between py-1.5 px-2 bg-white rounded text-xs">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium text-[#111827]">{group.name}</span>
                                                  <span className="text-[#9CA3AF]">
                                                    {group.date} {group.time}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[#9CA3AF]">
                                                  <span>总数: <span className="text-[#3B82F6] font-medium">{candidates.length}</span></span>
                                                  <span>已抽: <span className="text-[#10B981] font-medium">{drawn}</span></span>
                                                  <span>缺考: <span className="text-[#DC2626] font-medium">{absent}</span></span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 弹窗底部 */}
              <div className="flex items-center justify-between p-6 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="text-sm text-[#6B7280]">
                  显示所有已完成的批次记录
                </div>
                <LotteryButton
                  variant="secondary"
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryBatchSearch('');
                    setExpandedBatchId(null);
                  }}
                >
                  关闭
                </LotteryButton>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}