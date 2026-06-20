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
}

export function DepartmentSelector({ onSelect }: DepartmentSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    // 检查本地存储中是否有记住的部门
    const savedDepartmentId = localStorage.getItem('selectedDepartmentId');
    if (savedDepartmentId) {
      setSelectedDepartment(savedDepartmentId);
    }
    fetchDepartments();
  }, []);

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
