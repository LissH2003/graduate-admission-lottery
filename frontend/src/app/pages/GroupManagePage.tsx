// 面试分组管理页面（包含批量导入、手动管理功能）
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { LotteryButton } from '../components/lottery/LotteryButton';
import { DateTimePicker } from '../components/DateTimePicker';
import { TimeRangePicker } from '../components/TimeRangePicker';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  X,
  AlertTriangle,
  Download,
  Upload,
  Users,
  Calendar,
  Clock,
  MapPin,
  FileSpreadsheet,
  UserPlus,
  Filter,
} from 'lucide-react';
import * as batchStorage from '../../storage/batchStorage';
import * as groupStorage from '../../storage/groupStorage';
import * as candidateStorage from '../../storage/candidateStorage';
import * as examRoomStorage from '../../storage/examRoomStorage';
import * as volunteerStorage from '../../storage/volunteerStorage';
import * as XLSX from 'xlsx';

export default function GroupManagePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId');
  const batchNo = searchParams.get('batchNo');

  const [groups, setGroups] = useState<groupStorage.Group[]>([]);
  const [candidates, setCandidates] = useState<candidateStorage.Candidate[]>([]);
  const [currentBatch, setCurrentBatch] = useState<batchStorage.Batch | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<groupStorage.Group | null>(null);
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<string[]>([]);
  const [volunteerSearchQuery, setVolunteerSearchQuery] = useState(''); // 志愿者搜索关键词
  const [showGroupImportModal, setShowGroupImportModal] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState(''); // 考生搜索关键词
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<'all' | 'waiting' | 'drawn' | 'absent'>('all'); // 考生状态筛选
  const [showEditCandidateModal, setShowEditCandidateModal] = useState(false); // 编辑考生弹窗
  const [selectedCandidate, setSelectedCandidate] = useState<candidateStorage.Candidate | null>(null); // 当前选中的考生
  const [groupStatusFilter, setGroupStatusFilter] = useState<'all' | 'notStarted' | 'inProgress' | 'completed'>('all'); // 分组状态筛选

  const [groupFormData, setGroupFormData] = useState({
    groupName: '',
    examRoomId: '',
    interviewDate: '',
    interviewTime: '',
  });

  const [candidateFormData, setCandidateFormData] = useState({
    name: '',
    idCard: '',
    registrationNo: '',
    candidateNo: '',
    phone: '',
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, [batchId]);

  const loadData = () => {
    if (batchId) {
      const batch = batchStorage.getBatchById(batchId);
      setCurrentBatch(batch);
      
      const batchGroups = groupStorage.getGroupsByBatchId(batchId);
      setGroups(batchGroups);
      
      const allCandidates = candidateStorage.getAllCandidates();
      setCandidates(allCandidates);
      
      // 更新每个分组的考生数量
      batchGroups.forEach((group) => {
        const count = candidateStorage.getCandidatesByGroupId(group.id).length;
        if (group.candidateCount !== count) {
          groupStorage.updateGroupCandidateCount(group.id, count);
        }
      });
      
      // 更新批次统计
      if (batch) {
        const totalCandidates = candidateStorage.getCandidatesByBatchId(batchId, batchGroups).length;
        batchStorage.updateBatchStats(batchId, batchGroups.length, totalCandidates);
      }
    }
  };

  // 计算分组状态
  const getGroupStatus = (group: groupStorage.Group): 'notStarted' | 'inProgress' | 'completed' => {
    const now = new Date();
    const groupDate = new Date(group.date);
    const [startHour, startMinute] = group.time.split(':').map(Number);
    const [endHour, endMinute] = group.endTime.split(':').map(Number);
    
    const startTime = new Date(groupDate);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(groupDate);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    if (now < startTime) {
      return 'notStarted';
    } else if (now >= startTime && now <= endTime) {
      return 'inProgress';
    } else {
      return 'completed';
    }
  };

  // 获取状态文本和颜色
  const getStatusConfig = (status: 'notStarted' | 'inProgress' | 'completed') => {
    switch (status) {
      case 'notStarted':
        return { text: '未开始', color: 'text-[#1D4ED8]', bg: 'bg-[#DBEAFE]' };
      case 'inProgress':
        return { text: '进行中', color: 'text-[#059669]', bg: 'bg-[#D1FAE5]' };
      case 'completed':
        return { text: '已结束', color: 'text-[#6B7280]', bg: 'bg-[#F3F4F6]' };
    }
  };

  // 过滤分组
  const filteredGroups = groups.filter((group) => {
    // 搜索关键词筛选
    const matchesSearch =
      group.name.includes(searchQuery) ||
      group.description.includes(searchQuery);
    
    // 状态筛选
    if (groupStatusFilter === 'all') {
      return matchesSearch;
    }
    
    const groupStatus = getGroupStatus(group);
    return matchesSearch && groupStatus === groupStatusFilter;
  });

  // 获取指定分组的考生
  const getGroupCandidates = (groupId: string) => {
    return candidates.filter((c) => c.groupId === groupId);
  };

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const csvContent = `分组名称,面试日期,面试时间,面试地点,姓名,身份证号,报名编号,考生号,手机号
博士组1,2024-03-15,09:00-12:00,301教室,张三,320102199001011234,2024ME0001,001,13800138000
博士组1,2024-03-15,09:00-12:00,301教室,李四,320102199002025678,2024ME0002,002,13800138001
硕士组1,2024-03-16,14:00-17:00,302教室,王五,320102199003036789,2024ME0003,101,13800138002`;

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `分组考生导入模板_${batchNo}.csv`;
    link.click();
  };

  // 批量导入
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim()); // 过滤空行
        
        if (lines.length < 2) {
          alert('文件内容为空或格式不正确');
          return;
        }

        const newGroups: { [key: string]: groupStorage.Group } = {};
        const newCandidates: candidateStorage.Candidate[] = [];
        const examRoomMap: { [key: string]: string } = {}; // 考场名称到ID的映射
        
        // 获取所有现有考场
        const existingRooms = examRoomStorage.getAllExamRooms();
        existingRooms.forEach(room => {
          examRoomMap[room.name] = room.id;
        });

        // 跳过表头，从第二行开始处理
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const fields = line.split(',').map(s => s.trim());
          
          // 确保至少有必填字段：分组名称、面试日期、面试时间、面试地点、姓名、身份证号
          if (fields.length < 6 || !fields[0] || !fields[1] || !fields[2] || !fields[3] || !fields[4] || !fields[5]) {
            console.warn(`跳过第 ${i + 1} 行：缺少必填字段`);
            continue;
          }

          const [
            groupName,
            interviewDate,
            interviewTime,
            examRoomName,
            name,
            idCard,
            registrationNo = '',
            candidateNo = '',
            phone = ''
          ] = fields;

          // 验证身份证号格式（简单验证长度）
          if (idCard.length !== 18 && idCard.length !== 15) {
            console.warn(`跳过第 ${i + 1} 行：身份证号格式不正确`);
            continue;
          }

          // 创建或获取考场
          let examRoomId = examRoomMap[examRoomName];
          if (!examRoomId) {
            // 考场不存在，创建新考场
            const newRoomId = `room-${Date.now()}-${Object.keys(examRoomMap).length}`;
            const newRoom: examRoomStorage.ExamRoom = {
              id: newRoomId,
              name: examRoomName,
              location: examRoomName,
              capacity: 100,
              createdAt: new Date().toLocaleString('zh-CN'),
            };
            examRoomStorage.addExamRoom(newRoom);
            examRoomMap[examRoomName] = newRoomId;
            examRoomId = newRoomId;
          }

          // 创建唯一的分组键（分组名称+日期+时间+考场）
          const groupKey = `${groupName}-${interviewDate}-${interviewTime}-${examRoomName}`;

          // 创建或获取分组
          if (!newGroups[groupKey]) {
            // 拆分时间段为开始时间和结束时间
            const timeParts = interviewTime.split('-');
            const startTime = timeParts[0]?.trim() || interviewTime;
            const endTime = timeParts[1]?.trim() || interviewTime;

            newGroups[groupKey] = {
              id: `group-${Date.now()}-${Object.keys(newGroups).length}`,
              batchId: batchId || '',
              batchName: currentBatch?.name || '',
              name: groupName,
              description: `面试地点：${examRoomName}`,
              candidateCount: 0,
              createdAt: new Date().toLocaleString('zh-CN'),
              examRoomId: examRoomId,
              examRoomName: examRoomName,
              date: interviewDate,
              time: startTime,
              endTime: endTime,
            };
          }

          // 添加考生
          newCandidates.push({
            id: `cand-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
            groupId: newGroups[groupKey].id,
            name: name,
            idCard: idCard,
            registrationNo: registrationNo,
            candidateNo: candidateNo,
            phone: phone,
            status: 'waiting',
          });

          newGroups[groupKey].candidateCount++;
        }

        if (Object.keys(newGroups).length === 0) {
          alert('没有有效的分组数据可导入');
          return;
        }

        // 添加分组和考生到Storage
        Object.values(newGroups).forEach((group) => {
          groupStorage.addGroup(group);
        });

        candidateStorage.addCandidates(newCandidates);

        setShowImportModal(false);
        loadData();
        alert(`成功导入 ${Object.keys(newGroups).length} 个分组，${newCandidates.length} 名考生`);
      } catch (error) {
        console.error('导入失败：', error);
        alert('文件解析失败，请检查文件格式是否正确');
      }
    };

    reader.onerror = () => {
      alert('文件读取失败，请重试');
    };

    reader.readAsText(file, 'UTF-8');
  };

  // 新建分组
  const handleCreateGroup = () => {
    if (!groupFormData.groupName || !groupFormData.examRoomId || !groupFormData.interviewDate || !groupFormData.interviewTime) {
      alert('请填写所有必填信息');
      return;
    }

    const selectedRoom = examRoomStorage.getExamRoomById(groupFormData.examRoomId);
    if (!selectedRoom) {
      alert('选择的考场不存在');
      return;
    }

    // 拆分时间段为开始时间和结束时间
    const timeParts = groupFormData.interviewTime.split('-');
    const startTime = timeParts[0]?.trim() || groupFormData.interviewTime;
    const endTime = timeParts[1]?.trim() || groupFormData.interviewTime;

    const newGroup: groupStorage.Group = {
      id: `group-${Date.now()}`,
      batchId: batchId || '',
      batchName: currentBatch?.name || '',
      name: groupFormData.groupName,
      description: `面试地点：${selectedRoom.name}`,
      candidateCount: 0,
      createdAt: new Date().toLocaleString('zh-CN'),
      examRoomId: groupFormData.examRoomId,
      examRoomName: selectedRoom.name,
      date: groupFormData.interviewDate,
      time: startTime,
      endTime: endTime,
    };

    groupStorage.addGroup(newGroup);
    loadData();
    setShowNewGroupModal(false);
    setGroupFormData({
      groupName: '',
      examRoomId: '',
      interviewDate: '',
      interviewTime: '',
    });
  };

  // 编辑分组
  const handleEditGroup = () => {
    if (!selectedGroup || !groupFormData.groupName || !groupFormData.examRoomId || !groupFormData.interviewDate || !groupFormData.interviewTime) {
      alert('请填写所有必填信息');
      return;
    }

    const selectedRoom = examRoomStorage.getExamRoomById(groupFormData.examRoomId);
    if (!selectedRoom) {
      alert('选择的考场不存在');
      return;
    }

    // 拆分时间段为开始时间和结束时间
    const timeParts = groupFormData.interviewTime.split('-');
    const startTime = timeParts[0]?.trim() || groupFormData.interviewTime;
    const endTime = timeParts[1]?.trim() || groupFormData.interviewTime;

    groupStorage.updateGroup(selectedGroup.id, {
      name: groupFormData.groupName,
      description: `面试地点：${selectedRoom.name}`,
      examRoomId: groupFormData.examRoomId,
      examRoomName: selectedRoom.name,
      date: groupFormData.interviewDate,
      time: startTime,
      endTime: endTime,
    });

    loadData();
    setShowEditGroupModal(false);
    setSelectedGroup(null);
    setGroupFormData({
      groupName: '',
      examRoomId: '',
      interviewDate: '',
      interviewTime: '',
    });
  };

  // 添加考生到分组
  const handleAddCandidate = () => {
    if (!selectedGroup || !candidateFormData.name || !candidateFormData.idCard) {
      alert('请填写必填���息');
      return;
    }

    const newCandidate: candidateStorage.Candidate = {
      id: `cand-${Date.now()}`,
      groupId: selectedGroup.id,
      name: candidateFormData.name,
      idCard: candidateFormData.idCard,
      registrationNo: candidateFormData.registrationNo,
      candidateNo: candidateFormData.candidateNo,
      phone: candidateFormData.phone,
      status: 'waiting',
    };

    candidateStorage.addCandidate(newCandidate);
    loadData();
    setShowAddCandidateModal(false);
    setCandidateFormData({
      name: '',
      idCard: '',
      registrationNo: '',
      candidateNo: '',
      phone: '',
    });
  };

  // 删除分组
  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    
    // 删除分组下的所有考生
    candidateStorage.deleteCandidatesByGroupId(selectedGroup.id);
    
    // 删除分组
    groupStorage.deleteGroup(selectedGroup.id);
    
    loadData();
    setShowDeleteConfirm(false);
    setSelectedGroup(null);
  };

  // 删除考生
  const handleDeleteCandidate = (candidateId: string) => {
    candidateStorage.deleteCandidate(candidateId);
    loadData();
  };

  // 编辑考生
  const handleEditCandidate = () => {
    if (!selectedCandidate || !candidateFormData.name || !candidateFormData.idCard) {
      alert('请填写必填信息');
      return;
    }

    candidateStorage.updateCandidate(selectedCandidate.id, {
      name: candidateFormData.name,
      idCard: candidateFormData.idCard,
      registrationNo: candidateFormData.registrationNo,
      candidateNo: candidateFormData.candidateNo,
      phone: candidateFormData.phone,
    });

    loadData();
    setShowEditCandidateModal(false);
    setSelectedCandidate(null);
    setCandidateFormData({
      name: '',
      idCard: '',
      registrationNo: '',
      candidateNo: '',
      phone: '',
    });
  };

  // 导出当前分组考生（带筛选）
  const handleExportCurrentGroupCandidates = () => {
    if (!selectedGroup) return;
    
    const filteredCandidates = getFilteredCandidates();
    
    if (filteredCandidates.length === 0) {
      alert('没有符合条件的考生数据');
      return;
    }

    const examRoom = examRoomStorage.getExamRoomById(selectedGroup.examRoomId);
    const volunteerNames = (selectedGroup.volunteerIds || [])
      .map(id => {
        const volunteer = volunteerStorage.getVolunteerById(id);
        return volunteer?.name;
      })
      .filter(Boolean)
      .join('、') || '未配置';
    
    const exportData = filteredCandidates.map((candidate) => {
      const statusText = 
        candidate.status === 'waiting' ? '待抽签' : 
        candidate.status === 'drawn' ? '已抽签' : 
        candidate.status === 'completed' ? '已完成' : '缺考';

      return {
        '批次名称': currentBatch?.name || '',
        '分组名称': selectedGroup.name,
        '分组描述': selectedGroup.description || '',
        '面试日期': selectedGroup.date || '',
        '面试时间': selectedGroup.endTime ? `${selectedGroup.time}-${selectedGroup.endTime}` : selectedGroup.time || '',
        '面试地点': examRoom?.name || '',
        '考场位置': examRoom?.location || '',
        '志愿者': volunteerNames,
        '姓名': candidate.name,
        '身份证号': candidate.idCard,
        '报名编号': candidate.registrationNo || '',
        '考生号': candidate.candidateNo || '',
        '手机号': candidate.phone || '',
        '抽签号码': candidate.drawnNumber || '',
        '状态': statusText,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const colWidths = [
      { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
      { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedGroup.name);
    
    const fileName = `${selectedGroup.name}_考生明细_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 筛选考生
  const getFilteredCandidates = () => {
    if (!selectedGroup) return [];
    
    let filtered = getGroupCandidates(selectedGroup.id);
    
    // 按状态筛选
    if (candidateStatusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === candidateStatusFilter);
    }
    
    // 按关键词搜索
    if (candidateSearchQuery) {
      const query = candidateSearchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.idCard.includes(query) ||
        (c.candidateNo && c.candidateNo.toLowerCase().includes(query)) ||
        (c.registrationNo && c.registrationNo.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query))
      );
    }
    
    return filtered;
  };


  // 导出分组名单（优化为Excel格式）
  const handleExportGroup = (group: groupStorage.Group) => {
    const groupCandidates = getGroupCandidates(group.id);
    
    if (groupCandidates.length === 0) {
      alert('该分组暂无考生数据');
      return;
    }

    const examRoom = examRoomStorage.getExamRoomById(group.examRoomId);
    
    // 获取该分组的志愿者名单
    const volunteerNames = (group.volunteerIds || [])
      .map(id => {
        const volunteer = volunteerStorage.getVolunteerById(id);
        return volunteer?.name;
      })
      .filter(Boolean)
      .join('、') || '未配置';
    
    // 准备导出数据
    const exportData = groupCandidates.map((candidate) => {
      const statusText = 
        candidate.status === 'waiting' ? '待抽签' : 
        candidate.status === 'drawn' ? '已抽签' : 
        candidate.status === 'completed' ? '已完成' : '缺考';

      return {
        '批次名称': currentBatch?.name || '',
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
        '抽签号码': candidate.drawnNumber || '',
        '状态': statusText,
      };
    });

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    const colWidths = [
      { wch: 30 }, // 批次名称
      { wch: 25 }, // 分组名称
      { wch: 20 }, // 分组描述
      { wch: 12 }, // 面试日期
      { wch: 15 }, // 面试时间
      { wch: 20 }, // 面试地点
      { wch: 25 }, // 考场位置
      { wch: 20 }, // 志愿者
      { wch: 10 }, // 姓名
      { wch: 20 }, // 身份证号
      { wch: 15 }, // 报名编号
      { wch: 15 }, // 考生号
      { wch: 12 }, // 手机号
      { wch: 10 }, // 抽签号码
      { wch: 10 }, // 状态
    ];
    worksheet['!cols'] = colWidths;

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, group.name);
    
    // 生成文件名
    const fileName = `${group.name}_考生名单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    
    // 导出文件
    XLSX.writeFile(workbook, fileName);
  };

  // 全部导出 - 导出当前批次所有分组数据
  const handleExportAll = () => {
    if (groups.length === 0) {
      alert('当前批次没有分组数据');
      return;
    }

    // 准备导出数据
    const exportData: any[] = [];

    groups.forEach((group) => {
      const groupCandidates = getGroupCandidates(group.id);
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
          '抽签号码': candidate.drawnNumber || '',
          '状态': statusText,
        });
      });
    });

    if (exportData.length === 0) {
      alert('当前批次没有考生数据');
      return;
    }

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    const colWidths = [
      { wch: 25 }, // 分组名称
      { wch: 20 }, // 分组描述
      { wch: 12 }, // 面试日期
      { wch: 15 }, // 面试时间
      { wch: 20 }, // 面试地点
      { wch: 25 }, // 考场位置
      { wch: 20 }, // 志愿者
      { wch: 10 }, // 姓名
      { wch: 20 }, // 身份证号
      { wch: 15 }, // 报名编号
      { wch: 15 }, // 考生号
      { wch: 12 }, // 手机号
      { wch: 10 }, // 抽签号码
      { wch: 10 }, // 状态
    ];
    worksheet['!cols'] = colWidths;

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '分组考生数据');
    
    // 生成文件名
    const fileName = `${batchNo}_全部分组数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    
    // 导出文件
    XLSX.writeFile(workbook, fileName);
  };

  // 下载分组考生导入模板
  const handleDownloadGroupTemplate = () => {
    if (!selectedGroup) return;
    
    const csvContent = `姓名,身份证号,报名编号,考生号,手机号
张三,320102199001011234,2024ME0001,001,13800138000
李四,320102199002025678,2024ME0002,002,13800138001
王五,320102199003036789,2024ME0003,101,13800138002`;

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedGroup.name}_考生导入模板.csv`;
    link.click();
  };

  // 分组内批量导入考生
  const handleGroupImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedGroup) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim()); // 过滤空行
        
        if (lines.length < 2) {
          alert('文件内容为空或格式不正确');
          return;
        }

        const newCandidates: candidateStorage.Candidate[] = [];
        
        // 跳过表头，从第二行开始处理
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const fields = line.split(',').map(s => s.trim());
          
          // 确保至少有姓名和身份证号
          if (fields.length < 2 || !fields[0] || !fields[1]) {
            console.warn(`跳过第 ${i + 1} 行：缺少必填字段`);
            continue;
          }

          const [name, idCard, registrationNo = '', candidateNo = '', phone = ''] = fields;

          // 验证身份证号格式（简单验证长度）
          if (idCard.length !== 18 && idCard.length !== 15) {
            console.warn(`跳过第 ${i + 1} 行：身份证号格式不正确`);
            continue;
          }

          newCandidates.push({
            id: `cand-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
            groupId: selectedGroup.id,
            name: name,
            idCard: idCard,
            registrationNo: registrationNo,
            candidateNo: candidateNo,
            phone: phone,
            status: 'waiting',
          });
        }

        if (newCandidates.length === 0) {
          alert('没有有效的考生数据可导入');
          return;
        }

        // 批量添加考生
        candidateStorage.addCandidates(newCandidates);
        
        // 更新分组考生数量
        groupStorage.updateGroupCandidateCount(
          selectedGroup.id,
          getGroupCandidates(selectedGroup.id).length + newCandidates.length
        );

        setShowGroupImportModal(false);
        loadData();
        alert(`成功导入 ${newCandidates.length} 名考生到分组：${selectedGroup.name}`);
      } catch (error) {
        console.error('导入失败：', error);
        alert('文件解析失败，请检查文件格式是否正确');
      }
    };

    reader.onerror = () => {
      alert('文件读取失败，请重试');
    };

    reader.readAsText(file, 'UTF-8');
  };

  // 配置志愿者
  const handleAssignVolunteers = () => {
    if (!selectedGroup) return;

    // 保存志愿者到分组
    groupStorage.assignVolunteersToGroup(selectedGroup.id, selectedVolunteerIds);

    // 同步更新志愿者的examRoomIds
    const examRoomId = selectedGroup.examRoomId;
    selectedVolunteerIds.forEach((volunteerId) => {
      const volunteer = volunteerStorage.getVolunteerById(volunteerId);
      if (volunteer) {
        const examRoomIds = volunteer.examRoomIds || [];
        if (!examRoomIds.includes(examRoomId)) {
          // 如果志愿者还没有这个考场的权限，添加它
          volunteerStorage.updateVolunteer(volunteerId, {
            examRoomIds: [...examRoomIds, examRoomId],
          });
        }
      }
    });

    alert(`成功配置 ${selectedVolunteerIds.length} 名志愿者`);
    setShowVolunteerModal(false);
    setSelectedGroup(null);
    setSelectedVolunteerIds([]);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/batch-manage')}
              className="text-[#9CA3AF] hover:text-[#111827]"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#111827]">
                面试分组管理 - {batchNo}
              </h1>
              <p className="text-xs text-[#9CA3AF]">管理该批次下的所有面试分组</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LotteryButton 
              className="text-xs px-3 py-2"
              onClick={() => navigate('/batch-manage')}
            >
              返回批次列表
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
              <div className="flex-1 relative max-w-md">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  type="text"
                  placeholder="搜索分组名称或地点..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
                />
              </div>
              
              {/* 状态筛选 */}
              <div className="relative">
                <Filter
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
                />
                <select
                  value={groupStatusFilter}
                  onChange={(e) => setGroupStatusFilter(e.target.value as any)}
                  className="pl-10 pr-8 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="all">全部状态</option>
                  <option value="notStarted">未开始</option>
                  <option value="inProgress">进行中</option>
                  <option value="completed">已结束</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <LotteryButton
                variant="secondary"
                className="text-xs px-3 py-2"
                onClick={() => setShowImportModal(true)}
              >
                <Upload size={16} />
                批量导入
              </LotteryButton>
              <LotteryButton 
                className="text-xs px-3 py-2"
                onClick={() => setShowNewGroupModal(true)}
              >
                <Plus size={16} />
                新建分组
              </LotteryButton>
              <LotteryButton 
                className="text-xs px-3 py-2"
                onClick={handleExportAll}
              >
                <Download size={16} />
                全部导出
              </LotteryButton>
            </div>
          </div>
        </div>

        {/* 分组列表 */}
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const examRoom = examRoomStorage.getExamRoomById(group.examRoomId);
            // 获取该分组的志愿者信息
            const volunteerNames = (group.volunteerIds || [])
              .map(id => {
                const volunteer = volunteerStorage.getVolunteerById(id);
                return volunteer?.name;
              })
              .filter(Boolean)
              .join('、');
            
            return (
              <div
                key={group.id}
                className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xl font-bold text-[#111827]">
                        {group.name}
                      </h3>
                      {(() => {
                        const status = getGroupStatus(group);
                        const config = getStatusConfig(status);
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                            {config.text}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Users size={14} className="text-[#3B82F6]" />
                        <span className="font-medium">{group.candidateCount} 人</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Calendar size={14} className="text-[#10B981]" />
                        <span>{group.date || '未设置日期'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Clock size={14} className="text-[#F59E0B]" />
                        <span>{group.endTime ? `${group.time}-${group.endTime}` : group.time || '未设置时间'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <MapPin size={14} className="text-[#EF4444]" />
                        <span>{examRoom?.name || '未分配考场'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#6B7280] col-span-2">
                        <Users size={14} className="text-[#8B5CF6]" />
                        <span>
                          {volunteerNames ? (
                            <span className="font-medium">{volunteerNames}</span>
                          ) : (
                            <span className="text-[#9CA3AF]">未配置志愿者</span>
                          )}
                        </span>
                      </div>
                    </div>
                    {group.description && (
                      <div className="mt-2 text-xs text-[#9CA3AF]">
                        备注：{group.description}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <LotteryButton
                      variant="secondary"
                      className="text-xs px-2.5 py-1.5"
                      onClick={() => {
                        setSelectedGroup(group);
                        setGroupFormData({
                          groupName: group.name,
                          examRoomId: group.examRoomId,
                          interviewDate: group.date,
                          interviewTime: group.endTime ? `${group.time}-${group.endTime}` : group.time,
                        });
                        setShowEditGroupModal(true);
                      }}
                    >
                      <Edit size={14} />
                      编辑
                    </LotteryButton>
                    <LotteryButton
                      variant="secondary"
                      className="text-xs px-2.5 py-1.5"
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedVolunteerIds(group.volunteerIds || []);
                        setShowVolunteerModal(true);
                      }}
                    >
                      <Users size={14} />
                      配置志愿者
                    </LotteryButton>
                    <LotteryButton
                      variant="secondary"
                      className="text-xs px-2.5 py-1.5"
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowGroupDetailModal(true);
                      }}
                    >
                      查看分组明细
                    </LotteryButton>
                    <button
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowDeleteConfirm(true);
                      }}
                      className="px-2.5 py-1.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-16">
            <Users size={64} className="mx-auto text-[#D1D5DB] mb-4" />
            <p className="text-lg text-[#9CA3AF]">暂无分组数据</p>
            <p className="text-sm text-[#D1D5DB] mt-2">
              点击"批量导入"或"新建分组"开始管理
            </p>
          </div>
        )}
      </div>

      {/* 批量导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">批量导入考生</h3>
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
                  <strong>导入步骤：</strong>
                </p>
                <ol className="text-sm text-[#1E40AF] space-y-1 list-decimal list-inside">
                  <li>点击下方"下载模板"按钮</li>
                  <li>按照模板格式填写考生信息</li>
                  <li>上传填写完成的Excel文件</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#4B5563]">
                  上传文件
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImport}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[#F3F4F6] file:text-[#111827] hover:file:bg-[#E5E7EB]"
                />
                <p className="text-xs text-[#9CA3AF]">
                  支持 CSV、Excel 格式，最大 10MB
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={handleDownloadTemplate}
              >
                <Download size={18} />
                下载模板
              </LotteryButton>
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

      {/* 新建分组弹窗 */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#111827]">新建面试分组</h3>
              <button
                onClick={() => setShowNewGroupModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1">
                  分组名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：机械工程学院-博士组1"
                  value={groupFormData.groupName}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, groupName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1">
                  考场 <span className="text-red-500">*</span>
                </label>
                <select
                  value={groupFormData.examRoomId}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, examRoomId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="">请选择考场</option>
                  {/* 只显示启用状态的考场 */}
                  {examRoomStorage.getAllExamRooms()
                    .filter((room) => room.status === 'active')
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1">
                  面试日期 <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  value={groupFormData.interviewDate}
                  onChange={(date) =>
                    setGroupFormData({
                      ...groupFormData,
                      interviewDate: date,
                    })
                  }
                  type="date"
                  placeholder="请选择面试日期"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1">
                  面试时间 <span className="text-red-500">*</span>
                </label>
                <TimeRangePicker
                  value={groupFormData.interviewTime}
                  onChange={(time) =>
                    setGroupFormData({
                      ...groupFormData,
                      interviewTime: time,
                    })
                  }
                  placeholder="请选择面试时间段"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowNewGroupModal(false)}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleCreateGroup}>
                创建分组
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 编辑分组弹窗 */}
      {showEditGroupModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">编辑面试分组</h3>
              <button
                onClick={() => {
                  setShowEditGroupModal(false);
                  setSelectedGroup(null);
                  setGroupFormData({
                    groupName: '',
                    examRoomId: '',
                    interviewDate: '',
                    interviewTime: '',
                  });
                }}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  分组名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：机械工程学院-博士组1"
                  value={groupFormData.groupName}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, groupName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  考场 <span className="text-red-500">*</span>
                </label>
                <select
                  value={groupFormData.examRoomId}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, examRoomId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="">请选择考场</option>
                  {/* 只显示启用状态的考场 */}
                  {examRoomStorage.getAllExamRooms()
                    .filter((room) => room.status === 'active')
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  面试日期 <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  value={groupFormData.interviewDate}
                  onChange={(date) =>
                    setGroupFormData({
                      ...groupFormData,
                      interviewDate: date,
                    })
                  }
                  type="date"
                  placeholder="请选择面试日期"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  面试时间 <span className="text-red-500">*</span>
                </label>
                <TimeRangePicker
                  value={groupFormData.interviewTime}
                  onChange={(time) =>
                    setGroupFormData({
                      ...groupFormData,
                      interviewTime: time,
                    })
                  }
                  placeholder="请选择面试时间段"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowEditGroupModal(false);
                  setSelectedGroup(null);
                  setGroupFormData({
                    groupName: '',
                    examRoomId: '',
                    interviewDate: '',
                    interviewTime: '',
                  });
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleEditGroup}>
                保存修改
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 分组详情弹窗 */}
      {showGroupDetailModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-xl font-bold text-[#111827]">
                  {selectedGroup.name}
                </h3>
                <p className="text-sm text-[#9CA3AF]">
                  {selectedGroup.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LotteryButton
                  variant="secondary"
                  onClick={() => setShowGroupImportModal(true)}
                >
                  <Upload size={18} />
                  批量导入
                </LotteryButton>
                <LotteryButton
                  variant="secondary"
                  onClick={() => {
                    setShowAddCandidateModal(true);
                  }}
                >
                  <UserPlus size={18} />
                  添加考生
                </LotteryButton>
                <button
                  onClick={() => {
                    setShowGroupDetailModal(false);
                    setSelectedGroup(null);
                    setCandidateSearchQuery('');
                    setCandidateStatusFilter('all');
                  }}
                  className="text-[#9CA3AF] hover:text-[#111827]"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* 统计汇总区 */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#EFF6FF] to-[#F0FDF4] border-b border-[#E5E7EB]">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#3B82F6]">{(() => getGroupCandidates(selectedGroup.id).length)()}</div>
                  <div className="text-xs text-[#6B7280] mt-1">总人数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#10B981]">{(() => getGroupCandidates(selectedGroup.id).filter(c => c.status === 'drawn').length)()}</div>
                  <div className="text-xs text-[#6B7280] mt-1">已抽签</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#F59E0B]">{(() => getGroupCandidates(selectedGroup.id).filter(c => c.status === 'waiting').length)()}</div>
                  <div className="text-xs text-[#6B7280] mt-1">待抽签</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#DC2626]">{(() => getGroupCandidates(selectedGroup.id).filter(c => c.status === 'absent').length)()}</div>
                  <div className="text-xs text-[#6B7280] mt-1">缺考</div>
                </div>
              </div>
            </div>

            {/* 筛选和导出工具栏 */}
            <div className="px-6 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1">
                  {/* 关键词搜索 */}
                  <div className="relative flex-1 max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="text"
                      placeholder="搜索姓名、身份证、考生号..."
                      value={candidateSearchQuery}
                      onChange={(e) => setCandidateSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
                    />
                  </div>

                  {/* 状态筛选 */}
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-[#6B7280]" />
                    <select
                      value={candidateStatusFilter}
                      onChange={(e) => setCandidateStatusFilter(e.target.value as any)}
                      className="px-3 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] cursor-pointer"
                    >
                      <option value="all">全部状态</option>
                      <option value="waiting">待抽签</option>
                      <option value="drawn">已抽签</option>
                      <option value="absent">缺考</option>
                    </select>
                  </div>
                </div>

                {/* 导出按钮 */}
                <LotteryButton
                  variant="secondary"
                  onClick={handleExportCurrentGroupCandidates}
                  className="flex items-center gap-1.5"
                >
                  <Download size={16} />
                  导出当前列表
                </LotteryButton>
              </div>

              {/* 筛选结果提示 */}
              {(candidateSearchQuery || candidateStatusFilter !== 'all') && (() => {
                const filteredCandidates = getFilteredCandidates();
                const totalCount = getGroupCandidates(selectedGroup.id).length;
                return (
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">
                    显示 <span className="font-bold text-[#3B82F6]">{filteredCandidates.length}</span> / {totalCount} 名考生
                  </span>
                  <button
                    onClick={() => {
                      setCandidateSearchQuery('');
                      setCandidateStatusFilter('all');
                    }}
                    className="text-[#3B82F6] hover:text-[#1E40AF] font-medium"
                  >
                    清空筛选
                  </button>
                </div>
                );
              })()}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {(() => {
                  const filteredCandidates = getFilteredCandidates();
                  return filteredCandidates.map((candidate, index) => (
                  <div
                    key={candidate.id}
                    className="bg-[#F9FAFB] rounded-lg p-4 flex items-center justify-between hover:bg-[#F3F4F6] transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-[#111827]">
                            {candidate.name}
                          </span>
                          {candidate.status === 'drawn' && (
                            <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#059669] text-xs font-medium rounded-full">
                              已抽签
                            </span>
                          )}
                          {candidate.status === 'waiting' && (
                            <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-xs font-medium rounded-full">
                              待抽签
                            </span>
                          )}
                          {candidate.status === 'absent' && (
                            <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-xs font-medium rounded-full">
                              缺考
                            </span>
                          )}
                          {candidate.drawnNumber && (
                            <span className="px-2 py-0.5 bg-gradient-to-br from-[#059669] to-[#10B981] text-white text-xs font-bold rounded">
                              {candidate.drawnNumber}号
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#9CA3AF] space-y-0.5">
                          <div>身份证：{candidate.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}</div>
                          {candidate.candidateNo && <div>考生号：{candidate.candidateNo}</div>}
                          {candidate.registrationNo && <div>报名编号：{candidate.registrationNo}</div>}
                          {candidate.phone && <div>手机号：{candidate.phone}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setCandidateFormData({
                            name: candidate.name,
                            idCard: candidate.idCard,
                            registrationNo: candidate.registrationNo || '',
                            candidateNo: candidate.candidateNo || '',
                            phone: candidate.phone || '',
                          });
                          setShowEditCandidateModal(true);
                        }}
                        className="text-[#9CA3AF] hover:text-[#3B82F6] transition-colors p-2"
                        title="编辑考生"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`确定要删除考生"${candidate.name}"吗？`)) {
                            handleDeleteCandidate(candidate.id);
                          }
                        }}
                        className="text-[#9CA3AF] hover:text-[#DC2626] transition-colors p-2"
                        title="删除考生"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ));
                })()}

                {(() => {
                  const filteredCandidates = getFilteredCandidates();
                  if (filteredCandidates.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Users size={48} className="mx-auto text-[#D1D5DB] mb-2" />
                    <p className="text-[#9CA3AF]">暂无���生，点击上方按钮添加或批量导入</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分组内批量导入弹窗 */}
      {showGroupImportModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">批量导入考生到分组</h3>
              <button
                onClick={() => setShowGroupImportModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4">
                <p className="text-sm text-[#1E40AF] mb-2">
                  <strong>当前分组：</strong>{selectedGroup.name}
                </p>
                <p className="text-sm text-[#1E40AF] mb-3">
                  <strong>导入步骤：</strong>
                </p>
                <ol className="text-sm text-[#1E40AF] space-y-1 list-decimal list-inside">
                  <li>点击下方"下载模板"按钮</li>
                  <li>按照模板格式填写考生信息</li>
                  <li>上传填写完成的CSV文件</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#4B5563]">
                  上传文件
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleGroupImport}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[#F3F4F6] file:text-[#111827] hover:file:bg-[#E5E7EB]"
                />
                <p className="text-xs text-[#9CA3AF]">
                  仅支持 CSV 格式，最大 10MB
                </p>
              </div>

              <div className="bg-[#FEF9E7] border border-[#FECB2F33] rounded-lg p-3">
                <p className="text-xs text-[#856404]">
                  <strong>注意：</strong>导入的考生将自动添加到当前分组"{selectedGroup.name}"中
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={handleDownloadGroupTemplate}
              >
                <Download size={18} />
                下载模板
              </LotteryButton>
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowGroupImportModal(false)}
              >
                关闭
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 添加考生弹窗 */}
      {showAddCandidateModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">添加考生</h3>
              <button
                onClick={() => setShowAddCandidateModal(false)}
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
                  value={candidateFormData.name}
                  onChange={(e) =>
                    setCandidateFormData({ ...candidateFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  身份证号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={candidateFormData.idCard}
                  onChange={(e) =>
                    setCandidateFormData({ ...candidateFormData, idCard: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  报名编号
                </label>
                <input
                  type="text"
                  value={candidateFormData.registrationNo}
                  onChange={(e) =>
                    setCandidateFormData({
                      ...candidateFormData,
                      registrationNo: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  考生号
                </label>
                <input
                  type="text"
                  value={candidateFormData.candidateNo}
                  onChange={(e) =>
                    setCandidateFormData({
                      ...candidateFormData,
                      candidateNo: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  手机号
                </label>
                <input
                  type="tel"
                  maxLength={11}
                  value={candidateFormData.phone}
                  onChange={(e) =>
                    setCandidateFormData({ ...candidateFormData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowAddCandidateModal(false)}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleAddCandidate}>
                添加
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 编辑考生弹窗 */}
      {showEditCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827]">编辑考生信息</h3>
              <button
                onClick={() => {
                  setShowEditCandidateModal(false);
                  setSelectedCandidate(null);
                  setCandidateFormData({
                    name: '',
                    idCard: '',
                    registrationNo: '',
                    candidateNo: '',
                    phone: '',
                  });
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
                  value={candidateFormData.name}
                  onChange={(e) =>
                    setCandidateFormData({ ...candidateFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  身份证号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={candidateFormData.idCard}
                  onChange={(e) =>
                    setCandidateFormData({ ...candidateFormData, idCard: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  报名编号
                </label>
                <input
                  type="text"
                  value={candidateFormData.registrationNo}
                  onChange={(e) =>
                    setCandidateFormData({
                      ...candidateFormData,
                      registrationNo: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  考生号
                </label>
                <input
                  type="text"
                  value={candidateFormData.candidateNo}
                  onChange={(e) =>
                    setCandidateFormData({
                      ...candidateFormData,
                      candidateNo: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  手机号
                </label>
                <input
                  type="tel"
                  maxLength={11}
                  value={candidateFormData.phone}
                  onChange={(e) =>
                    setCandidateFormData({ ...candidateFormData, phone: e.target.value })
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
                  setShowEditCandidateModal(false);
                  setSelectedCandidate(null);
                  setCandidateFormData({
                    name: '',
                    idCard: '',
                    registrationNo: '',
                    candidateNo: '',
                    phone: '',
                  });
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton className="flex-1" onClick={handleEditCandidate}>
                保存修改
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111827]">确认删除分组</h3>
                <p className="text-sm text-[#9CA3AF]">此操作不可撤销</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4 mb-4">
              <p className="text-sm text-[#991B1B]">
                您即将删除分组 <span className="font-bold">{selectedGroup.name}</span>
              </p>
              {selectedGroup.candidateCount > 0 && (
                <p className="text-sm text-[#991B1B] mt-2">
                  <strong>警告：</strong>该分组下有 {selectedGroup.candidateCount}{' '}
                  名考生，删除后所有考生数据将一并删除！
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <LotteryButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedGroup(null);
                }}
              >
                取消
              </LotteryButton>
              <LotteryButton
                variant="danger"
                className="flex-1"
                onClick={handleDeleteGroup}
              >
                确认删除
              </LotteryButton>
            </div>
          </div>
        </div>
      )}

      {/* 配置志愿者弹窗 */}
      {showVolunteerModal && selectedGroup && (() => {
        // 过滤志愿者列表
        const allVolunteers = volunteerStorage.getAllVolunteers().filter(v => v.username !== 'admin');
        const filteredVolunteers = allVolunteers.filter(volunteer => {
          if (!volunteerSearchQuery) return true;
          const searchLower = volunteerSearchQuery.toLowerCase();
          return (
            (volunteer.name || '').toLowerCase().includes(searchLower) ||
            (volunteer.username || '').toLowerCase().includes(searchLower) ||
            (volunteer.phone || '').toLowerCase().includes(searchLower)
          );
        });

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#111827]">配置志愿者</h3>
                  <p className="text-sm text-[#9CA3AF]">
                    为 <span className="font-semibold text-[#111827]">{selectedGroup.name}</span> 分配志愿者
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowVolunteerModal(false);
                    setSelectedGroup(null);
                    setSelectedVolunteerIds([]);
                    setVolunteerSearchQuery('');
                  }}
                  className="text-[#9CA3AF] hover:text-[#111827]"
                >
                  <X size={24} />
                </button>
              </div>

              {/* 搜索框 */}
              <div className="mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    placeholder="搜索志愿者姓名、用户名或手机号..."
                    value={volunteerSearchQuery}
                    onChange={(e) => setVolunteerSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent placeholder:text-[#9CA3AF]"
                  />
                </div>
                {volunteerSearchQuery && (
                  <p className="text-xs text-[#9CA3AF] mt-2">
                    找到 {filteredVolunteers.length} 名志愿者
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto mb-6">
                <div className="space-y-3">
                  {filteredVolunteers.map((volunteer) => (
                  <label
                    key={volunteer.id}
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedVolunteerIds.includes(volunteer.id)
                        ? 'border-[#3B82F6] bg-[#EFF6FF]'
                        : 'border-[#E5E7EB] hover:border-[#9CA3AF] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVolunteerIds.includes(volunteer.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVolunteerIds([...selectedVolunteerIds, volunteer.id]);
                        } else {
                          setSelectedVolunteerIds(
                            selectedVolunteerIds.filter((id) => id !== volunteer.id)
                          );
                        }
                      }}
                      className="w-5 h-5 text-[#3B82F6] rounded focus:ring-2 focus:ring-[#3B82F6]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#111827]">
                          {volunteer.name}
                        </span>
                        <span className="text-sm text-[#9CA3AF]">
                          @{volunteer.username}
                        </span>
                      </div>
                      <div className="text-sm text-[#6B7280]">
                        {volunteer.phone}
                      </div>
                    </div>
                    {selectedVolunteerIds.includes(volunteer.id) && (
                      <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}

                {/* 空状态 */}
                {allVolunteers.length === 0 && (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-[#D1D5DB] mb-2" />
                    <p className="text-[#9CA3AF]">暂无志愿者，请先创建志愿者账号</p>
                  </div>
                )}

                {/* 搜索无结果 */}
                {allVolunteers.length > 0 && filteredVolunteers.length === 0 && (
                  <div className="text-center py-12">
                    <Search size={48} className="mx-auto text-[#D1D5DB] mb-2" />
                    <p className="text-[#9CA3AF]">未找到匹配的志愿者</p>
                    <p className="text-sm text-[#D1D5DB] mt-1">
                      请尝试其他搜索关键词
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
              <div className="text-sm text-[#6B7280]">
                已选择 <span className="font-bold text-[#3B82F6]">{selectedVolunteerIds.length}</span> 名志愿者
              </div>
              <div className="flex gap-3">
                <LotteryButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowVolunteerModal(false);
                    setSelectedGroup(null);
                    setSelectedVolunteerIds([]);
                    setVolunteerSearchQuery('');
                  }}
                >
                  取消
                </LotteryButton>
                <LotteryButton className="flex-1" onClick={handleAssignVolunteers}>
                  确认配置
                </LotteryButton>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}