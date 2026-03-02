// 面试批次管理页面
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import { DateTimePicker } from '../components/DateTimePicker';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  FolderOpen,
  ArrowLeft,
  X,
  AlertTriangle,
  Download,
  Users,
  Layers,
} from 'lucide-react';
import * as batchStorage from '../../storage/batchStorage';
import * as groupStorage from '../../storage/groupStorage';
import * as candidateStorage from '../../storage/candidateStorage';
import * as examRoomStorage from '../../storage/examRoomStorage';
import * as volunteerStorage from '../../storage/volunteerStorage';
import * as XLSX from 'xlsx';

export default function BatchManagePage() {
  const navigate = useNavigate();
  
  const [batches, setBatches] = useState<batchStorage.Batch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<batchStorage.Batch | null>(null);

  // 新建/编辑批次的表单数据
  const [formData, setFormData] = useState({
    yearMonth: '',
    batchName: '',
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allBatches = batchStorage.getAllBatches();
    
    // 为每个批次更新统计数据
    allBatches.forEach((batch) => {
      const batchGroups = groupStorage.getGroupsByBatchId(batch.id);
      const totalGroups = batchGroups.length;
      const totalCandidates = candidateStorage.getCandidatesByBatchId(batch.id, batchGroups).length;
      if (batch.totalGroups !== totalGroups || batch.totalCandidates !== totalCandidates) {
        batchStorage.updateBatchStats(batch.id, totalGroups, totalCandidates);
      }
    });
    
    setBatches(batchStorage.getAllBatches());
  };

  // 过滤批次
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch =
      batch.name.includes(searchQuery) ||
      batch.year.includes(searchQuery) ||
      batch.semester.includes(searchQuery);

    return matchesSearch;
  });

  // 统计数据
  const totalGroups = filteredBatches.reduce((sum, b) => sum + (b.totalGroups || 0), 0);
  const totalCandidates = filteredBatches.reduce((sum, b) => sum + (b.totalCandidates || 0), 0);

  // 新建批次
  const handleCreateBatch = () => {
    if (!formData.yearMonth || !formData.batchName) {
      alert('请填写完整信息');
      return;
    }

    const [year, month] = formData.yearMonth.split('-');
    const semester = parseInt(month) <= 6 ? '春季' : '秋季';

    const newBatch: batchStorage.Batch = {
      id: `batch-${Date.now()}`,
      name: formData.batchName,
      year: year,
      semester: semester,
      academy: '机械工程学院',
      startDate: `${formData.yearMonth}-01`,
      endDate: `${formData.yearMonth}-28`,
      status: 'draft',
      createdAt: new Date().toLocaleString('zh-CN'),
      totalGroups: 0,
      totalCandidates: 0,
    };

    batchStorage.addBatch(newBatch);
    loadData();
    setShowNewModal(false);
    setFormData({ yearMonth: '', batchName: '' });
  };

  // 编辑批次
  const handleEditBatch = () => {
    if (!selectedBatch || !formData.yearMonth || !formData.batchName) {
      alert('请填写完整信息');
      return;
    }

    const [year, month] = formData.yearMonth.split('-');
    const semester = parseInt(month) <= 6 ? '春季' : '秋季';

    batchStorage.updateBatch(selectedBatch.id, {
      name: formData.batchName,
      year: year,
      semester: semester,
      startDate: `${formData.yearMonth}-01`,
      endDate: `${formData.yearMonth}-28`,
    });

    loadData();
    setShowEditModal(false);
    setSelectedBatch(null);
    setFormData({ yearMonth: '', batchName: '' });
  };

  // 删除批次
  const handleDeleteBatch = () => {
    if (!selectedBatch) return;
    
    // 删除批次下的所有分组
    groupStorage.deleteGroupsByBatchId(selectedBatch.id);
    
    // 删除批次
    batchStorage.deleteBatch(selectedBatch.id);
    
    loadData();
    setShowDeleteConfirm(false);
    setSelectedBatch(null);
  };

  // 查看批次分组
  const handleViewGroups = (batch: batchStorage.Batch) => {
    navigate(`/group-manage?batchId=${batch.id}&batchNo=${batch.year}${batch.semester}`);
  };

  // 导出批次数据（优化为Excel格式）
  const handleExportBatch = (batch: batchStorage.Batch) => {
    const batchGroups = groupStorage.getGroupsByBatchId(batch.id);
    
    if (batchGroups.length === 0) {
      alert('该批次暂无分组数据');
      return;
    }

    // 准备导出数据
    const exportData: any[] = [];

    batchGroups.forEach((group) => {
      const groupCandidates = candidateStorage.getCandidatesByGroupId(group.id);
      const examRoom = examRoomStorage.getExamRoomById(group.examRoomId);
      
      // 获取该分组的志愿者名单
      const volunteerNames = (group.volunteerIds || [])
        .map(id => {
          const volunteer = volunteerStorage.getVolunteerById(id);
          return volunteer?.name;
        })
        .filter(Boolean)
        .join('、') || '未配置';

      groupCandidates.forEach((candidate) => {
        const statusText = 
          candidate.status === 'waiting' ? '待抽签' : 
          candidate.status === 'drawn' ? '已抽签' : 
          candidate.status === 'completed' ? '已完成' : '缺考';

        exportData.push({
          '批次名称': batch.name,
          '学院': batch.academy,
          '分组名称': group.name,
          '分组描述': group.description || '',
          '面试日期': group.date || '',
          '面试时间': group.endTime ? `${group.time}-${group.endTime}` : group.time || '',
          '面试地点': examRoom?.name || '',
          '考场位置': examRoom?.location || '',
          '志愿者': volunteerNames,
          '姓名': candidate.name,
          '身份证号': candidate.idCard,
          '报名编号': candidate.registrationNo || '',
          '考生号': candidate.candidateNo || '',
          '手机号': candidate.phone || '',
          '状态': statusText,
        });
      });
    });

    if (exportData.length === 0) {
      alert('该批次暂无考生数据');
      return;
    }

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    const colWidths = [
      { wch: 30 }, // 批次名称
      { wch: 20 }, // 学院
      { wch: 25 }, // 分组名称
      { wch: 20 }, // 分组描述
      { wch: 12 }, // 面试日期
      { wch: 15 }, // 面试时间
      { wch: 20 }, // ��试地点
      { wch: 25 }, // 考场位置
      { wch: 20 }, // 志愿者
      { wch: 10 }, // 姓名
      { wch: 20 }, // 身份证号
      { wch: 15 }, // 报名编号
      { wch: 15 }, // 考生号
      { wch: 12 }, // 手机号
      { wch: 10 }, // 状态
    ];
    worksheet['!cols'] = colWidths;

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '批次数据');
    
    // 生成文件名
    const fileName = `批次数据_${batch.year}${batch.semester}_${batch.name}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    
    // 导出文件
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin-home')}
              className="text-[#9CA3AF] hover:text-[#111827]"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#111827]">面试批次管理</h1>
              <p className="text-xs text-[#9CA3AF]">管理所有面试批次</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LotteryButton onClick={() => navigate('/admin-home')}>
              返回主页
            </LotteryButton>
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="max-w-7xl mx-auto p-6">
        {/* 操作栏 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  type="text"
                  placeholder="搜索批次名称、年份..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
                />
              </div>
            </div>

            <LotteryButton
              onClick={() => {
                setFormData({ yearMonth: '', batchName: '' });
                setShowNewModal(true);
              }}
            >
              <Plus size={18} />
              新建批次
            </LotteryButton>
          </div>

          {/* 统计 */}
          <div className="flex items-center gap-4 mt-3 text-sm text-[#6B7280]">
            <span>共 {filteredBatches.length} 个批次</span>
            <span>•</span>
            <span>{totalGroups} 个分组</span>
            <span>•</span>
            <span>{totalCandidates} 名考生</span>
          </div>
        </div>

        {/* 批次列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white rounded-xl border border-[#E5E7EB] p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center">
                    <FolderOpen size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#111827] text-lg">
                      {batch.year}{batch.semester}
                    </h4>
                    <p className="text-xs text-[#9CA3AF]">{batch.academy}</p>
                  </div>
                </div>
              </div>

              <h5 className="text-sm font-semibold text-[#111827] mb-4 line-clamp-2 min-h-[2.5rem]">
                {batch.name}
              </h5>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#F3F4F6] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers size={14} className="text-[#3B82F6]" />
                    <span className="text-xs text-[#9CA3AF]">分组</span>
                  </div>
                  <div className="text-xl font-bold text-[#3B82F6]">
                    {batch.totalGroups || 0}
                  </div>
                </div>
                <div className="bg-[#F3F4F6] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-[#059669]" />
                    <span className="text-xs text-[#9CA3AF]">考生</span>
                  </div>
                  <div className="text-xl font-bold text-[#059669]">
                    {batch.totalCandidates || 0}
                  </div>
                </div>
              </div>

              <div className="text-xs text-[#9CA3AF] mb-4 flex items-center gap-1">
                <Calendar size={12} />
                {batch.createdAt}
              </div>

              <div className="flex gap-2">
                <LotteryButton
                  onClick={() => handleViewGroups(batch)}
                  className="flex-1 text-xs py-2"
                >
                  <Eye size={14} />
                  查看分组
                </LotteryButton>
                <button
                  onClick={() => {
                    setSelectedBatch(batch);
                    setFormData({
                      yearMonth: `${batch.year}-${batch.semester === '春季' ? '03' : '09'}`,
                      batchName: batch.name,
                    });
                    setShowEditModal(true);
                  }}
                  className="px-3 py-2 text-[#9CA3AF] hover:text-[#3B82F6] transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleExportBatch(batch)}
                  className="px-3 py-2 text-[#9CA3AF] hover:text-[#10B981] transition-colors"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => {
                    setSelectedBatch(batch);
                    setShowDeleteConfirm(true);
                  }}
                  className="px-3 py-2 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredBatches.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl">
            <FolderOpen size={64} className="mx-auto text-[#D1D5DB] mb-4" />
            <p className="text-lg text-[#9CA3AF]">暂无批次数据</p>
            <p className="text-sm text-[#D1D5DB] mt-2">
              点击"新建批次"按钮创建第一个面试批次
            </p>
          </div>
        )}
      </div>

      {/* 新建批次弹窗 */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">新建面试批次</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  批次年月 <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  value={formData.yearMonth}
                  onChange={(value) =>
                    setFormData({ ...formData, yearMonth: value })
                  }
                  type="month"
                  placeholder="请选择批次年月"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  批次名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：2024年春季博士研究生复试"
                  value={formData.batchName}
                  onChange={(e) =>
                    setFormData({ ...formData, batchName: e.target.value })
                  }
                  className="w-full px-4 py-2 text-[#111827] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowNewModal(false)}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleCreateBatch}>
                创建批次
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 编辑批次弹窗 */}
      {showEditModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">编辑批次信息</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedBatch(null);
                }}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  批次编号
                </label>
                <input
                  type="text"
                  value={`${selectedBatch.year}${selectedBatch.semester}`}
                  disabled
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-[#9CA3AF]"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">批次编号不可修改</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  批次年月 <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  value={formData.yearMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, yearMonth: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  批次名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.batchName}
                  onChange={(e) =>
                    setFormData({ ...formData, batchName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedBatch(null);
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleEditBatch}>
                保存修改
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111827]">确认删除批次</h3>
                <p className="text-sm text-[#9CA3AF]">此操作不可撤销</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4 mb-4">
              <p className="text-sm text-[#991B1B]">
                您即将删除批次{' '}
                <span className="font-bold">{selectedBatch.year}{selectedBatch.semester}</span> -{' '}
                {selectedBatch.name}
              </p>
              {selectedBatch.totalGroups > 0 && (
                <p className="text-sm text-[#991B1B] mt-2">
                  <strong>警告</strong>该批次下有 {selectedBatch.totalGroups}{' '}
                  个分组，删除后所有分组和考生数据将一并删除！
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedBatch(null);
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton
                variant="danger"
                className="flex-1"
                onClick={handleDeleteBatch}
              >
                确认删除
              </LotteryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}