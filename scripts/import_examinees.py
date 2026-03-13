#!/usr/bin/env python3
"""
SSO 用户数据导入脚本
从 Excel 文件读取用户信息，导入到 Supabase lottery_users 表

使用方法:
    python import_examinees.py <excel_file> [--auth-source sso|local] [--sheet-index 0]

示例:
    # 导入 SSO 用户（默认）
    python import_examinees.py students.xlsx
    
    # 导入本地账号
    python import_examinees.py local_users.xlsx --auth-source local
    
    # 指定工作表索引
    python import_examinees.py data.xlsx --sheet-index 1

Excel 文件格式要求:
    - 第一行为表头
    - 必须包含以下列：学工号、姓名
    - 可选列：身份（student/teacher/admin）、学院、状态（active/inactive）
"""

import argparse
import sys
import re
from typing import List, Dict, Optional
from dataclasses import dataclass

try:
    import pandas as pd
except ImportError:
    print("错误：需要安装 pandas 库")
    print("请运行：pip install pandas openpyxl")
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("错误：需要安装 supabase 库")
    print("请运行：pip install supabase")
    sys.exit(1)


@dataclass
class UserRecord:
    """用户记录数据类"""
    student_id: str
    name: str
    role: str = 'student'
    department: Optional[str] = None
    status: str = 'active'
    auth_source: str = 'sso'
    
    def validate(self) -> tuple[bool, str]:
        """验证记录有效性"""
        if not self.student_id or not self.student_id.strip():
            return False, "学工号不能为空"
        
        if not self.name or not self.name.strip():
            return False, "姓名不能为空"
        
        # 学工号规范化：小写、去除空格
        self.student_id = self.student_id.strip().lower()
        self.name = self.name.strip()
        
        if self.department:
            self.department = self.department.strip()
        
        # 验证角色
        valid_roles = ['student', 'teacher', 'admin']
        if self.role not in valid_roles:
            return False, f"无效的身份 '{self.role}'，必须是 {valid_roles} 之一"
        
        # 验证状态
        valid_statuses = ['active', 'inactive']
        if self.status not in valid_statuses:
            return False, f"无效的状态 '{self.status}'，必须是 {valid_statuses} 之一"
        
        return True, ""


def normalize_column_name(col: str) -> str:
    """规范化列名"""
    col = col.strip().lower()
    # 去除特殊字符
    col = re.sub(r'[^\w\s]', '', col)
    return col


def map_columns(df_columns: List[str]) -> Dict[str, str]:
    """
    映射 Excel 列名到标准字段名
    返回：{标准字段名: 原始列名}
    """
    column_mapping = {}
    normalized_map = {normalize_column_name(c): c for c in df_columns}
    
    # 学工号映射
    student_id_aliases = ['学工号', '学号', '工号', '账号', '用户名', 'studentid', 'student_id', 'id']
    for alias in student_id_aliases:
        if alias in normalized_map:
            column_mapping['student_id'] = normalized_map[alias]
            break
    
    # 姓名映射
    name_aliases = ['姓名', '名字', 'name', 'username']
    for alias in name_aliases:
        if alias in normalized_map:
            column_mapping['name'] = normalized_map[alias]
            break
    
    # 身份/角色映射
    role_aliases = ['身份', '角色', 'role', 'type', '用户类型']
    for alias in role_aliases:
        if alias in normalized_map:
            column_mapping['role'] = normalized_map[alias]
            break
    
    # 学院/部门映射
    dept_aliases = ['学院', '部门', '院系', 'department', 'college', 'academy']
    for alias in dept_aliases:
        if alias in normalized_map:
            column_mapping['department'] = normalized_map[alias]
            break
    
    # 状态映射
    status_aliases = ['状态', 'status', '启用', '激活']
    for alias in status_aliases:
        if alias in normalized_map:
            column_mapping['status'] = normalized_map[alias]
            break
    
    return column_mapping


def read_excel(file_path: str, sheet_index: int = 0) -> pd.DataFrame:
    """读取 Excel 文件"""
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_index)
        return df
    except FileNotFoundError:
        raise FileNotFoundError(f"找不到文件：{file_path}")
    except Exception as e:
        raise Exception(f"读取 Excel 文件失败：{e}")


def parse_records(df: pd.DataFrame, auth_source: str = 'sso') -> List[UserRecord]:
    """解析 DataFrame 为用户记录列表"""
    column_mapping = map_columns(df.columns.tolist())
    
    # 检查必需列
    if 'student_id' not in column_mapping:
        raise ValueError("Excel 文件缺少'学工号'列，请检查表头")
    if 'name' not in column_mapping:
        raise ValueError("Excel 文件缺少'姓名'列，请检查表头")
    
    records = []
    
    for _, row in df.iterrows():
        # 跳过空行
        student_id = str(row.get(column_mapping.get('student_id', ''), '')).strip()
        if not student_id or student_id.lower() in ['nan', 'none', 'null']:
            continue
        
        # 角色标准化
        role = 'student'  # 默认角色
        if 'role' in column_mapping:
            role_val = str(row.get(column_mapping['role'], '')).strip().lower()
            if '管理' in role_val or role_val == 'admin':
                role = 'admin'
            elif '教师' in role_val or '老师' in role_val or role_val == 'teacher':
                role = 'teacher'
            elif '学生' in role_val or role_val == 'student':
                role = 'student'
        
        # 状态标准化
        status = 'active'  # 默认状态
        if 'status' in column_mapping:
            status_val = str(row.get(column_mapping['status'], '')).strip().lower()
            if status_val in ['禁用', '停用', 'inactive', '0', 'false', '否']:
                status = 'inactive'
            elif status_val in ['启用', '激活', 'active', '1', 'true', '是']:
                status = 'active'
        
        # 部门
        department = None
        if 'department' in column_mapping:
            dept_val = row.get(column_mapping['department'], '')
            if pd.notna(dept_val):
                department = str(dept_val).strip()
        
        record = UserRecord(
            student_id=student_id,
            name=str(row.get(column_mapping['name'], '')).strip(),
            role=role,
            department=department,
            status=status,
            auth_source=auth_source
        )
        
        # 验证记录
        is_valid, error_msg = record.validate()
        if is_valid:
            records.append(record)
        else:
            print(f"警告：跳过无效记录（学工号：{student_id}）- {error_msg}")
    
    return records


