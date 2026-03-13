// 学院切换组件 - 仅超级管理员可见
import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Academy {
  id: string;
  name: string;
}

interface AcademySwitcherProps {
  // 是否显示（超级管理员才显示）
  visible?: boolean;
}

export function AcademySwitcher({ visible = true }: AcademySwitcherProps) {
  const { currentAcademy, switchAcademy, currentUser } = useAppContext();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 只有超级管理员才显示
  const isSuperAdmin = currentUser?.username === 'admin';
  
  if (!visible || !isSuperAdmin) {
    return null;
  }

  // 加载学院列表
  useEffect(() => {
    loadAcademies();
  }, []);

  const loadAcademies = async () => {
    try {
      const { data, error } = await supabase
        .from('lottery_academies')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Failed to load academies:', error);
        return;
      }

      setAcademies(data || []);
    } catch (error) {
      console.error('Load academies error:', error);
    }
  };

  const handleSelect = async (academy: Academy) => {
    if (academy.id === currentAcademy?.id) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await switchAcademy(academy.id);
      toast.success(`已切换到 ${academy.name}`);
    } catch (error) {
      toast.error('切换学院失败');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
          ${isOpen 
            ? 'bg-[#EFF6FF] border-[#3B82F6] text-[#1E40AF]' 
            : 'bg-white border-[#E5E7EB] text-[#374151] hover:border-[#3B82F6] hover:bg-[#F9FAFB]'
          }
          ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
        `}
      >
        <Building2 size={16} className={isOpen ? 'text-[#3B82F6]' : 'text-[#6B7280]'} />
        <span className="text-sm font-medium max-w-[120px] truncate">
          {isLoading ? '切换中...' : (currentAcademy?.name || '选择学院')}
        </span>
        <ChevronDown 
          size={14} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 - 点击关闭 */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-[#E5E7EB] z-50 py-1">
            <div className="px-3 py-2 border-b border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280]">切换学院</p>
            </div>
            
            {academies.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-[#9CA3AF]">
                暂无学院数据
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {academies.map((academy) => (
                  <button
                    key={academy.id}
                    onClick={() => handleSelect(academy)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-left
                      hover:bg-[#F3F4F6] transition-colors
                      ${academy.id === currentAcademy?.id ? 'bg-[#EFF6FF]' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 
                        size={14} 
                        className={academy.id === currentAcademy?.id ? 'text-[#3B82F6]' : 'text-[#9CA3AF]'} 
                      />
                      <span className={`
                        text-sm truncate
                        ${academy.id === currentAcademy?.id ? 'text-[#1E40AF] font-medium' : 'text-[#374151]'}
                      `}>
                        {academy.name}
                      </span>
                    </div>
                    {academy.id === currentAcademy?.id && (
                      <Check size={14} className="text-[#3B82F6] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
