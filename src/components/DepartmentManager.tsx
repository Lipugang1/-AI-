'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

interface DepartmentManagerProps {
  onClose?: () => void;
}

export function DepartmentManager({ onClose }: DepartmentManagerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments?active=false');
      const data = await res.json();
      if (data.departments) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error('获取部门列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingDepartment(null);
    setFormData({ name: '', code: '', description: '', isActive: true });
    setError('');
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setIsCreating(false);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      isActive: dept.isActive,
    });
    setError('');
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`确定要删除部门"${dept.name}"吗？`)) return;
    
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      fetchDepartments();
    } catch (err) {
      console.error('删除部门失败:', err);
      alert('删除失败');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      setError('部门名称和编码不能为空');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingDepartment) {
        // 更新
        const res = await fetch(`/api/departments/${editingDepartment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
      } else {
        // 创建
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
      }

      // 关闭弹窗并刷新列表
      setEditingDepartment(null);
      setIsCreating(false);
      fetchDepartments();
    } catch (err) {
      console.error('保存部门失败:', err);
      setError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      await fetch(`/api/departments/${dept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !dept.isActive }),
      });
      fetchDepartments();
    } catch (err) {
      console.error('切换状态失败:', err);
    }
  };

  const closeModal = () => {
    setEditingDepartment(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          部门管理
        </h3>
        <Button onClick={handleCreate} size="sm" className="gap-1">
          <Plus className="w-4 h-4" />
          添加部门
        </Button>
      </div>

      {/* 部门列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无部门
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  dept.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{dept.name}</span>
                    <Badge variant={dept.isActive ? 'default' : 'secondary'} className="text-xs">
                      {dept.isActive ? '启用' : '停用'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    编码: {dept.code}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Switch
                    checked={dept.isActive}
                    onCheckedChange={() => handleToggleActive(dept)}
                    className="scale-75"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(dept)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(dept)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* 创建/编辑弹窗 */}
      {(isCreating || editingDepartment) && (
        <Dialog open={true} onOpenChange={closeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? '编辑部门' : '添加部门'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">部门名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：物资仓储部"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">部门编码</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  placeholder="例如：materials"
                />
                <p className="text-xs text-gray-500">编码只能包含小写字母和数字</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">部门描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="部门的简要描述..."
                  rows={3}
                />
              </div>

              {editingDepartment && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">启用状态</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeModal}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    保存
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
