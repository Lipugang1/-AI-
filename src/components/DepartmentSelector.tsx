'use client';

import { useState, useEffect } from 'react';
import { Building2, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

interface DepartmentSelectorProps {
  onSelect: (department: Department, remember: boolean) => void;
  /** 用户所在部门ID（非管理员时自动选中） */
  userDepartmentId?: string;
  /** 用户角色（admin 或其它） */
  userRole?: string;
}

export function DepartmentSelector({ onSelect, userDepartmentId, userRole }: DepartmentSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);

  const isAdminUser = userRole === 'admin';

  useEffect(() => {
    // 检查本地存储中是否有记住的部门
    const savedDepartmentId = localStorage.getItem('selectedDepartmentId');
    if (savedDepartmentId) {
      setSelectedDepartment(savedDepartmentId);
    }
    fetchDepartments();
  }, []);

  // 非管理员用户：自动选择其所属部门
  useEffect(() => {
    if (!isAdminUser && userDepartmentId && departments.length > 0 && !entering) {
      const dept = departments.find(d => d.id === userDepartmentId);
      if (dept) {
        setSelectedDepartment(dept.id);
        setEntering(true);
        localStorage.setItem('selectedDepartmentId', dept.id);
        // 短暂延迟以显示加载状态
        const timer = setTimeout(() => {
          onSelect(dept, true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAdminUser, userDepartmentId, departments, entering, onSelect]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.departments) {
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnter = async () => {
    if (!selectedDepartment) return;
    
    const department = departments.find(d => d.id === selectedDepartment);
    if (!department) return;

    setEntering(true);
    
    // 如果选择记住，保存到本地
    if (rememberMe) {
      localStorage.setItem('selectedDepartmentId', selectedDepartment);
    } else {
      localStorage.removeItem('selectedDepartmentId');
    }

    // 短暂延迟以显示加载状态
    await new Promise(resolve => setTimeout(resolve, 300));
    
    onSelect(department, rememberMe);
  };

  const selectedDept = departments.find(d => d.id === selectedDepartment);

  // 非管理员自动进入 - 显示进入中状态
  if (!isAdminUser && userDepartmentId && (entering || loading)) {
    const userDept = departments.find(d => d.id === userDepartmentId);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">晨会管理系统</h2>
              <p className="text-gray-500 text-sm">
                {loading ? '正在加载...' : `进入 ${userDept?.name || '所属部门'}`}
              </p>
            </div>
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </CardContent>
        </Card>
        <div className="fixed bottom-4 text-center text-sm text-gray-500">
          多部门晨会管理平台 · 支持数据隔离
        </div>
      </div>
    );
  }

  // 管理员或无 department_id 的用户：显示完整部门选择器
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            晨会管理系统
          </CardTitle>
          <CardDescription className="text-base">
            请选择您所在的部门
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无可用部门，请联系管理员添加</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="department" className="text-base font-medium">
                  部门选择
                </Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger id="department" className="h-12 text-base">
                    <SelectValue placeholder="请选择您所在的部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span>{dept.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 部门描述 */}
              {selectedDept?.description && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  {selectedDept.description}
                </div>
              )}

              {/* 记住选择 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  记住我的选择
                </Label>
                <Switch
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                />
              </div>

              {/* 进入按钮 */}
              <Button
                onClick={handleEnter}
                disabled={!selectedDepartment || entering}
                className="w-full h-12 text-base font-medium"
              >
                {entering ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    进入中...
                  </>
                ) : (
                  <>
                    进入部门系统
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* 底部提示 */}
      <div className="fixed bottom-4 text-center text-sm text-gray-500">
        多部门晨会管理平台 · 支持数据隔离
      </div>
    </div>
  );
}
