// V2-PC抽签控制台（竖版单列布局，无滚动条设计 - 1440×900px）
// 已优化：删除刷新数据和导出Excel按钮，重新开始改为重置抽签
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import {
  MonitorPlay,
  Users,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  AlertTriangle,
  Clock,
  Wifi,
  LogOut,
  Search,
  ArrowLeft,
  Layers,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as candidateStorage from '../../storage/candidateStorage';
import * as groupStorage from '../../storage/groupStorage';
import * as batchStorage from '../../storage/batchStorage';
import * as volunteerStorage from '../../storage/volunteerStorage';
import * as XLSX from 'xlsx';

export default function LotteryConsolePage() {
  const navigate = useNavigate();
  const {
    currentUser,
    selectedGroup,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'waiting' | 'drawn' | 'absent'>('waiting');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAbsentConfirm, setShowAbsentConfirm] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingNumber, setDrawingNumber] = useState(0);
  const [finalNumber, setFinalNumber] = useState<number | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showCompletionDetail, setShowCompletionDetail] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<any>(null);
  
  // 搜索框的ref，用于检测点击外部
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // 检查是否已选择分组
  useEffect(() => {
    if (!selectedGroup) {
      navigate('/volunteer-exam-select');
      return;
    }

    // 加载当前分组的考生数据
    loadCandidates();
  }, [selectedGroup, navigate]);

  // 实时更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 每秒更新一次

    return () => clearInterval(timer);
  }, []);

  const loadCandidates = () => {
    if (!selectedGroup) {
      setCandidates([]);
      return;
    }

    // 获取该分组的所有考生
    const groupCandidates = candidateStorage.getCandidatesByGroupId(selectedGroup.id);
    
    setCandidates(groupCandidates);
  };

  // 脱敏处理函数
  const maskIdCard = (idCard: string) => {
    // 身份证号脱敏：显示前6位和后4位，中间8位用*代替
    if (!idCard || idCard.length < 18) return idCard;
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  };

  const maskPhone = (phone?: string) => {
    // 手机号脱敏：显示前3位和后4位，中间4位用*代替
    if (!phone || phone.length < 11) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  };

  const waitingCount = candidates.filter((c) => c.status === 'waiting').length;
  const drawnCount = candidates.filter((c) => c.status === 'drawn').length;
  const absentCount = candidates.filter((c) => c.status === 'absent').length;
  const totalCount = candidates.length;
  const progress = totalCount > 0 ? Math.round(((drawnCount + absentCount) / totalCount) * 100) : 0;

  const filteredCandidates = candidates
    .filter((c) => c.status === activeTab)
    .filter((c) => {
      // 如果在已抽签Tab且选择了考生，只显示该考生
      if (activeTab === 'drawn' && selectedCandidate && selectedCandidate.status === 'drawn') {
        return c.id === selectedCandidate.id;
      }
      // 否则按搜索关键词过滤
      return c.name.includes(searchQuery) || (c.candidateNo && c.candidateNo.includes(searchQuery));
    });

  const recentDrawn = candidates
    .filter((c) => c.status === 'drawn')
    .sort((a, b) => (b.drawnTime || '').localeCompare(a.drawnTime || ''))
    .slice(0, 5); // 增加到5条记录

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 生成唯一的签号（不与已抽签的号码重复）
  // excludeCandidateId: 重新抽签时，排除该考生ID，让其旧号码可以被重新使用
  const generateUniqueNumber = (maxNumber: number, excludeCandidateId?: string): number => {
    // 获取所有已使用的签号（排除指定考生的号码）
    const usedNumbers = candidates
      .filter(c => 
        c.status === 'drawn' && 
        c.drawnNumber && 
        c.id !== excludeCandidateId // 重新抽签时排除该考生，让其旧号码可用
      )
      .map(c => c.drawnNumber);
    
    // 创建可用号码池
    const availableNumbers: number[] = [];
    for (let i = 1; i <= maxNumber; i++) {
      if (!usedNumbers.includes(i)) {
        availableNumbers.push(i);
      }
    }
    
    // 如果没有可用号码（理论上不应该发生，但作为保险）
    if (availableNumbers.length === 0) {
      return Math.floor(Math.random() * maxNumber) + 1;
    }
    
    // 从可用号码中随机选择一个
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    return availableNumbers[randomIndex];
  };

  const handleDraw = () => {
    if (!selectedCandidate) return;
    
    // 开始抽签动画
    setIsDrawing(true);
    setFinalNumber(null);
    
    // 根据分组总人数生成签号范围（1到总人数）
    const maxNumber = totalCount > 0 ? totalCount : 99;
    
    // 生成唯一的签号（不与已抽签的号码重复）
    const randomNumber = generateUniqueNumber(maxNumber);
    
    // 数字滚动动画 - 2秒
    let count = 0;
    const interval = setInterval(() => {
      setDrawingNumber(Math.floor(Math.random() * maxNumber) + 1);
      count++;
      
      if (count >= 30) { // 30次滚动后停止
        clearInterval(interval);
        setDrawingNumber(randomNumber);
        setFinalNumber(randomNumber);
        
        // 3秒关闭动画并更新数据
        setTimeout(() => {
          // 更新考生状态到storage
          candidateStorage.updateCandidate(selectedCandidate.id, {
            status: 'drawn',
            drawnNumber: randomNumber,
            drawnTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          });
          
          // 重新加载数据
          loadCandidates();
          
          setSelectedCandidate(null);
          setIsDrawing(false);
          setFinalNumber(null);
          setActiveTab('waiting');
        }, 3000);
      }
    }, 70); // 每70ms更新一
  };

  const handleMarkAbsent = () => {
    if (!selectedCandidate) return;
    
    // 更新考生状态到storage
    candidateStorage.updateCandidate(selectedCandidate.id, {
      status: 'absent',
    });
    
    // 重新加载数据
    loadCandidates();
    
    setSelectedCandidate(null);
    setShowAbsentConfirm(false);
    setActiveTab('waiting');
  };

  const handleReDraw = (candidate?: any) => {
    const targetCandidate = candidate || selectedCandidate;
    if (!targetCandidate) return;
    
    // 设置选中的考生（用于动画显示）
    setSelectedCandidate(targetCandidate);
    
    // 开始抽签动画
    setIsDrawing(true);
    setFinalNumber(null);
    
    // 根据分组总人数生成签号范围（1到总人数）
    const maxNumber = totalCount > 0 ? totalCount : 99;
    
    // 生成唯一的签号（重新抽签时，排除当前考生，让其旧号码可以被重新使用）
    const randomNumber = generateUniqueNumber(maxNumber, targetCandidate.id);
    
    // 数字滚动动画 - 2秒
    let count = 0;
    const interval = setInterval(() => {
      setDrawingNumber(Math.floor(Math.random() * maxNumber) + 1);
      count++;
      
      if (count >= 30) { // 30次滚动后停止
        clearInterval(interval);
        setDrawingNumber(randomNumber);
        setFinalNumber(randomNumber);
        
        // 3秒后关闭动画并更新数据
        setTimeout(() => {
          // 更新考生状态到storage
          candidateStorage.updateCandidate(targetCandidate.id, {
            status: 'drawn',
            drawnNumber: randomNumber,
            drawnTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          });
          
          // 重新加载数据
          loadCandidates();
          
          setSelectedCandidate(null);
          setIsDrawing(false);
          setFinalNumber(null);
          setActiveTab('drawn');
        }, 3000);
      }
    }, 70); // 每70ms更新一次
  };

  const handleRestartLottery = () => {
    // 重置所有已抽签和缺考的考生为待抽签状态
    candidates.forEach((candidate) => {
      if (candidate.status === 'drawn' || candidate.status === 'absent') {
        candidateStorage.updateCandidate(candidate.id, {
          status: 'waiting',
          drawnNumber: undefined,
          drawnTime: undefined,
        });
      }
    });

    // 重新加载数据
    loadCandidates();
    setSelectedCandidate(null);
    setShowRestartConfirm(false);
    setActiveTab('waiting');
  };

  // 恢复待抽签
  const handleRestoreToWaiting = () => {
    if (!restoreCandidate) return;

    // 更新考生状态到storage
    candidateStorage.updateCandidate(restoreCandidate.id, {
      status: 'waiting',
    });

    // 重新加载数据
    loadCandidates();

    setRestoreCandidate(null);
    setShowRestoreConfirm(false);
    setActiveTab('waiting');
  };

  // 导出完成明细Excel
  const handleExportCompletionDetail = () => {
    // 准备数据：已抽签按号码升序，缺考排最后
    const drawnCandidates = candidates
      .filter(c => c.status === 'drawn')
      .sort((a, b) => (a.drawnNumber || 0) - (b.drawnNumber || 0));
    const absentCandidates = candidates.filter(c => c.status === 'absent');
    const sortedCandidates = [...drawnCandidates, ...absentCandidates];

    const exportData = sortedCandidates.map((candidate, index) => ({
      '序号': index + 1,
      '抽签号': candidate.drawnNumber || '-',
      '姓名': candidate.name || '',
      '身份证号': candidate.idCard || '', // 不脱敏
      '抽签时间': candidate.drawnTime || '-',
      '状态': candidate.status === 'drawn' ? '已抽签' : '缺考',
    }));

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    const colWidths = [
      { wch: 8 },  // 序号
      { wch: 12 }, // 抽签号
      { wch: 15 }, // 姓名
      { wch: 20 }, // 身份证号
      { wch: 12 }, // 抽签时间
      { wch: 10 }, // 状态
    ];
    worksheet['!cols'] = colWidths;

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '抽签完成明细');
    
    // 生成文件名
    const fileName = `${selectedGroup?.name || '抽签数据'}_抽签完成明细_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    
    // 导出文件
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="h-screen flex flex-col bg-[#F9FAFB] overflow-hidden">
      {/* 顶部信息栏 - 响应式高度 */}
      <div className="h-14 sm:h-16 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        <div className="px-3 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* 返回按钮 */}
            <button
              onClick={() => {
                // 根据用户角色跳转到不同页面
                if (currentUser?.role === 'admin') {
                  navigate('/admin-home');
                } else {
                  navigate('/volunteer-exam-select');
                }
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-all"
            >
              <ArrowLeft size={16} />
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">返回</span>
            </button>
            
            {/* 分隔线 - 桌面端显示 */}
            <div className="w-px h-8 sm:h-10 bg-[#E5E7EB] hidden sm:block"></div>
            
            {/* 分组与考场信息卡片 - 响应式布局 */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-br from-[#EFF6FF] to-[#F0FDF4] border border-[#BFDBFE] rounded-lg flex-1 min-w-0">
              {/* 分组信息 */}
              <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2 border-r border-[#D1FAE5] min-w-0 flex-1">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                  分
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-[#111827] leading-tight truncate">{selectedGroup?.name || '未知分组'}</div>
                  <div className="text-xs text-[#6B7280] truncate hidden sm:block">{selectedGroup?.batchName}</div>
                </div>
              </div>
              
              {/* 考场信息 - 移动端简化显示 */}
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 min-w-0 flex-1">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                  考
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-[#111827] leading-tight truncate">{selectedGroup?.examRoomName || '未知考场'}</div>
                  <div className="text-xs text-[#6B7280] truncate hidden lg:block">{selectedGroup?.description || ''}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* 时钟 - 移动端简化 */}
            <div className="text-center hidden sm:block">
              <div className="text-lg sm:text-xl font-mono font-bold text-[#111827]">
                {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-xs text-[#9CA3AF] hidden lg:block">{currentTime.toLocaleDateString('zh-CN')}</div>
            </div>
            <div className="w-px h-8 bg-[#E5E7EB] hidden sm:block"></div>
            {/* 用户信息 - 移动端简化 */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center text-white text-xs font-medium">
                {currentUser?.name?.charAt(0)}
              </div>
              <span className="text-xs sm:text-sm text-[#4B5563] hidden sm:inline">{currentUser?.name}</span>
            </div>
            {/* 投屏按钮 - 移动端隐藏 */}
            <button
              onClick={() => navigate('/display')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-all text-sm"
            >
              <MonitorPlay size={16} />
              <span className="font-medium">投屏</span>
            </button>
            {/* 退出按钮 - 移动端图标化 */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all text-sm"
            >
              <LogOut size={16} />
              <span className="font-medium hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主体单列布局 - 响应式 */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-7xl mx-auto w-full">
        {/* 第一区：智能搜索选择 + Tab切换 - 响应式布局 */}
        <div className="bg-white border-b border-[#E5E7EB] p-3 sm:p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
            {/* 左：搜索框 */}
            <div className="flex-1" ref={searchBoxRef}>
              <label className="block text-xs sm:text-sm font-semibold text-[#111827] mb-1.5 flex items-center gap-1.5">
                <Search size={14} className="text-[#3B82F6]" />
                选择考生
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] z-10" />
                <input
                  type="text"
                  placeholder="搜索姓名/编号，或点击下拉选择..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="w-full pl-10 pr-9 py-2 text-sm text-[#111827] bg-white border-2 border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-all placeholder:text-[#9CA3AF]"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchDropdown(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
                  >
                    <XCircle size={16} />
                  </button>
                )}

                {/* 下拉选择列表 */}
                {showSearchDropdown && filteredCandidates.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E5E7EB] rounded-lg shadow-xl max-h-64 overflow-y-auto z-50 custom-scrollbar">
                    {filteredCandidates.slice(0, 10).map((candidate) => (
                      <button
                        key={candidate.id}
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setSearchQuery('');
                          setShowSearchDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#F3F4F6] transition-colors border-b border-[#F3F4F6] last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {/* 已抽签Tab - 显示签号徽章 */}
                              {activeTab === 'drawn' && candidate.drawnNumber && (
                                <span className="px-2 py-1 bg-gradient-to-br from-[#059669] to-[#10B981] text-white text-xs font-black rounded-md flex-shrink-0">
                                  {candidate.drawnNumber}号
                                </span>
                              )}
                              <span className="text-sm font-semibold text-[#111827] truncate">
                                {candidate.name}
                              </span>
                              {/* 其他Tab - 显示状态标签 */}
                              {activeTab !== 'drawn' && candidate.status === 'drawn' && candidate.drawnNumber && (
                                <span className="px-1.5 py-0.5 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded-full flex-shrink-0">
                                  {candidate.drawnNumber}号
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#9CA3AF] truncate">
                              考生号 {candidate.candidateNo} · {maskIdCard(candidate.idCard)}
                              {/* 已抽签Tab - 显示抽签时间 */}
                              {activeTab === 'drawn' && candidate.drawnTime && (
                                <span className="ml-2 text-[#059669]">
                                  · {candidate.drawnTime}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedCandidate?.id === candidate.id && (
                            <CheckCircle2 size={16} className="text-[#3B82F6] flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 无结果提示 */}
                {showSearchDropdown && searchQuery && filteredCandidates.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E5E7EB] rounded-lg shadow-xl p-4 text-center z-50">
                    <Users size={24} className="mx-auto text-[#9CA3AF] mb-1.5" />
                    <p className="text-xs text-[#9CA3AF]">未找到匹配的考生</p>
                  </div>
                )}
              </div>

              {/* 已选择考生提示 */}
              {selectedCandidate && !searchQuery && (
                <div className="mt-2 px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <CheckCircle2 size={14} className="text-[#3B82F6] flex-shrink-0" />
                    <span className="text-xs text-[#1E40AF] font-medium truncate">
                      已选择：{selectedCandidate.name} ({selectedCandidate.candidateNo})
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="text-[#3B82F6] hover:text-[#1E40AF] text-xs font-medium flex-shrink-0"
                  >
                    清除
                  </button>
                </div>
              )}
            </div>

            {/* 右：Tab切换 - 响应式 */}
            <div className="w-full sm:w-60">
              <label className="block text-xs sm:text-sm font-semibold text-[#111827] mb-1.5 flex items-center gap-1.5">
                <Layers size={14} className="text-[#10B981]" />
                队列状态
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('waiting');
                    setSelectedCandidate(null);
                    setSearchQuery('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeTab === 'waiting'
                      ? 'bg-[#3B82F6] text-white shadow-md'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  <span className="hidden sm:inline">待抽签</span>
                  <span className="sm:hidden">待抽</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'waiting' ? 'bg-white/20' : 'bg-white text-[#3B82F6]'
                  }`}>{waitingCount}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('drawn');
                    setSelectedCandidate(null);
                    setSearchQuery('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeTab === 'drawn'
                      ? 'bg-[#3B82F6] text-white shadow-md'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  <span className="hidden sm:inline">已抽签</span>
                  <span className="sm:hidden">已抽</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'drawn' ? 'bg-white/20' : 'bg-white text-[#059669]'
                  }`}>{drawnCount}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('absent');
                    setSelectedCandidate(null);
                    setSearchQuery('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeTab === 'absent'
                      ? 'bg-[#3B82F6] text-white shadow-md'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  <span>缺考</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'absent' ? 'bg-white/20' : 'bg-white text-[#DC2626]'
                  }`}>{absentCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 全员完成抽签横幅 - 响应式 */}
        {waitingCount === 0 && totalCount > 0 && (
          <div className="bg-gradient-to-r from-[#059669] to-[#10B981] px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between flex-shrink-0 border-b border-[#059669]/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">🎉</span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">全员抽签完成！</h3>
                <p className="text-xs text-white/80 hidden sm:block">
                  已抽签 <span className="font-bold">{drawnCount}</span>人 · 缺考 <span className="font-bold">{absentCount}</span>人 · 总计 <span className="font-bold">{totalCount}</span>人
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompletionDetail(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-[#059669] rounded-lg text-xs sm:text-sm font-medium hover:bg-white/90 hover:shadow-md transition-all active:scale-95"
              >
                <FileText size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">查看明细</span>
                <span className="sm:hidden">明细</span>
              </button>
              <button
                onClick={handleExportCompletionDetail}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg text-sm font-medium hover:bg-white/30 hover:shadow-md transition-all active:scale-95"
              >
                <Download size={16} />
                导出Excel
              </button>
            </div>
          </div>
        )}

        {/* 第二区：考生信息展示 OR 已抽签列表 OR 缺考列表 - 响应式 */}
        {/* 已抽签Tab - 显示已抽签列表（搜索框下方） */}
        {activeTab === 'drawn' ? (
          <div className="flex-1 bg-white p-3 sm:p-6 overflow-hidden flex flex-col">
            <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col overflow-hidden">
              <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] overflow-hidden flex-1 flex flex-col">
                {/* 列表头部 - 响应式 */}
                <div className="bg-gradient-to-r from-[#059669] to-[#10B981] px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle2 size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
                    <h3 className="text-sm sm:text-base font-bold text-white">已抽签名单</h3>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold text-white">
                      {searchQuery || (selectedCandidate && selectedCandidate.status === 'drawn') 
                        ? `${filteredCandidates.length} / ${drawnCount}` 
                        : `共 ${drawnCount} 人`}
                    </span>
                  </div>
                  <span className="text-xs text-white/80 hidden sm:inline">签号从小到大排序</span>
                </div>

                {/* 列表内容 - 响应式 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredCandidates
                    .sort((a, b) => (a.drawnNumber || 0) - (b.drawnNumber || 0)) // 按签号从小到大排序
                    .map((candidate, index) => (
                      <div
                        key={candidate.id}
                        className={`px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                        } hover:bg-[#EFF6FF] border-b border-[#E5E7EB] last:border-b-0`}
                      >
                        {/* 签号徽章 - 响应式 */}
                        <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center shadow-md">
                          <div className="text-center">
                            <div className="text-xl sm:text-2xl font-black text-white leading-none">
                              {candidate.drawnNumber}
                            </div>
                            <div className="text-xs text-white/80 font-medium mt-0.5">号</div>
                          </div>
                        </div>

                        {/* 考生信息 - 响应式 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <h4 className="text-sm sm:text-base font-bold text-[#111827]">{candidate.name}</h4>
                            <span className="px-1.5 sm:px-2 py-0.5 bg-[#D1FAE5] text-[#059669] text-xs font-medium rounded-full">
                              已抽签
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-0.5 text-xs">
                            <div>
                              <span className="text-[#9CA3AF]">考生号：</span>
                              <span className="text-[#4B5563] font-medium">{candidate.candidateNo}</span>
                            </div>
                            <div className="hidden sm:block">
                              <span className="text-[#9CA3AF]">抽签时间：</span>
                              <span className="text-[#4B5563] font-medium">{candidate.drawnTime}</span>
                            </div>
                            <div>
                              <span className="text-[#9CA3AF]">身份证号：</span>
                              <span className="text-[#4B5563] font-medium">{maskIdCard(candidate.idCard)}</span>
                            </div>
                            <div className="hidden sm:block">
                              <span className="text-[#9CA3AF]">报名编号：</span>
                              <span className="text-[#4B5563] font-medium">{candidate.registrationNo}</span>
                            </div>
                          </div>
                        </div>

                        {/* 重新抽签按钮 - 响应式 */}
                        <button
                          onClick={() => handleReDraw(candidate)}
                          className="flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white text-xs sm:text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-1 sm:gap-1.5"
                        >
                          <RotateCcw size={14} />
                          <span className="hidden sm:inline">重新抽签</span>
                          <span className="sm:hidden">重抽</span>
                        </button>
                      </div>
                    ))}

                  {/* 空状态 */}
                  {drawnCount === 0 && (
                    <div className="py-12 text-center">
                      <CheckCircle2 size={48} className="mx-auto text-[#D1D5DB] mb-3" />
                      <p className="text-sm text-[#9CA3AF]">暂无已抽签考生</p>
                    </div>
                  )}

                  {/* 搜索无结果 */}
                  {drawnCount > 0 && filteredCandidates.length === 0 && (
                    <div className="py-12 text-center">
                      <Search size={48} className="mx-auto text-[#D1D5DB] mb-3" />
                      <p className="text-sm text-[#9CA3AF]">未找到匹配的考生</p>
                      <p className="text-xs text-[#D1D5DB] mt-1">请尝试其他关键词</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'absent' ? (
          /* 缺考Tab - 显示缺考列表 - 响应式 */
          <div className="flex-1 bg-white p-3 sm:p-6 overflow-hidden flex flex-col">
            <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col overflow-hidden">
              <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] overflow-hidden flex-1 flex flex-col">
                {/* 列表头部 - 响应式 */}
                <div className="bg-gradient-to-r from-[#DC2626] to-[#EF4444] px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <XCircle size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
                    <h3 className="text-sm sm:text-base font-bold text-white">缺考名单</h3>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold text-white">
                      {searchQuery || (selectedCandidate && selectedCandidate.status === 'absent') 
                        ? `${filteredCandidates.length} / ${absentCount}` 
                        : `共 ${absentCount} 人`}
                    </span>
                  </div>
                  <span className="text-xs text-white/80 hidden sm:inline">按姓名排序</span>
                </div>

                {/* 列表内容 - 响应式 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredCandidates
                    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')) // 按姓名拼音排序
                    .map((candidate, index) => (
                      <div
                        key={candidate.id}
                        className={`px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                        } hover:bg-[#FEF2F2] border-b border-[#E5E7EB] last:border-b-0`}
                      >
                        {/* 缺考图标 - 响应式 */}
                        <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#DC2626] to-[#EF4444] flex items-center justify-center shadow-md">
                          <XCircle size={24} className="text-white sm:w-8 sm:h-8" />
                        </div>

                        {/* 考生信息 - 响应式 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <h4 className="text-sm sm:text-base font-bold text-[#111827]">{candidate.name}</h4>
                            <span className="px-1.5 sm:px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-xs font-medium rounded-full">
                              缺考
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-0.5 text-xs">
                            <div>
                              <span className="text-[#9CA3AF]">考生号：</span>
                              <span className="text-[#4B5563] font-medium">{candidate.candidateNo}</span>
                            </div>
                            <div className="hidden sm:block">
                              <span className="text-[#9CA3AF]">报名编号：</span>
                              <span className="text-[#4B5563] font-medium">{candidate.registrationNo}</span>
                            </div>
                            <div>
                              <span className="text-[#9CA3AF]">身份证号：</span>
                              <span className="text-[#4B5563] font-medium">{maskIdCard(candidate.idCard)}</span>
                            </div>
                          </div>
                        </div>

                        {/* 恢复待抽签按钮 - 响应式 */}
                        <button
                          onClick={() => {
                            setRestoreCandidate(candidate);
                            setShowRestoreConfirm(true);
                          }}
                          className="flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white text-xs sm:text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-1 sm:gap-1.5"
                        >
                          <RotateCcw size={14} />
                          <span className="hidden sm:inline">恢复待抽签</span>
                          <span className="sm:hidden">恢复</span>
                        </button>
                      </div>
                    ))}

                  {/* 空状态 */}
                  {absentCount === 0 && (
                    <div className="py-12 text-center">
                      <XCircle size={48} className="mx-auto text-[#D1D5DB] mb-3" />
                      <p className="text-sm text-[#9CA3AF]">暂无缺考考生</p>
                      <p className="text-xs text-[#D1D5DB] mt-1">所有考生状态良好</p>
                    </div>
                  )}

                  {/* 搜索无结果 */}
                  {absentCount > 0 && filteredCandidates.length === 0 && (
                    <div className="py-12 text-center">
                      <Search size={48} className="mx-auto text-[#D1D5DB] mb-3" />
                      <p className="text-sm text-[#9CA3AF]">未找到匹配的考生</p>
                      <p className="text-xs text-[#D1D5DB] mt-1">请尝试其他关键词</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 待抽签Tab - 显示考生信息展示区 - 响应式紧凑布局 */
          <div className="bg-gradient-to-br from-[#EFF6FF] to-white border-b border-[#E5E7EB] p-2 sm:p-3 lg:p-4 flex-shrink-0">
            {selectedCandidate ? (
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-2 sm:gap-3 lg:gap-4">
                <div className="flex-1 w-full min-w-0">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#111827] mb-1 sm:mb-1.5">{selectedCandidate.name}</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 sm:gap-x-4 gap-y-0.5 sm:gap-y-1 text-xs sm:text-sm">
                    <div className="truncate">
                      <span className="text-[#9CA3AF]">身份证号：</span>
                      <span className="text-[#111827] font-medium">{maskIdCard(selectedCandidate.idCard)}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-[#9CA3AF]">报名编号：</span>
                      <span className="text-[#111827] font-medium">{selectedCandidate.registrationNo}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-[#9CA3AF]">考生号：</span>
                      <span className="text-[#111827] font-medium">{selectedCandidate.candidateNo}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-[#9CA3AF]">联系电话：</span>
                      <span className="text-[#111827] font-medium">{maskPhone(selectedCandidate.phone)}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-[#9CA3AF]">面试日期：</span>
                      <span className="text-[#111827] font-medium">{selectedGroup?.date || '未设置'}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-[#9CA3AF]">面试时间：</span>
                      <span className="text-[#111827] font-medium">
                        {selectedGroup?.endTime ? `${selectedGroup.time}-${selectedGroup.endTime}` : selectedGroup?.time || '未设置'}
                      </span>
                    </div>
                    <div className="truncate col-span-2 lg:col-span-1">
                      <span className="text-[#9CA3AF]">面试地点：</span>
                      <span className="text-[#111827] font-medium">{selectedGroup?.examRoomName || '未设置'}</span>
                    </div>
                    {selectedCandidate.status === 'drawn' && selectedCandidate.drawnNumber && (
                      <>
                        <div className="truncate">
                          <span className="text-[#9CA3AF]">已抽号码：</span>
                          <span className="text-[#3B82F6] font-bold text-sm sm:text-base">{selectedCandidate.drawnNumber}号</span>
                        </div>
                        <div className="truncate">
                          <span className="text-[#9CA3AF]">抽签时间：</span>
                          <span className="text-[#111827] font-medium">{selectedCandidate.drawnTime}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex-shrink-0 w-full lg:w-auto">
                  <p className="text-xs text-[#1E40AF]">
                    💡 <strong>提示：</strong>身份核验由现场工作人员完成
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center py-2 sm:py-3">
              <Users size={28} className="mx-auto text-[#3B82F6] mb-1.5 sm:mb-2 sm:w-8 sm:h-8" />
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[#111827] mb-0.5 sm:mb-1">待抽签队列</h3>
              <p className="text-xs sm:text-sm text-[#9CA3AF]">
                当前有 <span className="font-bold text-[#3B82F6]">{waitingCount}</span> 位考生待抽签，请从上方搜索框选考生进行抽签
              </p>
            </div>
          )}
          </div>
        )}

        {/* 第三区：抽签按钮 + 统计数据 - 响应式紧凑 */}
        {/* 已抽签Tab和缺考Tab时不显示此区域，因为列表已在第二区显示 */}
        {activeTab === 'waiting' && (
          <div className="flex-1 bg-white p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-5 lg:gap-6 min-h-0 overflow-auto">
            {/* 左侧：抽签按钮 - 响应式缩小 */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-2 sm:py-3">
              {selectedCandidate?.status === 'drawn' ? (
                // 选中已抽签考生 - 显示重新抽签按钮
                <button
                  onClick={handleReDraw}
                  className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full text-base sm:text-lg lg:text-xl font-bold shadow-2xl transition-all duration-300 bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-white hover:scale-105 hover:shadow-3xl active:scale-95"
                >
                  重新抽签
                </button>
              ) : (
                // 待抽签考生 - 显示抽签按钮
                <button
                  onClick={handleDraw}
                  disabled={!selectedCandidate}
                  className={`w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full text-base sm:text-lg lg:text-xl font-bold shadow-2xl transition-all duration-300 ${
                    selectedCandidate
                      ? 'bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white hover:scale-105 hover:shadow-3xl active:scale-95'
                      : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  }`}
                >
                  {!selectedCandidate ? '请选择考生' : '点击抽签'}
                </button>
              )}
            </div>

            {/* 右侧：统计数据 - 响应式 */}
          <div className="flex flex-col gap-2 sm:gap-3 w-full lg:w-[280px] flex-shrink-0">
            {/* 数据统计 - 响应式网格 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#059669] mb-0.5">{drawnCount}</div>
                <div className="text-xs text-[#9CA3AF] flex items-center justify-center gap-1">
                  <CheckCircle2 size={11} />
                  <span className="hidden sm:inline">已抽签</span>
                  <span className="sm:hidden">已抽</span>
                </div>
              </div>

              <div className="text-center">
                <div
                  className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-0.5 ${
                    waitingCount > 5 ? 'text-[#D97706]' : 'text-[#DC2626] animate-pulse'
                  }`}
                >
                  {waitingCount}
                </div>
                <div className="text-xs text-[#9CA3AF] flex items-center justify-center gap-1">
                  <Clock size={11} />
                  <span className="hidden sm:inline">剩余人数</span>
                  <span className="sm:hidden">剩余</span>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#9CA3AF] mb-0.5">{absentCount}</div>
                <div className="text-xs text-[#9CA3AF] flex items-center justify-center gap-1">
                  <XCircle size={11} />
                  <span className="hidden sm:inline">缺考人数</span>
                  <span className="sm:hidden">缺考</span>
                </div>
              </div>
            </div>

            {/* 环形进度条 - 响应式紧凑 */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${progress * 2.51} 251`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-[#111827]">{progress}%</div>
                  <div className="text-xs text-[#9CA3AF]">完成</div>
                </div>
              </div>
            </div>

            {/* 最近记录 - 桌面端显示 */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#111827]">最近抽签</h4>
                <span className="text-xs text-[#9CA3AF]">{recentDrawn.length} 条记录</span>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {recentDrawn.map((candidate, index) => (
                  <div 
                    key={candidate.id} 
                    className="group relative bg-gradient-to-r from-[#F9FAFB] to-white border border-[#E5E7EB] rounded-lg p-3 hover:shadow-md hover:border-[#3B82F6] transition-all duration-200"
                  >
                    {/* 序号角标 */}
                    <div className="absolute -left-1 -top-1 w-5 h-5 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {index + 1}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* 签号 */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
                        {candidate.drawnNumber}
                      </div>

                      {/* 考生信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-[#111827] text-sm truncate">
                            {candidate.name}
                          </span>
                          <span className="text-xs text-[#9CA3AF] px-1.5 py-0.5 bg-[#F3F4F6] rounded">
                            {candidate.candidateNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                          <Clock size={11} />
                          <span>{candidate.drawnTime}</span>
                        </div>
                      </div>

                      {/* 重新抽签按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReDraw(candidate);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 px-2.5 py-1.5 text-xs font-medium text-[#3B82F6] hover:text-white bg-[#EFF6FF] hover:bg-[#3B82F6] rounded-md transition-colors duration-200 flex items-center gap-1"
                        title="重新抽签"
                      >
                        <RotateCcw size={12} />
                        重抽
                      </button>
                    </div>
                  </div>
                ))}

                {/* 空状态 */}
                {recentDrawn.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-2">
                      <Clock size={20} className="text-[#9CA3AF]" />
                    </div>
                    <p className="text-xs text-[#9CA3AF]">暂无抽签记录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 第四区：操作按钮 - 响应式 */}
        {/* 缺考Tab时隐藏所有按钮 */}
        {activeTab !== 'absent' && (
        <div className="bg-white border-t border-[#E5E7EB] p-2 sm:p-3 flex-shrink-0">
          <div className={`max-w-5xl mx-auto grid gap-2 sm:gap-3 ${currentUser?.role === 'admin' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <LotteryButton
              variant="danger"
              className="h-9 sm:h-10 lg:h-12 text-xs sm:text-sm"
              onClick={() => setShowAbsentConfirm(true)}
              disabled={!selectedCandidate || selectedCandidate?.status === 'absent'}
            >
              <XCircle size={14} className="sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
              标记缺考
            </LotteryButton>

            <LotteryButton 
              variant="secondary" 
              className="h-9 sm:h-10 lg:h-12 text-xs sm:text-sm"
              onClick={() => setShowRestartConfirm(true)}
              disabled={drawnCount === 0 && absentCount === 0}
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4" />
              重置抽签
            </LotteryButton>
          </div>
        </div>
        )}
      </div>

      {/* 缺考确认弹窗 - 响应式 */}
      {showAbsentConfirm && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-[#DC2626] sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">确认标记缺考</h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF]">此操作不可撤销</p>
              </div>
            </div>
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-2.5 sm:p-3 lg:p-4 mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-[#991B1B]">
                您即将标记 <span className="font-bold">{selectedCandidate.name}</span> ({selectedCandidate.candidateNo}) 为缺考状态
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <LotteryButton variant="secondary" className="flex-1 text-xs sm:text-sm py-2 sm:py-2.5 h-9 sm:h-10" onClick={() => setShowAbsentConfirm(false)}>
                取消
              </LotteryButton>
              <LotteryButton variant="danger" className="flex-1 text-xs sm:text-sm py-2 sm:py-2.5 h-9 sm:h-10" onClick={handleMarkAbsent}>
                确认标记
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 抽签动画弹窗 - 响应式 */}
      {isDrawing && selectedCandidate && (
        <div className="fixed inset-0 bg-gradient-to-br from-[#1E40AF]/95 to-[#3B82F6]/95 flex items-center justify-center z-50 backdrop-blur-sm p-3 sm:p-4">
          <div className="text-center">
            {/* 考生姓名 - 响应式 */}
            <div className="mb-4 sm:mb-6 lg:mb-8 animate-fade-in">
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-1 sm:mb-2">{selectedCandidate.name}</h2>
              <p className="text-sm sm:text-base lg:text-xl text-white/80">{selectedCandidate.candidateNo}</p>
            </div>

            {/* 动画数字区域 - 响应式 */}
            <div className="relative">
              {/* 背景光晕 - 响应式 */}
              <div className="absolute inset-0 blur-xl sm:blur-2xl lg:blur-3xl opacity-50">
                <div className="w-32 h-32 sm:w-48 sm:h-48 lg:w-80 lg:h-80 bg-white rounded-full animate-pulse mx-auto"></div>
              </div>

              {/* 数字显示 - 响应式 */}
              <div className="relative">
                <div
                  className={`text-[100px] sm:text-[140px] lg:text-[200px] font-black leading-none transition-all duration-100 ${
                    finalNumber !== null
                      ? 'text-[#FFD700] scale-125 animate-bounce-once'
                      : 'text-white animate-pulse-fast'
                  }`}
                  style={{ fontFamily: 'Arial Black, sans-serif' }}
                >
                  {drawingNumber.toString().padStart(2, '0')}
                </div>

                {/* 号码标识 */}
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white/90 mt-2 sm:mt-3 lg:mt-4">
                  {finalNumber !== null ? '🎉 抽签号码 🎉' : '正在抽签...'}
                </div>
              </div>
            </div>

            {/* 进度提示 */}
            {finalNumber === null && (
              <div className="mt-12">
                <div className="flex justify-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}

            {/* 最终结果提示 */}
            {finalNumber !== null && (
              <div className="mt-4 sm:mt-6 lg:mt-8 animate-fade-in">
                <div className="inline-block px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/50">
                  <p className="text-base sm:text-lg lg:text-2xl text-white font-medium">
                    您的排队号是 <span className="font-bold text-[#FFD700]">{finalNumber}号</span> 请等待叫号
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 重置抽签确认弹窗 - 响应式 */}
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <RotateCcw size={18} className="text-[#3B82F6] sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#111827]">确认重置抽签</h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF]">此操作将重置所有抽签数据</p>
              </div>
            </div>
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-2.5 sm:p-3 lg:p-4 mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-[#1E40AF] mb-1.5 sm:mb-2">
                重置后，所有考生的抽签状态将被清空：
              </p>
              <ul className="text-xs text-[#3B82F6] space-y-0.5 sm:space-y-1 list-disc list-inside">
                <li>已抽签的 <span className="font-bold">{drawnCount}</span> 位考生将重新回到待抽签队列</li>
                <li>缺考的 <span className="font-bold">{absentCount}</span> 位考生也将重新回到待抽签队列</li>
                <li>所有抽签号码和时间记录将被清除</li>
              </ul>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <LotteryButton variant="secondary" className="flex-1 text-xs sm:text-sm h-9 sm:h-10" onClick={() => setShowRestartConfirm(false)}>
                取消
              </LotteryButton>
              <LotteryButton variant="primary" className="flex-1 text-xs sm:text-sm h-9 sm:h-10" onClick={handleRestartLottery}>
                确认重置
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 恢复待抽签确认弹窗 */}
      {showRestoreConfirm && restoreCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <RotateCcw size={24} className="text-[#D97706]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111827]">确认恢复待抽签</h3>
                <p className="text-sm text-[#9CA3AF]">该考生将重新进入待抽签队列</p>
              </div>
            </div>
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-4 mb-4">
              <p className="text-sm text-[#92400E] mb-2">
                您即将恢复考生：
              </p>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-[#78350F]">姓名：</span>
                  <span className="font-bold text-[#92400E]">{restoreCandidate.name}</span>
                </div>
                <div>
                  <span className="text-[#78350F]">考生号：</span>
                  <span className="font-medium text-[#92400E]">{restoreCandidate.candidateNo}</span>
                </div>
              </div>
              <p className="text-xs text-[#B45309] mt-2">
                恢复后，该考生将回到待抽签队列，可以进行抽签操作
              </p>
            </div>
            <div className="flex gap-3">
              <LotteryButton variant="secondary" className="flex-1" onClick={() => {
                setShowRestoreConfirm(false);
                setRestoreCandidate(null);
              }}>
                取消
              </LotteryButton>
              <LotteryButton variant="primary" className="flex-1" onClick={handleRestoreToWaiting}>
                确认恢复
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 完成明细弹窗 */}
      {showCompletionDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setShowCompletionDetail(false)}>
          <div className="bg-white rounded-lg sm:rounded-xl w-full max-w-4xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl">🎉</span>
                <h3 className="text-base sm:text-xl font-bold text-[#111827]">抽签完成明细</h3>
              </div>
              <button
                onClick={() => setShowCompletionDetail(false)}
                className="text-[#9CA3AF] hover:text-[#111827] transition-colors"
              >
                <XCircle size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* 统计汇总 */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#EFF6FF] to-[#F0FDF4] border-b border-[#E5E7EB] flex-shrink-0">
              <h4 className="text-xs sm:text-sm font-semibold text-[#111827] mb-2 flex items-center gap-1.5">
                <FileText size={14} className="sm:w-4 sm:h-4 text-[#3B82F6]" />
                统计汇总
              </h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#059669]" />
                  <span className="text-[#6B7280]">已抽签：</span>
                  <span className="font-bold text-[#059669]">{drawnCount}人</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle size={14} className="text-[#DC2626]" />
                  <span className="text-[#6B7280]">缺考：</span>
                  <span className="font-bold text-[#DC2626]">{absentCount}人</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-[#3B82F6]" />
                  <span className="text-[#6B7280]">总计：</span>
                  <span className="font-bold text-[#3B82F6]">{totalCount}人</span>
                </div>
              </div>
            </div>

            {/* 表格区域 - 移动端响应式 */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
              {/* 桌面端表格 */}
              <table className="w-full hidden sm:table">
                <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] w-16">序号</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] w-24">抽签号</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">姓名</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">身份证号</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] w-24">抽签时间</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] w-20">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 准备数据：已抽签按号码升序，缺考排最后
                    const drawnCandidates = candidates
                      .filter(c => c.status === 'drawn')
                      .sort((a, b) => (a.drawnNumber || 0) - (b.drawnNumber || 0));
                    const absentCandidates = candidates.filter(c => c.status === 'absent');
                    const sortedCandidates = [...drawnCandidates, ...absentCandidates];

                    return sortedCandidates.map((candidate, index) => (
                      <tr
                        key={candidate.id}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                        } hover:bg-[#EFF6FF] transition-colors border-b border-[#E5E7EB] last:border-b-0`}
                      >
                        <td className="px-4 py-3 text-sm text-[#4B5563]">{index + 1}</td>
                        <td className="px-4 py-3">
                          {candidate.drawnNumber ? (
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-br from-[#059669] to-[#10B981] text-white text-base font-black rounded-lg shadow-sm">
                              {candidate.drawnNumber}号
                            </span>
                          ) : (
                            <span className="text-sm text-[#9CA3AF]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#111827]">{candidate.name}</td>
                        <td className="px-4 py-3 text-sm text-[#4B5563] font-mono">{maskIdCard(candidate.idCard)}</td>
                        <td className="px-4 py-3 text-sm text-[#4B5563]">
                          {candidate.drawnTime || <span className="text-[#9CA3AF]">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          {candidate.status === 'drawn' ? (
                            <span className="inline-flex items-center px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-medium rounded-full">
                              已抽签
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-medium rounded-full">
                              缺考
                            </span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>

              {/* 移动端卡片列表 */}
              <div className="sm:hidden">
                {(() => {
                  // 准备数据：已抽签按号码升序，缺考排最后
                  const drawnCandidates = candidates
                    .filter(c => c.status === 'drawn')
                    .sort((a, b) => (a.drawnNumber || 0) - (b.drawnNumber || 0));
                  const absentCandidates = candidates.filter(c => c.status === 'absent');
                  const sortedCandidates = [...drawnCandidates, ...absentCandidates];

                  return sortedCandidates.map((candidate, index) => (
                    <div
                      key={candidate.id}
                      className="border-b border-[#E5E7EB] p-3 last:border-b-0 hover:bg-[#F9FAFB] transition-colors"
                    >
                      {/* 第一行：序号、抽签号、状态 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9CA3AF] font-medium">#{index + 1}</span>
                          {candidate.drawnNumber ? (
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-gradient-to-br from-[#059669] to-[#10B981] text-white text-sm font-black rounded-md shadow-sm">
                              {candidate.drawnNumber}号
                            </span>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">未抽签</span>
                          )}
                        </div>
                        {candidate.status === 'drawn' ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-[#D1FAE5] text-[#059669] text-xs font-medium rounded-full">
                            已抽签
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-xs font-medium rounded-full">
                            缺考
                          </span>
                        )}
                      </div>

                      {/* 第二行：姓名 */}
                      <div className="mb-1.5">
                        <span className="text-sm font-bold text-[#111827]">{candidate.name}</span>
                      </div>

                      {/* 第三行：身份证号 */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-[#9CA3AF]">身份证：</span>
                        <span className="text-xs text-[#4B5563] font-mono">{maskIdCard(candidate.idCard)}</span>
                      </div>

                      {/* 第四行：抽签时间 */}
                      {candidate.drawnTime && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#9CA3AF]">时间：</span>
                          <span className="text-xs text-[#4B5563]">{candidate.drawnTime}</span>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* 底部操作按钮 */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
              <p className="text-xs text-[#9CA3AF] text-center sm:text-left">
                💡 提示：导出的Excel文件包含完整的身份证号信息
              </p>
              <div className="flex gap-2 sm:gap-3">
                <LotteryButton variant="secondary" onClick={() => setShowCompletionDetail(false)} className="flex-1 sm:flex-initial">
                  关闭
                </LotteryButton>
                <LotteryButton variant="primary" onClick={handleExportCompletionDetail} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5">
                  <Download size={16} />
                  <span className="hidden sm:inline">下载Excel明细</span>
                  <span className="sm:hidden">下载明细</span>
                </LotteryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-once {
          0%, 100% {
            transform: scale(1.25);
          }
          50% {
            transform: scale(1.35);
          }
        }

        @keyframes pulse-fast {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-bounce-once {
          animation: bounce-once 0.6s ease-in-out;
        }

        .animate-pulse-fast {
          animation: pulse-fast 0.3s ease-in-out infinite;
        }

        /* 透明滚动条样式 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 3px;
        }

        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}