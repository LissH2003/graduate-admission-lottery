// 通讯录管理页面 - 统一管理管理员和志愿者账号
// 使用 lottery_volunteers 统一表，通过 role 字段区分身份
import { useState, useEffect } from 'react';
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
  Users,
  Upload,
  Download,
  Building,
  Shield,
  CheckCircle,
  XCircle,
  IdCard,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';

// 通讯录用户类型
interface ContactUser {
  id: string;
  loginId: string;       // SSO学工号
  username: string;      // 登录用户名
  name: string;
  role: 'admin' | 'volunteer';
  academyId: string;
  academyName: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// 学院类型
interface Academy {
  id: string;
  name: string;
}

export default function VolunteerManagePage() {
  const navigate = useNavigate();
  const { currentAcademy } = useAppContext();
  const [users, setUsers] = useState<ContactUser[]>([]);
  const [, setAcademies] = useState<Academy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 弹窗状态
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ContactUser | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    loginId: '',           // SSO学工号
    name: '',
    username: '',          // 登录用户名
    phone: '',
    email: '',
    password: '',
    role: 'volunteer' as 'admin' | 'volunteer',
    academyId: '',
    status: 'active' as 'active' | 'inactive',
  });

  // 加载数据
  useEffect(() => {
    loadData();
    loadAcademies();
  }, []);

  // 加载学院列表
  const loadAcademies = async () => {
    try {
      const { data, error } = await supabase
        .from('lottery_academies')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setAcademies(data || []);
    } catch (error) {
      console.error('加载学院失败:', error);
    }
  };

  // 加载通讯录数据（统一从 lottery_volunteers 查询）
  const loadData = async () => {
    setLoading(true);
    try {
      // 获取当前学院ID（如果有）
      const currentAcademyId = currentAcademy?.id;

      // 统一从 lottery_volunteers 查询
      let query = supabase
        .from('lottery_volunteers')
        .select('id, login_id, username, name, phone, email, status, created_at, role, academy_id')
        .order('created_at', { ascending: false });

      // 如果有当前学院，过滤本学院数据
      if (currentAcademyId) {
        query = query.eq('academy_id', currentAcademyId);
      }

      const { data: usersData, error } = await query;

      if (error) throw error;

      // 获取学院名称映射
      const { data: academiesData } = await supabase
        .from('lottery_academies')
        .select('id, name') as { data: { id: string; name: string }[] | null; error: Error | null };
      
      const academyMap = new Map(academiesData?.map(a => [a.id, a.name]) || []);

      // 转换数据
      const contactUsers: ContactUser[] = ((usersData || []) as Record<string, unknown>[]).map(user => ({
        id: user.id as string,
        loginId: (user.login_id as string) || '',
        username: user.username as string,
        name: user.name as string,
        role: user.role as 'admin' | 'volunteer',
        academyId: (user.academy_id as string) || '',
        academyName: academyMap.get(user.academy_id as string) || '未知学院',
        phone: (user.phone as string) || '',
        email: (user.email as string) || '',
        status: user.status as 'active' | 'inactive',
        createdAt: user.created_at as string,
      }));

      setUsers(contactUsers);
    } catch (error) {
      console.error('加载通讯录失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 过滤用户
  const filteredUsers = users.filter(
    (u) =>
      u.name.includes(searchQuery) ||
      u.loginId.includes(searchQuery) ||
      u.username.includes(searchQuery) ||
      u.phone?.includes(searchQuery) ||
      u.email?.includes(searchQuery) ||
      u.academyName.includes(searchQuery)
  );

  // 检查用户名是否已存在
  const checkUsernameExists = async (username: string, excludeId?: string): Promise<boolean> => {
    const { data } = await supabase
      .from('lottery_volunteers')
      .select('id')
      .eq('username', username)
      .maybeSingle() as { data: { id: string } | null; error: Error | null };
    
    if (data && data.id !== excludeId) return true;
    return false;
  };

  // 检查学工号是否已存在
  const checkLoginIdExists = async (loginId: string, excludeId?: string): Promise<boolean> => {
    if (!loginId) return false;
    const { data } = await supabase
      .from('lottery_volunteers')
      .select('id')
      .eq('login_id', loginId)
      .maybeSingle() as { data: { id: string } | null; error: Error | null };
    
    if (data && data.id !== excludeId) return true;
    return false;
  };

  // 新建用户
  const handleCreateUser = async () => {
    if (!formData.name || !formData.username) {
      toast.warning('请填写姓名和登录用户名');
      return;
    }

    if (!formData.academyId) {
      toast.warning('请选择所属学院');
      return;
    }

    // 检查用户名是否已存在
    const usernameExists = await checkUsernameExists(formData.username);
    if (usernameExists) {
      toast.error('登录用户名已存在，请使用其他用户名');
      return;
    }

    // 检查学工号是否已存在
    if (formData.loginId) {
      const loginIdExists = await checkLoginIdExists(formData.loginId);
      if (loginIdExists) {
        toast.error('学工号已存在，请检查是否重复');
        return;
      }
    }

    const defaultPassword = formData.password || '123456';

    try {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('lottery_volunteers')
        .insert({
          login_id: formData.loginId || null,
          username: formData.username,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          password_hash: defaultPassword, // 明文存储
          role: formData.role,
          status: formData.status,
          academy_id: formData.academyId || null,
        });

      if (error) throw error;

      toast.success(`账号创建成功！姓名：${formData.name}，用户名：${formData.username}`);
      setShowNewModal(false);
      resetFormData();
      loadData();
    } catch (error) {
      console.error('创建用户失败:', error);
      toast.error('创建失败，请检查网络连接');
    }
  };

  // 编辑用户
  const handleEditUser = async () => {
    if (!selectedUser || !formData.name || !formData.username) {
      toast.warning('请填写必填信息');
      return;
    }

    // 如果用户名变了，检查是否冲突
    if (formData.username !== selectedUser.username) {
      const exists = await checkUsernameExists(formData.username, selectedUser.id);
      if (exists) {
        toast.error('登录用户名已存在，请使用其他用户名');
        return;
      }
    }

    // 如果学工号变了，检查是否冲突
    if (formData.loginId && formData.loginId !== selectedUser.loginId) {
      const exists = await checkLoginIdExists(formData.loginId, selectedUser.id);
      if (exists) {
        toast.error('学工号已存在，请检查是否重复');
        return;
      }
    }

    try {
      const updateData = {
        login_id: formData.loginId || null,
        username: formData.username,
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        status: formData.status,
        academy_id: formData.academyId || null,
        ...(formData.password ? { password_hash: formData.password } : {}),
      };

      const supabaseAny = supabase as any;
      await supabaseAny
        .from('lottery_volunteers')
        .update(updateData)
        .eq('id', selectedUser.id);

      toast.success('修改成功');
      setShowEditModal(false);
      setSelectedUser(null);
      resetFormData();
      loadData();
    } catch (error) {
      console.error('更新用户失败:', error);
      toast.error('更新失败');
    }
  };

  // 删除用户
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // 先删除关联表（如果是志愿者角色）
      if (selectedUser.role === 'volunteer') {
        await supabase.from('lottery_volunteer_exam_rooms').delete().eq('volunteer_id', selectedUser.id);
      }
      
      // 删除用户
      await supabase.from('lottery_volunteers').delete().eq('id', selectedUser.id);

      toast.success('删除成功');
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      loadData();
    } catch (error) {
      console.error('删除用户失败:', error);
      toast.error('删除失败');
    }
  };

  // 重置表单
  const resetFormData = () => {
    setFormData({
      loginId: '',
      name: '',
      username: '',
      phone: '',
      email: '',
      password: '',
      role: 'volunteer',
      academyId: currentAcademy?.id || '',  // 自动使用当前学院
      status: 'active',
    });
  };

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const templateData = [
      { 学工号: '2024001', 登录用户名: 'zhangsan', 姓名: '张三', 角色: '志愿者', 手机号: '13800138000', 邮箱: 'zhangsan@example.com' },
      { 学工号: 'T001', 登录用户名: 'admin01', 姓名: '李老师', 角色: '管理员', 手机号: '13800138001', 邮箱: 'teacher@example.com' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '通讯录导入模板');

    worksheet['!cols'] = [
      { wch: 12 }, // 学工号
      { wch: 12 }, // 登录用户名
      { wch: 10 }, // 姓名
      { wch: 12 }, // 角色
      { wch: 12 }, // 手机号
      { wch: 20 }, // 邮箱
    ];

    // 添加注释说明
    const noteData = [
      { 字段说明: '学工号（login_id）', 必填: '否', 说明: 'SSO统一身份认证学工号，建议填写' },
      { 字段说明: '登录用户名（username）', 必填: '是', 说明: '系统登录账号，不可重复' },
      { 字段说明: '姓名（name）', 必填: '是', 说明: '真实姓名' },
      { 字段说明: '角色（role）', 必填: '是', 说明: '管理员 或 admin、志愿者 或 volunteer' },
      { 字段说明: '手机号（phone）', 必填: '否', 说明: '联系电话' },
      { 字段说明: '邮箱（email）', 必填: '否', 说明: '电子邮箱' },
      { 字段说明: '学院', 必填: '自动', 说明: '自动使用当前所在学院，无需填写' },
    ];
    const noteSheet = XLSX.utils.json_to_sheet(noteData);
    XLSX.utils.book_append_sheet(workbook, noteSheet, '填写说明');

    XLSX.writeFile(workbook, `通讯录导入模板_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
    toast.success('模板下载成功');
  };

  // 导入通讯录数据
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // 检查是否有当前学院
    if (!currentAcademy?.id) {
      toast.error('请先选择学院，导入的用户将自动归属到当前学院');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
          学工号?: string;
          登录用户名?: string;
          姓名?: string;
          角色?: string;
          手机号?: string;
          邮箱?: string;
          login_id?: string;
          username?: string;
          name?: string;
          role?: string;
          phone?: string;
          email?: string;
        }>;

        let importedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const row of jsonData) {
          // 支持中英文表头
          const loginId = (row.学工号 || row.login_id || '').toString().trim();
          const username = (row.登录用户名 || row.username || '').toString().trim();
          const name = (row.姓名 || row.name || '').toString().trim();
          
          // 严格校验 role 值，只允许 'admin' 或 'volunteer'
          let roleInput = (row.角色 || row.role || 'volunteer').toString().trim().toLowerCase();
          let role: 'admin' | 'volunteer';
          if (roleInput === 'admin' || roleInput === '管理员') {
            role = 'admin';
          } else if (roleInput === 'volunteer' || roleInput === '志愿者' || roleInput === 'teacher' || roleInput === '学生') {
            role = 'volunteer';
          } else {
            // 未知角色默认设为 volunteer
            console.warn(`[导入] 未知角色 "${roleInput}"，默认设为 volunteer，用户名: ${username}`);
            role = 'volunteer';
          }
          
          const phone = (row.手机号 || row.phone || '').toString().trim();
          const email = (row.邮箱 || row.email || '').toString().trim();

          if (!username || !name) {
            errorCount++;
            continue;
          }

          // 检查用户名是否已存在
          const usernameExists = await checkUsernameExists(username);
          if (usernameExists) {
            skippedCount++;
            continue;
          }

          // 检查学工号是否已存在
          if (loginId) {
            const loginIdExists = await checkLoginIdExists(loginId);
            if (loginIdExists) {
              skippedCount++;
              continue;
            }
          }

          try {
            const supabaseAny = supabase as any;
            await supabaseAny.from('lottery_volunteers').insert({
              login_id: loginId || null,
              username,
              name,
              phone: phone || null,
              email: email || null,
              password_hash: '123456',
              role,
              status: 'active',
              academy_id: currentAcademy.id,  // 使用当前学院
            });

            importedCount++;
          } catch (error) {
            console.error('导入行失败:', error);
            errorCount++;
          }
        }

        loadData();
        
        let msg = '';
        if (importedCount > 0) msg += `成功导入 ${importedCount} 条`;
        if (skippedCount > 0) msg += `${msg ? '，' : ''}跳过 ${skippedCount} 条重复`;
        if (errorCount > 0) msg += `${msg ? '，' : ''}${errorCount} 条失败`;
        
        if (importedCount > 0) {
          toast.success(msg);
        } else if (skippedCount > 0) {
          toast.warning(msg);
        } else {
          toast.error('导入失败，请检查文件格式');
        }
        
        setShowImportModal(false);
        event.target.value = '';
      } catch (error) {
        console.error('Import error:', error);
        toast.error('导入失败，请检查文件格式是否为 Excel (.xlsx)');
      }
    };
    reader.readAsBinaryString(file);
  };

  // 角色显示文本
  const getRoleText = (role: string) => {
    return role === 'admin' ? '管理员' : '志愿者';
  };

  // 角色图标
  const getRoleIcon = (role: string) => {
    return role === 'admin' ? <Shield size={14} className="text-[#DC2626]" /> : <User size={14} className="text-[#059669]" />;
  };

  // 状态显示
  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#DCFCE7] text-[#166534] rounded-full text-xs">
          <CheckCircle size={12} />
          启用
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEE2E2] text-[#991B1B] rounded-full text-xs">
        <XCircle size={12} />
        禁用
      </span>
    );
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
              <h1 className="text-xl font-bold text-[#111827]">通讯录管理</h1>
              <p className="text-xs text-[#9CA3AF]">统一管理管理员和志愿者账号</p>
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
                  placeholder="搜索姓名、学工号、用户名或学院..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#374151] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
              >
                <Upload size={16} />
                批量导入
              </button>
              <LotteryButton onClick={() => {
                resetFormData();
                setShowNewModal(true);
              }}>
                <Plus size={18} />
                新建账号
              </LotteryButton>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 mt-3 text-sm text-[#6B7280]">
            <span>共 {filteredUsers.length} 人</span>
            <span className="text-[#D1D5DB]">|</span>
            <span>管理员 {filteredUsers.filter(u => u.role === 'admin').length} 人</span>
            <span className="text-[#D1D5DB]">|</span>
            <span>志愿者 {filteredUsers.filter(u => u.role === 'volunteer').length} 人</span>
          </div>
        </div>

        {/* 数据表格 */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">学工号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">登录用户名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">姓名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">角色</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">学院</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">联系方式</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <IdCard size={14} className="text-[#9CA3AF]" />
                        <span className="text-sm font-medium text-[#111827]">{user.loginId || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-[#6B7280]">{user.username}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{user.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-[#111827]">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getRoleIcon(user.role)}
                        <span className="text-sm text-[#6B7280]">{getRoleText(user.role)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Building size={14} className="text-[#9CA3AF]" />
                        <span className="text-sm text-[#6B7280]">{user.academyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-[#6B7280]">
                        {user.phone && <div>{user.phone}</div>}
                        {user.email && <div className="text-xs">{user.email}</div>}
                        {!user.phone && !user.email && <span className="text-[#9CA3AF]">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setFormData({
                              loginId: user.loginId,
                              name: user.name,
                              username: user.username,
                              phone: user.phone || '',
                              email: user.email || '',
                              password: '',
                              role: user.role,
                              academyId: user.academyId,
                              status: user.status,
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-[#3B82F6] hover:bg-[#EFF6FF] rounded transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-1.5 text-[#EF4444] hover:bg-[#FEF2F2] rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-16">
              <Users size={64} className="mx-auto text-[#D1D5DB] mb-4" />
              <p className="text-lg text-[#9CA3AF]">暂无通讯录数据</p>
              <p className="text-sm text-[#D1D5DB] mt-2">
                点击"新建账号"或"批量导入"添加人员
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6] mx-auto"></div>
              <p className="text-sm text-[#9CA3AF] mt-4">加载中...</p>
            </div>
          )}
        </div>
      </div>

      {/* 新建账号弹窗 */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">新建账号</h3>
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
                  学工号（SSO）
                </label>
                <input
                  type="text"
                  placeholder="用于统一身份认证的学工号"
                  value={formData.loginId}
                  onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  登录用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="用于系统登录的用户名"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

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
                  角色 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'volunteer' })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="volunteer">志愿者</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              {/* 所属学院已隐藏，自动使用当前管理员所在学院 */}
              <input type="hidden" value={formData.academyId} />

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="active">启用</option>
                  <option value="inactive">禁用</option>
                </select>
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
                  初始密码
                </label>
                <input
                  type="text"
                  placeholder="留空则使用默认密码 123456"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
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
              <LotteryButton className="flex-1" onClick={handleCreateUser}>
                创建账号
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 编辑账号弹窗 */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">编辑账号</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
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
                  学工号（SSO）
                </label>
                <input
                  type="text"
                  value={formData.loginId}
                  onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  登录用户名 <span className="text-red-500">*</span>
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
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              {/* 所属学院已隐藏，保持原学院不变 */}
              <input type="hidden" value={formData.academyId} />

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  角色
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'volunteer' })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="volunteer">志愿者</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="active">启用</option>
                  <option value="inactive">禁用</option>
                </select>
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
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  resetFormData();
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleEditUser}>
                保存修改
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111827]">确认删除</h3>
                <p className="text-sm text-[#9CA3AF]">此操作不可撤销</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4 mb-4">
              <p className="text-sm text-[#991B1B]">
                您即将删除 <span className="font-bold">{selectedUser.name}</span>（{selectedUser.username}）
              </p>
            </div>

            <div className="flex gap-3">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUser(null);
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton
                variant="danger"
                className="flex-1"
                onClick={handleDeleteUser}
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
              <h3 className="text-xl font-bold text-[#111827]">批量导入通讯录</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 模板下载 */}
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#22C55E] flex items-center justify-center flex-shrink-0">
                    <Download size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#166534] mb-1">
                      下载导入模板
                    </p>
                    <p className="text-xs text-[#166534] mb-3">
                      请先下载模板文件，按要求填写后上传
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-xs px-3 py-1.5 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors"
                    >
                      下载 Excel 模板
                    </button>
                  </div>
                </div>
              </div>

              {/* 文件上传 */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4">
                <p className="text-sm text-[#1E40AF] mb-2">
                  <strong>Excel 文件格式要求：</strong>
                </p>
                <ul className="text-xs text-[#1E40AF] space-y-1 list-disc list-inside mb-4">
                  <li>登录用户名、姓名为必填项</li>
                  <li>角色可选：管理员（或admin）、志愿者（或volunteer）</li>
                  <li>重复的登录用户名将自动跳过</li>
                </ul>

                <label className="block">
                  <span className="block text-sm font-medium text-[#4B5563] mb-3">
                    选择 Excel 文件
                  </span>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImport}
                      className="hidden"
                      id="contact-file-input"
                    />
                    <label
                      htmlFor="contact-file-input"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#3B82F6] text-white rounded-lg cursor-pointer hover:bg-[#2563EB] active:bg-[#1D4ED8] transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <Upload size={18} />
                      <span className="font-medium">点击选择文件</span>
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-[#9CA3AF]">
                    支持 .xlsx、.xls 格式，文件大小不超过 10MB
                  </p>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowImportModal(false)}
              >
                关闭
              </LotteryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
