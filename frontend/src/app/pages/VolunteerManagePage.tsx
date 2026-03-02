// 志愿者管理页面 - 管理志愿者账号
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  X,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Users,
  Download,
  Upload,
  Calendar,
} from 'lucide-react';
import * as volunteerStorage from '../../storage/volunteerStorage';

export default function VolunteerManagePage() {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<volunteerStorage.Volunteer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<volunteerStorage.Volunteer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    email: '',
    password: '',
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setVolunteers(volunteerStorage.getAllVolunteers());
  };

  // 过滤志愿者
  const filteredVolunteers = volunteers.filter(
    (v) =>
      v.name.includes(searchQuery) ||
      v.username.includes(searchQuery) ||
      v.phone?.includes(searchQuery)
  );

  // 新建志愿者
  const handleCreateVolunteer = () => {
    if (!formData.name || !formData.username) {
      alert('请填写姓名和用户名');
      return;
    }

    // 检查用户名是否已存在
    const existingVolunteer = volunteerStorage.getVolunteerByUsername(formData.username);
    if (existingVolunteer) {
      alert('用户名已存在，请使用其他用户名');
      return;
    }

    // 如果没有填写密码，使用默认密码
    const defaultPassword = formData.password || '123456';

    const newVolunteer: volunteerStorage.Volunteer = {
      id: `volunteer-${Date.now()}`,
      name: formData.name,
      username: formData.username,
      password: defaultPassword,
      phone: formData.phone,
      email: formData.email,
      examRoomIds: [],
      createdAt: new Date().toLocaleString('zh-CN'),
      status: 'active',
    };

    volunteerStorage.addVolunteer(newVolunteer);
    loadData();
    
    // 显示成功提示
    alert(`志愿者账号创建成功！\n\n姓名：${newVolunteer.name}\n用户名：${newVolunteer.username}\n密码：${defaultPassword}\n\n请将账号信息告知志愿者。`);
    
    setShowNewModal(false);
    resetFormData();
  };

  // 编辑志愿者
  const handleEditVolunteer = () => {
    if (!selectedVolunteer || !formData.name || !formData.username) {
      alert('请填写必填信息');
      return;
    }

    // 如果用户名变了，检查是否与其他志愿者冲突
    if (formData.username !== selectedVolunteer.username) {
      const existingVolunteer = volunteerStorage.getVolunteerByUsername(formData.username);
      if (existingVolunteer && existingVolunteer.id !== selectedVolunteer.id) {
        alert('用户名已存在，请使用其他用户名');
        return;
      }
    }

    volunteerStorage.updateVolunteer(selectedVolunteer.id, {
      name: formData.name,
      username: formData.username,
      phone: formData.phone,
      email: formData.email,
      ...(formData.password ? { password: formData.password } : {}),
    });

    loadData();
    setShowEditModal(false);
    setSelectedVolunteer(null);
    resetFormData();
  };

  // 删除志愿者
  const handleDeleteVolunteer = () => {
    if (!selectedVolunteer) return;

    volunteerStorage.deleteVolunteer(selectedVolunteer.id);
    loadData();
    setShowDeleteConfirm(false);
    setSelectedVolunteer(null);
  };

  // 重置表单
  const resetFormData = () => {
    setFormData({ name: '', username: '', phone: '', email: '', password: '' });
  };

  // 导出志愿者数据
  const handleExport = () => {
    const csvHeader = '志愿者ID,姓名,用户名,手机号,邮箱,创建时间\n';
    const csvRows = filteredVolunteers
      .map((volunteer) => {
        return `${volunteer.id},${volunteer.name},${volunteer.username},${volunteer.phone || ''},${volunteer.email || ''},${volunteer.createdAt}`;
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `志愿者数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
    link.click();
  };

  // 导入志愿者数据
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
          const [id, name, username, phone, email, createdAt] = line.split(',');

          if (name && username) {
            // 检查用户名是否已存在
            const existingVolunteer = volunteerStorage.getVolunteerByUsername(username.trim());
            if (existingVolunteer) {
              console.log(`跳过重复用户名: ${username.trim()}`);
              return;
            }

            const newVolunteer: volunteerStorage.Volunteer = {
              id: id?.trim() || `volunteer-${Date.now()}-${Math.random()}`,
              name: name.trim(),
              username: username.trim(),
              password: '123456', // 导入时使用默认密码
              phone: phone?.trim() || '',
              email: email?.trim() || '',
              examRoomIds: [],
              createdAt: createdAt?.trim() || new Date().toLocaleString('zh-CN'),
              status: 'active',
            };

            volunteerStorage.addVolunteer(newVolunteer);
            importedCount++;
          }
        });

        loadData();
        alert(`成功导入 ${importedCount} 条志愿者数据`);
        setShowImportModal(false);
      } catch (error) {
        console.error('Import error:', error);
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
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
              <h1 className="text-xl font-bold text-[#111827]">志愿者管理</h1>
              <p className="text-xs text-[#9CA3AF]">管理志愿者账号，考场权限在分组管理中配置</p>
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  type="text"
                  placeholder="搜索志愿者姓名、用户名或手机号..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LotteryButton onClick={() => setShowNewModal(true)}>
                <Plus size={18} />
                新建志愿者
              </LotteryButton>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 mt-3 text-sm text-[#6B7280]">
            <span>共 {filteredVolunteers.length} 名志愿者</span>
          </div>
        </div>

        {/* 志愿者卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVolunteers.map((volunteer) => {
            return (
              <div
                key={volunteer.id}
                className="bg-white rounded-xl border border-[#E5E7EB] p-6 hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center">
                      <User size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#111827]">{volunteer.name}</h3>
                      <p className="text-xs text-[#9CA3AF]">@{volunteer.username}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 flex-1">
                  {volunteer.phone && (
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Phone size={14} className="text-[#9CA3AF]" />
                      {volunteer.phone}
                    </div>
                  )}
                  {volunteer.email && (
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Mail size={14} className="text-[#9CA3AF]" />
                      {volunteer.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <Calendar size={14} className="text-[#9CA3AF]" />
                    创建于 {volunteer.createdAt}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-4 border-t border-[#E5E7EB]">
                  <LotteryButton
                    onClick={() => {
                      setSelectedVolunteer(volunteer);
                      setFormData({
                        name: volunteer.name,
                        username: volunteer.username,
                        phone: volunteer.phone || '',
                        email: volunteer.email || '',
                        password: '',
                      });
                      setShowEditModal(true);
                    }}
                    className="flex-1 text-sm"
                  >
                    <Edit size={14} />
                    编辑
                  </LotteryButton>
                  <LotteryButton
                    variant="secondary"
                    onClick={() => {
                      setSelectedVolunteer(volunteer);
                      setShowDeleteConfirm(true);
                    }}
                    className="px-4 text-sm"
                  >
                    <Trash2 size={14} />
                  </LotteryButton>
                </div>
              </div>
            );
          })}
        </div>

        {filteredVolunteers.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl">
            <Users size={64} className="mx-auto text-[#D1D5DB] mb-4" />
            <p className="text-lg text-[#9CA3AF]">暂无志愿者数据</p>
            <p className="text-sm text-[#D1D5DB] mt-2">
              点击"新建志愿者"按钮创建第一个志愿者账号
            </p>
          </div>
        )}
      </div>

      {/* 新建志愿者弹窗 */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">新建志愿者</h3>
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
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入姓名"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="用于登录的用户名"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  手机号
                </label>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  placeholder="请输入邮箱"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  密码
                </label>
                <input
                  type="text"
                  placeholder="留空则使用默认密码 123456"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
                  如不填写，系统将使用默认密码：123456
                </p>
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
              <LotteryButton className="flex-1" onClick={handleCreateVolunteer}>
                创建账号
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 编辑志愿者弹窗 */}
      {showEditModal && selectedVolunteer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">编辑志愿者</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVolunteer(null);
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
                  志愿者ID
                </label>
                <input
                  type="text"
                  value={selectedVolunteer.id}
                  disabled
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-[#9CA3AF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  姓名 <span className="text-red-500">*</span>
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
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  手机号
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  新密码
                </label>
                <input
                  type="text"
                  placeholder="留空则不修改密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
                  如不需要修改密码，请留空
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVolunteer(null);
                  resetFormData();
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleEditVolunteer}>
                保存修改
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && selectedVolunteer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111827]">确认删除志愿者</h3>
                <p className="text-sm text-[#9CA3AF]">此操作不可撤销</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4 mb-4">
              <p className="text-sm text-[#991B1B]">
                您即将删除志愿者 <span className="font-bold">{selectedVolunteer.name}</span>{' '}
                (@{selectedVolunteer.username})
              </p>
            </div>

            <div className="flex gap-3">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedVolunteer(null);
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton
                variant="danger"
                className="flex-1"
                onClick={handleDeleteVolunteer}
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
              <h3 className="text-xl font-bold text-[#111827]">导入志愿者数据</h3>
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
                  <li>第一行为表头（志愿者ID,姓名,用户名,手机号,邮箱,创建时间）</li>
                  <li>导入时将使用默认密码 123456</li>
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
    </div>
  );
}