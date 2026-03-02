// M4-考场配置管理（业务核心）
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import { BatchDetailModal } from '../components/exam/BatchDetailModal';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  Upload,
  MapPin,
  ArrowLeft,
  X,
  AlertTriangle,
  Building2,
  Layers,
  Eye,
  Calendar,
  Clock,
  Users,
} from 'lucide-react';
import * as examRoomStorage from '../../storage/examRoomStorage';
import * as groupStorage from '../../storage/groupStorage';
import * as batchStorage from '../../storage/batchStorage';
import * as candidateStorage from '../../storage/candidateStorage';

export default function ExamConfigPage() {
  const navigate = useNavigate();
  const [examRooms, setExamRooms] = useState<examRoomStorage.ExamRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<examRoomStorage.ExamRoom | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBatchDetailModal, setShowBatchDetailModal] = useState(false);

  // 新建/编辑考场表单数据
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    building: '',
    floor: '',
    capacity: '',
    facilities: '',
    description: '',
  });

  // 加载数据
  useEffect(() => {
    loadExamRooms();
  }, []);

  const loadExamRooms = () => {
    setExamRooms(examRoomStorage.getAllExamRooms());
  };

  // 获取所有楼栋
  const buildings = examRoomStorage.getAllBuildings();

  // 过滤考场
  const filteredRooms = examRooms.filter((room) => {
    const matchesSearch =
      (room.name || '').includes(searchQuery) ||
      (room.location || '').includes(searchQuery) ||
      (room.building || '').includes(searchQuery);

    const matchesBuilding =
      selectedBuildingFilter === 'all' || room.building === selectedBuildingFilter;

    const matchesStatus =
      selectedStatusFilter === 'all' || room.status === selectedStatusFilter;

    return matchesSearch && matchesBuilding && matchesStatus;
  });

  // 新建考场
  const handleCreateRoom = () => {
    if (!formData.name || !formData.location || !formData.building || !formData.floor || !formData.capacity) {
      alert('请填写所有必填项');
      return;
    }

    const newRoom: examRoomStorage.ExamRoom = {
      id: `room-${Date.now()}`,
      name: formData.name,
      location: formData.location,
      building: formData.building,
      floor: formData.floor,
      capacity: parseInt(formData.capacity),
      facilities: formData.facilities ? formData.facilities.split(',').map((f) => f.trim()) : [],
      status: 'active',
      createdAt: new Date().toLocaleString('zh-CN'),
      description: formData.description,
    };

    examRoomStorage.addExamRoom(newRoom);
    loadExamRooms();
    setShowNewModal(false);
    resetFormData();
  };

  // 编辑考场
  const handleEditRoom = () => {
    if (!selectedRoom || !formData.name || !formData.location || !formData.building || !formData.floor || !formData.capacity) {
      alert('请填写所有必填项');
      return;
    }

    examRoomStorage.updateExamRoom(selectedRoom.id, {
      name: formData.name,
      location: formData.location,
      building: formData.building,
      floor: formData.floor,
      capacity: parseInt(formData.capacity),
      facilities: formData.facilities ? formData.facilities.split(',').map((f) => f.trim()) : [],
      description: formData.description,
    });

    loadExamRooms();
    setShowEditModal(false);
    setSelectedRoom(null);
    resetFormData();
  };

  // 删除考场
  const handleDeleteRoom = () => {
    if (!selectedRoom) return;

    // 检查是否有批次关联该考场
    const relatedGroups = groupStorage.getGroupsByExamRoomId(selectedRoom.id);
    if (relatedGroups.length > 0) {
      alert(`无法删除：该考场下有 ${relatedGroups.length} 个分组，请先删除或移动分组`);
      return;
    }

    examRoomStorage.deleteExamRoom(selectedRoom.id);
    loadExamRooms();
    setShowDeleteConfirm(false);
    setSelectedRoom(null);
  };

  // 重置表单
  const resetFormData = () => {
    setFormData({
      name: '',
      location: '',
      building: '',
      floor: '',
      capacity: '',
      facilities: '',
      description: '',
    });
  };

  // 导出考场数据
  const handleExport = () => {
    const csvHeader = '考场ID,考场名称,位置,楼栋,楼层,容量,设施,状态,创建时间,备注\n';
    const csvRows = filteredRooms
      .map((room) => {
        const status = room.status === 'active' ? '启用' : '停用';
        const facilities = (room.facilities || []).join(';');
        return `${room.id},${room.name},${room.location},${room.building},${room.floor},${room.capacity},${facilities},${status},${room.createdAt},${room.description || ''}`;
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `考场数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
    link.click();
  };

  // 导入考场数据
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());

        // 跳过表头
        const dataLines = lines.slice(1);

        let importedCount = 0;
        dataLines.forEach((line) => {
          const [id, name, location, building, floor, capacity, facilities, status, createdAt, description] = line.split(',');

          if (name && location && building && floor && capacity) {
            const newRoom: examRoomStorage.ExamRoom = {
              id: id || `room-${Date.now()}-${Math.random()}`,
              name: name.trim(),
              location: location.trim(),
              building: building.trim(),
              floor: floor.trim(),
              capacity: parseInt(capacity.trim()) || 30,
              facilities: facilities ? facilities.split(';').map((f) => f.trim()) : [],
              status: status?.includes('停用') ? 'inactive' : 'active',
              createdAt: createdAt?.trim() || new Date().toLocaleString('zh-CN'),
              description: description?.trim() || '',
            };

            examRoomStorage.addExamRoom(newRoom);
            importedCount++;
          }
        });

        loadExamRooms();
        alert(`成功导入 ${importedCount} 条考场数据`);
        setShowImportModal(false);
      } catch (error) {
        console.error('Import error:', error);
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  // 获取考场使用的批次数量
  const getRoomBatchCount = (roomId: string): number => {
    return groupStorage.getGroupsByExamRoomId(roomId).length;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* 顶部导航 */}
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
              <h1 className="text-xl font-bold text-[#111827]">考场配置</h1>
              <p className="text-xs text-[#9CA3AF]">管理考场基础信息</p>
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
                  placeholder="搜索考场名称、位置或楼栋..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
                />
              </div>

              {/* 楼栋筛选 */}
              <div className="relative">
                <select
                  value={selectedBuildingFilter}
                  onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] appearance-none bg-white"
                >
                  <option value="all">全部楼栋</option>
                  {buildings.map((building) => (
                    <option key={building} value={building}>
                      {building}
                    </option>
                  ))}
                </select>
                <Building2
                  size={16}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
                />
              </div>

              {/* 状态筛选 */}
              <div className="relative">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] appearance-none bg-white"
                >
                  <option value="all">全部状态</option>
                  <option value="active">启用</option>
                  <option value="inactive">停用</option>
                </select>
                <Filter
                  size={16}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LotteryButton onClick={() => setShowNewModal(true)}>
                <Plus size={18} />
                新建考场
              </LotteryButton>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 mt-3 text-sm text-[#6B7280]">
            <span>共 {filteredRooms.length} 个考场</span>
            <span>•</span>
            <span>
              {filteredRooms.filter((r) => r.status === 'active').length} 个启用中
            </span>
            <span>•</span>
            <span>总容量 {filteredRooms.reduce((sum, r) => sum + r.capacity, 0)} 人</span>
          </div>
        </div>

        {/* 考场卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => {
            const batchCount = getRoomBatchCount(room.id);
            return (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-[#E5E7EB] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center">
                      <MapPin size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#111827]">{room.name}</h3>
                      <p className="text-xs text-[#9CA3AF]">{room.id}</p>
                    </div>
                  </div>
                  {/* 启用/停用开关 */}
                  <button
                    onClick={() => {
                      examRoomStorage.updateExamRoom(room.id, {
                        status: room.status === 'active' ? 'inactive' : 'active',
                      });
                      loadExamRooms();
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 ${
                      room.status === 'active' ? 'bg-[#10B981]' : 'bg-[#E5E7EB]'
                    }`}
                    title={room.status === 'active' ? '点击停用' : '点击启用'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        room.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <MapPin size={14} className="text-[#9CA3AF]" />
                    {room.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <Building2 size={14} className="text-[#9CA3AF]" />
                    {room.building} · {room.floor}层
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <Layers size={14} className="text-[#9CA3AF]" />
                    容量：{room.capacity}人
                  </div>
                </div>

                {(room.facilities || []).length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {(room.facilities || []).map((facility) => (
                        <span
                          key={`${room.id}-${facility}`}
                          className="px-2 py-1 text-xs bg-[#EFF6FF] text-[#1E40AF] rounded"
                        >
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setShowBatchDetailModal(true);
                    }}
                    className="text-sm text-[#3B82F6] hover:text-[#1E40AF] font-medium flex items-center gap-1"
                  >
                    <Eye size={14} />
                    {batchCount > 0 ? `查看 ${batchCount} 个批次` : '查看批次'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setFormData({
                          name: room.name,
                          location: room.location,
                          building: room.building,
                          floor: room.floor,
                          capacity: room.capacity.toString(),
                          facilities: (room.facilities || []).join(', '),
                          description: room.description || '',
                        });
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1.5 text-sm text-[#3B82F6] hover:bg-[#EFF6FF] rounded transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setShowDeleteConfirm(true);
                      }}
                      className="px-3 py-1.5 text-sm text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredRooms.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl">
            <MapPin size={64} className="mx-auto text-[#D1D5DB] mb-4" />
            <p className="text-lg text-[#9CA3AF]">暂无考场数据</p>
            <p className="text-sm text-[#D1D5DB] mt-2">
              点击"新建考场"按钮创建第一个考场
            </p>
          </div>
        )}
      </div>

      {/* 新建考场弹窗 */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">新建考场</h3>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  resetFormData();
                }}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  考场名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：机械楼301"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  位置 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：机械楼3楼301室"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4B5563] mb-2">
                    楼栋 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="如：机械楼"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4B5563] mb-2">
                    楼层 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="如：3"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  容量（人数） <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="30"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  设施（逗号分隔）
                </label>
                <input
                  type="text"
                  placeholder="投影仪, 白板, 音响, 空调"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  备注
                </label>
                <textarea
                  placeholder="考场描述或其他备注信息"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowNewModal(false);
                  resetFormData();
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleCreateRoom}>
                创建场
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 编辑考场弹窗 */}
      {showEditModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">编辑考场</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRoom(null);
                  resetFormData();
                }}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  考场ID
                </label>
                <input
                  type="text"
                  value={selectedRoom.id}
                  disabled
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-[#9CA3AF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  考场名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  位置 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4B5563] mb-2">
                    楼栋 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4B5563] mb-2">
                    楼层 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  容量（人数） <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  设施（逗号分隔）
                </label>
                <input
                  type="text"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  备注
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRoom(null);
                  resetFormData();
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleEditRoom}>
                保存修改
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111827]">确认删除考场</h3>
                <p className="text-sm text-[#9CA3AF]">此操作不可撤销</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4 mb-4">
              <p className="text-sm text-[#991B1B]">
                您即将删除考场 <span className="font-bold">{selectedRoom.name}</span>
              </p>
              {getRoomBatchCount(selectedRoom.id) > 0 && (
                <p className="text-sm text-[#991B1B] mt-2">
                  <strong>警告：</strong>该考场下有{' '}
                  {getRoomBatchCount(selectedRoom.id)} 个分组！
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedRoom(null);
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton
                variant="danger"
                className="flex-1"
                onClick={handleDeleteRoom}
              >
                确认删除
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">导入考场数据</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4">
                <p className="text-sm text-[#1E40AF] mb-2">
                  <strong>CSV 文件格式要求：</strong>
                </p>
                <ul className="text-xs text-[#1E40AF] space-y-1 list-disc list-inside">
                  <li>第一行为表头（考场ID,考场名称,置,楼栋,楼层,容量,设施,状态,创建时间,备注）</li>
                  <li>设施使用分号(;)分隔，如：投影仪;白板;音响</li>
                  <li>状态填写"启用"或"停用"</li>
                  <li>文件编码为 UTF-8</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  选择 CSV 文件
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowImportModal(false)}
              >
                取消
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 批次详情弹窗 */}
      {showBatchDetailModal && selectedRoom && (
        <BatchDetailModal
          examRoom={selectedRoom}
          onClose={() => {
            setShowBatchDetailModal(false);
            setSelectedRoom(null);
          }}
        />
      )}
    </div>
  );
}