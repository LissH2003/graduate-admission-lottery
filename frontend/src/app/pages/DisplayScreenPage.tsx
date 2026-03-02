// V3-叫号副屏页面（1920×1080px，黑色背景，投影专用）
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as candidateStorage from '../../storage/candidateStorage';

export default function DisplayScreenPage() {
  const navigate = useNavigate();
  const { selectedGroup } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showExitButton, setShowExitButton] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [currentCandidate, setCurrentCandidate] = useState<any>(null);
  const [nextCandidate, setNextCandidate] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  // 加载考生数据
  useEffect(() => {
    if (!selectedGroup) {
      navigate('/volunteer-exam-select');
      return;
    }

    loadCandidates();

    // 每3秒刷新一次数据
    const refreshInterval = setInterval(() => {
      loadCandidates();
    }, 3000);

    return () => clearInterval(refreshInterval);
  }, [selectedGroup, navigate]);

  const loadCandidates = () => {
    if (!selectedGroup) return;

    // 获取该分组的所有考生
    const groupCandidates = candidateStorage.getCandidatesByGroupId(selectedGroup.id);
    setCandidates(groupCandidates);

    // 获取已抽签的考生（按签号升序，签号最小的在前）
    const drawnCandidates = groupCandidates
      .filter((c: any) => c.status === 'drawn')
      .sort((a: any, b: any) => (a.drawnNumber || 0) - (b.drawnNumber || 0));

    // 设置当前考生（签号最小的）
    if (drawnCandidates.length > 0) {
      setCurrentCandidate(drawnCandidates[0]);
    } else {
      setCurrentCandidate(null);
    }

    // 设置下一位考生（签号第二小的，或者待抽签的第一个）
    if (drawnCandidates.length > 1) {
      setNextCandidate(drawnCandidates[1]);
    } else {
      const waitingCandidates = groupCandidates.filter((c: any) => c.status === 'waiting');
      if (waitingCandidates.length > 0) {
        setNextCandidate(waitingCandidates[0]);
      } else {
        setNextCandidate(null);
      }
    }

    // 计算进度
    const totalCount = groupCandidates.length;
    const drawnCount = drawnCandidates.length;
    const absentCount = groupCandidates.filter((c: any) => c.status === 'absent').length;
    // 已完成 = 已抽签 + 缺考
    const completedCount = drawnCount + absentCount;
    const calculatedProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    setProgress(calculatedProgress);
  };

  // 更新时钟
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 监听 ESC 键退出
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/lottery-console');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* 隐藏的退出触发区域 - 左上角 */}
      <div
        className="absolute top-0 left-0 w-24 h-24 z-50 cursor-pointer"
        onMouseEnter={() => setShowExitButton(true)}
        onMouseLeave={() => setShowExitButton(false)}
      >
        {showExitButton && (
          <button
            onClick={() => navigate('/lottery-console')}
            className="absolute top-4 left-4 w-12 h-12 bg-red-600/80 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-sm"
            title="退出投屏 (或按 ESC 键)"
          >
            <X size={24} className="text-white" />
          </button>
        )}
      </div>

      {/* 顶部时间和日期 */}
      <div className="absolute top-8 right-12 text-right z-10">
        <div className="text-4xl font-mono font-bold text-white mb-2" style={{ fontFamily: 'Monaco, monospace' }}>
          {formatTime(currentTime)}
        </div>
        <div className="text-lg text-[#9CA3AF]">{formatDate(currentTime)}</div>
      </div>

      {/* 上半屏 - 当前考生 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-5xl text-[#9CA3AF] mb-8" style={{ fontFamily: 'PingFang SC, sans-serif' }}>请考生入场</div>
        
        {/* 签号 - 超大发光数字 */}
        <div
          className="text-[240px] font-mono font-bold mb-6"
          style={{
            fontFamily: 'Monaco, monospace',
            color: '#06B6D4',
            textShadow: '0 0 40px rgba(6, 182, 212, 0.8), 0 0 80px rgba(6, 182, 212, 0.4)',
            lineHeight: 1,
          }}
        >
          {currentCandidate ? String(currentCandidate.drawnNumber).padStart(2, '0') : '--'}
        </div>
        
        {/* 姓名 */}
        <div className="text-7xl font-bold text-white mb-4" style={{ fontFamily: 'PingFang SC, sans-serif' }}>
          {currentCandidate ? currentCandidate.name : '待定'}
        </div>
        
        {/* 提示文字 */}
        <div className="text-2xl text-[#9CA3AF] mt-8" style={{ fontFamily: 'PingFang SC, sans-serif' }}>
          请携带身份证和准考证进入面试室
        </div>
      </div>

      {/* 分隔线 */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#374151] to-transparent" />

      {/* 下半屏 - 下一位考生 */}
      <div className="flex-1 flex flex-col items-center justify-center opacity-80">
        <div className="text-2xl text-[#9CA3AF] mb-6" style={{ fontFamily: 'PingFang SC, sans-serif' }}>请准备</div>
        
        {nextCandidate ? (
          <div className="flex items-baseline gap-6">
            {nextCandidate.drawnNumber ? (
              <>
                <div className="text-6xl font-mono font-bold text-white" style={{ fontFamily: 'Monaco, monospace' }}>
                  {String(nextCandidate.drawnNumber).padStart(2, '0')}
                </div>
                <div className="text-5xl font-bold text-white" style={{ fontFamily: 'PingFang SC, sans-serif' }}>
                  {nextCandidate.name}
                </div>
              </>
            ) : (
              <div className="text-5xl font-bold text-white" style={{ fontFamily: 'PingFang SC, sans-serif' }}>
                {nextCandidate.name}（待抽签）
              </div>
            )}
          </div>
        ) : (
          <div className="text-5xl font-bold text-white" style={{ fontFamily: 'PingFang SC, sans-serif' }}>
            暂无
          </div>
        )}
      </div>

      {/* 底部进度条 */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 左侧装饰栏 */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#06B6D4] via-[#3B82F6] to-[#06B6D4]" />

      {/* 水印 */}
      <div className="absolute bottom-8 left-12 text-sm text-gray-700">
        研究生复试抽签系统 v2.0
      </div>

      {/* 背景网格效果 */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}