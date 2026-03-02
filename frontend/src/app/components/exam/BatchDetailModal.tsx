// 考场批次详情弹窗组件
import React from 'react';
import { X, Calendar, Clock, Users, MapPin } from 'lucide-react';
import { LotteryButton } from '../lottery/LotteryButton';
import * as examRoomStorage from '../../../storage/examRoomStorage';
import * as groupStorage from '../../../storage/groupStorage';
import * as batchStorage from '../../../storage/batchStorage';
import * as candidateStorage from '../../../storage/candidateStorage';

interface BatchDetailModalProps {
  examRoom: examRoomStorage.ExamRoom;
  onClose: () => void;
}

export function BatchDetailModal({ examRoom, onClose }: BatchDetailModalProps) {
  // 获取考场的所有分组
  const allGroups = groupStorage.getGroupsByExamRoomId(examRoom.id);

  // 按批次分组
  const groupsByBatch = allGroups.reduce((acc, group) => {
    const batchId = group.batchId;
    if (!acc[batchId]) {
      acc[batchId] = [];
    }
    acc[batchId].push(group);
    return acc;
  }, {} as Record<string, groupStorage.Group[]>);

  // 获取批次信息
  const batches = Object.keys(groupsByBatch).map((batchId) => {
    const batch = batchStorage.getBatchById(batchId);
    const groups = groupsByBatch[batchId];
    
    // 统计该批次的考生数量
    const totalCandidates = groups.reduce((sum, group) => {
      const candidates = candidateStorage.getCandidatesByGroupId(group.id);
      return sum + candidates.length;
    }, 0);

    // 统计已抽签数量
    const drawnCandidates = groups.reduce((sum, group) => {
      const candidates = candidateStorage.getCandidatesByGroupId(group.id);
      const drawnCount = candidates.filter((c) => c.status === 'drawn' || c.status === 'completed').length;
      return sum + drawnCount;
    }, 0);

    return {
      batchId, // 添加 batchId 用作 key
      batch,
      groups,
      totalCandidates,
      drawnCandidates,
    };
  });

  // 按日期排序（最新的在前）
  batches.sort((a, b) => {
    const dateA = a.groups[0]?.date || '';
    const dateB = b.groups[0]?.date || '';
    return dateB.localeCompare(dateA);
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center">
              <MapPin size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#111827]">{examRoom.name}</h3>
              <p className="text-sm text-[#9CA3AF]">{examRoom.location}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#111827] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 考场信息 */}
        <div className="bg-[#F9FAFB] rounded-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">楼栋楼层</p>
              <p className="text-sm font-medium text-[#111827]">
                {examRoom.building} · {examRoom.floor}层
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">容量</p>
              <p className="text-sm font-medium text-[#111827]">{examRoom.capacity}人</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">批次数量</p>
              <p className="text-sm font-medium text-[#111827]">{batches.length}个</p>
            </div>
          </div>
        </div>

        {/* 批次列表 */}
        {batches.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-[#111827]">批次列表</h4>
            {batches.map(({ batchId, batch, groups, totalCandidates, drawnCandidates }) => (
              <div
                key={batchId}
                className="border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* 批次信息 */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h5 className="text-base font-bold text-[#111827] mb-1">
                      {batch?.name || '未知批次'}
                    </h5>
                    <p className="text-sm text-[#9CA3AF]">
                      {batch?.academy} · {batch?.year}{batch?.semester}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      batch?.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : batch?.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {batch?.status === 'active'
                      ? '进行中'
                      : batch?.status === 'completed'
                      ? '已完成'
                      : '草稿'}
                  </span>
                </div>

                {/* 进度条 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-[#6B7280]">抽签进度</span>
                    <span className="font-medium text-[#111827]">
                      {drawnCandidates}/{totalCandidates} 人
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3B82F6] rounded-full transition-all"
                      style={{
                        width: `${totalCandidates > 0 ? (drawnCandidates / totalCandidates) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 分组列表 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#4B5563]">
                    分组详情 ({groups.length}个)
                  </p>
                  {groups.map((group) => {
                    const candidates = candidateStorage.getCandidatesByGroupId(group.id);
                    const drawn = candidates.filter(
                      (c) => c.status === 'drawn' || c.status === 'completed'
                    ).length;

                    return (
                      <div
                        key={group.id}
                        className="bg-[#F9FAFB] rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[#111827]">
                              {group.name}
                            </span>
                            <span className="text-xs text-[#9CA3AF]">
                              {group.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {group.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {group.time} - {group.endTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {examRoom.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-[#9CA3AF]">考生</p>
                            <p className="text-sm font-medium text-[#111827]">
                              {drawn}/{candidates.length}
                            </p>
                          </div>
                          <Users size={16} className="text-[#9CA3AF]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-[#D1D5DB] mb-3" />
            <p className="text-lg text-[#9CA3AF]">该考场暂无批次安排</p>
            <p className="text-sm text-[#D1D5DB] mt-1">
              请在分组管理中为考场分配批次
            </p>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex justify-end mt-6 pt-4 border-t border-[#E5E7EB]">
          <LotteryButton onClick={onClose}>关闭</LotteryButton>
        </div>
      </div>
    </div>
  );
}