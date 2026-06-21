'use client';

import { useState, useEffect } from 'react';
import { Building2, ChevronRight, CheckCircle2, Loader2, ArrowLeft, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  parent_id?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

interface DepartmentWithChildren extends Department {
  children?: Department[];
}

interface DepartmentSelectorProps {
  onSelect: (department: Department, remember: boolean) => void;
  userDepartmentId?: string;
  userRole?: string;
}

export function DepartmentSelector({ onSelect, userDepartmentId, userRole }: DepartmentSelectorProps) {
  const [allDepts, setAllDepts] = useState<Department[]>([]);
  const [centers, setCenters] = useState<Department[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<Department | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [step, setStep] = useState<'center' | 'dept'>('center');

  const isAdminUser = userRole === 'admin';

  useEffect(() => {
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
      const rawDepts: Department[] = (data.departments || data.data || []).map((d: any) => ({
        ...d,
        parent_id: d.parent_id || d.parentId || null,
      }));
      setAllDepts(rawDepts);

      // 找出公司节点（顶级节点，parent_id 为 null）
      const companyNode = rawDepts.find(d => !d.parent_id);
      const companyId = companyNode?.id || 'dept-company';

      // 中心 = parent_id 是公司ID 的节点
      const centerList = rawDepts.filter(d => d.parent_id === companyId);
      setCenters(centerList);
    } catch (error) {
      console.error('获取部门列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 非管理员用户：自动定位到所属部门
  useEffect(() => {
    if (!isAdminUser && userDepartmentId && allDepts.length > 0 && centers.length > 0 && !entering) {
      const dept = allDepts.find(d => d.id === userDepartmentId);
      if (dept) {
        const parentId = dept.parent_id;
        const center = centers.find(c => c.id === parentId);
        if (center) {
          // 用户属于某个中心下的部门
          setSelectedCenter(center);
          const deptsUnderCenter = allDepts.filter(d => d.parent_id === center.id);
          setDepartments(deptsUnderCenter);
          setSelectedDepartment(dept.id);
          setStep('dept');
        } else {
          // 用户可能本身就是中心级别或没有父级
          setSelectedDepartment(dept.id);
        }
        setEntering(true);
        localStorage.setItem('selectedDepartmentId', dept.id);
        const timer = setTimeout(() => {
          onSelect(dept, true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAdminUser, userDepartmentId, allDepts, centers, entering, onSelect]);

  const handleSelectCenter = (center: Department) => {
    setSelectedCenter(center);
    const deptsUnderCenter = allDepts.filter(d => d.parent_id === center.id);
    setDepartments(deptsUnderCenter);
    setSelectedDepartment('');
    setStep('dept');
  };

  const handleBackToCenters = () => {
    setSelectedCenter(null);
    setDepartments([]);
    setSelectedDepartment('');
    setStep('center');
  };

  const handleEnter = async () => {
    if (!selectedDepartment) return;
    const department = allDepts.find(d => d.id === selectedDepartment);
    if (!department) return;

    setEntering(true);
    if (rememberMe) {
      localStorage.setItem('selectedDepartmentId', selectedDepartment);
    } else {
      localStorage.removeItem('selectedDepartmentId');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    onSelect(department, rememberMe);
  };

  // 保存的部门自动选择
  useEffect(() => {
    if (!isAdminUser) return;
    const savedDeptId = localStorage.getItem('selectedDepartmentId');
    if (savedDeptId && allDepts.length > 0 && centers.length > 0 && !selectedCenter) {
      const dept = allDepts.find(d => d.id === savedDeptId);
      if (dept) {
        const parentId = dept.parent_id;
        const center = centers.find(c => c.id === parentId);
        if (center) {
          setSelectedCenter(center);
          setDepartments(allDepts.filter(d => d.parent_id === center.id));
          setSelectedDepartment(savedDeptId);
          setStep('dept');
        }
      }
    }
  }, [allDepts, centers, isAdminUser]);

  const selectedDept = allDepts.find(d => d.id === selectedDepartment);

  // 非管理员自动进入状态
  if (!isAdminUser && userDepartmentId && (entering || loading)) {
    const userDept = allDepts.find(d => d.id === userDepartmentId);
    const userCenter = centers.find(c => c.id === userDept?.parent_id);
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
                {loading ? '正在加载...' : `进入 ${userCenter?.name ? userCenter.name + ' · ' : ''}${userDept?.name || '所属部门'}`}
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

  // 主界面
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
            {step === 'center' ? '请选择所属中心' : (
              <span className="flex items-center justify-center gap-1">
                请选择 <span className="font-medium text-blue-600">{selectedCenter?.name}</span> 下的部门
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : step === 'center' ? (
            /* === 第一步：选择中心 === */
            centers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无可用中心</p>
                <p className="text-xs mt-1">请联系管理员在组织架构中添加</p>
              </div>
            ) : (
              <div className="space-y-2">
                {centers.map((center) => (
                  <button
                    key={center.id}
                    onClick={() => handleSelectCenter(center)}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors shrink-0">
                      <Building className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{center.name}</div>
                      {center.code && <div className="text-xs text-gray-400">[{center.code}]</div>}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )
          ) : (
            /* === 第二步：选择部门 === */
            <>
              {/* 返回按钮 */}
              <button
                onClick={handleBackToCenters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回选择中心
              </button>

              {departments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>该中心下暂无部门</p>
                  <p className="text-xs mt-1">请在系统管理的组织架构中添加</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDepartment(dept.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3
                        ${selectedDepartment === dept.id
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                        ${selectedDepartment === dept.id ? 'bg-blue-200' : 'bg-gray-100'}`}
                      >
                        <Building2 className={`w-5 h-5 ${selectedDepartment === dept.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{dept.name}</div>
                        {dept.code && <div className="text-xs text-gray-400">[{dept.code}]</div>}
                      </div>
                      {selectedDepartment === dept.id && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* 描述 */}
              {selectedDept?.description && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  {selectedDept.description}
                </div>
              )}

              {/* 记住选择 */}
              <div className="flex items-center justify-between pt-2">
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

      <div className="fixed bottom-4 text-center text-sm text-gray-500">
        多部门晨会管理平台 · 支持数据隔离
      </div>
    </div>
  );
}