def import_to_supabase(
    records: List[UserRecord],
    supabase_url: str,
    supabase_key: str
) -> tuple[int, int, List[str]]:
    """
    导入记录到 Supabase
    返回：(成功数, 跳过的重复数, 错误列表)
    """
    supabase: Client = create_client(supabase_url, supabase_key)
    
    success_count = 0
    skip_count = 0
    errors = []
    
    for record in records:
        try:
            # 检查是否已存在（忽略大小写）
            existing = supabase.table('lottery_users') \
                .select('id') \
                .ilike('student_id', record.student_id) \
                .execute()
            
            if existing.data and len(existing.data) > 0:
                # 已存在，更新信息
                update_data = {
                    'name': record.name,
                    'role': record.role,
                    'department': record.department,
                    'status': record.status,
                    'auth_source': record.auth_source,
                }
                
                result = supabase.table('lottery_users') \
                    .update(update_data) \
                    .ilike('student_id', record.student_id) \
                    .execute()
                
                if result.data:
                    print(f"更新：{record.student_id} - {record.name}")
                    success_count += 1
                else:
                    skip_count += 1
            else:
                # 不存在，插入新记录
                insert_data = {
                    'student_id': record.student_id,
                    'name': record.name,
                    'role': record.role,
                    'department': record.department,
                    'status': record.status,
                    'auth_source': record.auth_source,
                }
                
                result = supabase.table('lottery_users') \
                    .insert(insert_data) \
                    .execute()
                
                if result.data:
                    print(f"插入：{record.student_id} - {record.name}")
                    success_count += 1
                else:
                    errors.append(f"{record.student_id}: 插入失败")
                    
        except Exception as e:
            error_msg = f"{record.student_id}: {str(e)}"
            errors.append(error_msg)
            print(f"错误：{error_msg}")
    
    return success_count, skip_count, errors


def main():
    parser = argparse.ArgumentParser(
        description='导入 SSO 用户数据到 Supabase',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Excel 文件格式示例:
    | 学工号 | 姓名 | 身份 | 学院 | 状态 |
    |--------|------|------|------|------|
    | 2024001 | 张三 | student | 机械工程学院 | active |
    | T001 | 李老师 | teacher | 信息学院 | active |

环境变量:
    SUPABASE_URL: Supabase 项目 URL
    SUPABASE_SERVICE_ROLE_KEY: Supabase 服务角色密钥（需要写权限）
        """
    )
    parser.add_argument('file', help='Excel 文件路径')
    parser.add_argument(
        '--auth-source', 
        choices=['sso', 'local'], 
        default='sso',
        help='认证来源（默认：sso）'
    )
    parser.add_argument(
        '--sheet-index', 
        type=int, 
        default=0,
        help='工作表索引（默认：0）'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='试运行，不实际导入数据'
    )
    
    args = parser.parse_args()
    
    # 读取环境变量
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not args.dry_run and (not supabase_url or not supabase_key):
        print("错误：缺少环境变量")
        print("请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    # 读取 Excel
    print(f"正在读取文件：{args.file}")
    try:
        df = read_excel(args.file, args.sheet_index)
        print(f"共读取 {len(df)} 行数据")
    except Exception as e:
        print(f"错误：{e}")
        sys.exit(1)
    
    # 解析记录
    print(f"正在解析数据...")
    try:
        records = parse_records(df, args.auth_source)
        print(f"成功解析 {len(records)} 条有效记录")
    except Exception as e:
        print(f"错误：{e}")
        sys.exit(1)
    
    if len(records) == 0:
        print("没有有效记录可导入")
        sys.exit(0)
    
    # 预览数据
    print("\n数据预览（前 5 条）：")
    print("-" * 80)
    for i, r in enumerate(records[:5], 1):
        print(f"{i}. {r.student_id} | {r.name} | {r.role} | {r.department or 'N/A'} | {r.status}")
    if len(records) > 5:
        print(f"... 还有 {len(records) - 5} 条记录")
    print("-" * 80)
    
    if args.dry_run:
        print("\n试运行模式，未实际导入数据")
        sys.exit(0)
    
    # 确认导入
    confirm = input(f"\n确认导入 {len(records)} 条记录到 Supabase？ [y/N]: ")
    if confirm.lower() not in ['y', 'yes']:
        print("已取消")
        sys.exit(0)
    
    # 执行导入
    print("\n开始导入...")
    try:
        success, skipped, errors = import_to_supabase(
            records, supabase_url, supabase_key
        )
        
        print("\n" + "=" * 80)
        print(f"导入完成：")
        print(f"  成功：{success} 条")
        print(f"  跳过/更新：{skipped} 条")
        print(f"  失败：{len(errors)} 条")
        
        if errors:
            print("\n错误详情：")
            for error in errors[:10]:  # 只显示前 10 个错误
                print(f"  - {error}")
            if len(errors) > 10:
                print(f"  ... 还有 {len(errors) - 10} 个错误")
        
        print("=" * 80)
        
    except Exception as e:
        print(f"导入失败：{e}")
        sys.exit(1)


if __name__ == '__main__':
    import os
    main()
