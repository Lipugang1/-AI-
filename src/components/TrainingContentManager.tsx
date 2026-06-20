'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  Shield,
  Wrench,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface TrainingContent {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  isActive: boolean;
  departmentId: string;
  createdBy: string | null;
  createdAt: string;
}

const CATEGORY_CONFIG = {
  general: { label: '通用', icon: BookOpen, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  safety: { label: '安全', icon: Shield, color: 'bg-red-50 text-red-700 border-red-200' },
  technical: { label: '技术', icon: Wrench, color: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const PRIORITY_CONFIG = {
  high: { label: '高', color: 'bg-red-100 text-red-700 border-red-200' },
  normal: { label: '普通', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

interface TrainingContentManagerProps {
  departmentId: string;
  departmentName?: string;
  onClose?: () => void;
}

export function TrainingContentManager({ departmentId, departmentName, onClose }: TrainingContentManagerProps) {
  const [contents, setContents] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContent, setEditingContent] = useState<TrainingContent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    priority: 'normal',
    isActive: true,
    createdBy: '',
  });
  const [saving, setSaving] = useState(false);

  // 加载培训内容
  const loadContents = useCallback(async () => {
    if (!departmentId) return;
    try {
      const res = await fetch(`/api/training-content?active=false&departmentId=${departmentId}`);
      const data = await res.json();
      setContents(data.contents || []);
    } catch (error) {
      console.error('加载培训内容失败:', error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  // 打开新增弹窗
  const openAddDialog = () => {
    setEditingContent(null);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      priority: 'normal',
      isActive: true,
      createdBy: '',
    });
    setShowDialog(true);
  };

  // 打开编辑弹窗
  const openEditDialog = (content: TrainingContent) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      content: content.content,
      category: content.category,
      priority: content.priority,
      isActive: content.isActive,
      createdBy: content.createdBy || '',
    });
    setShowDialog(true);
  };

  // 保存培训内容
  const saveContent = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    setSaving(true);
    try {
      const url = editingContent
        ? `/api/training-content/${editingContent.id}`
        : '/api/training-content';
      const method = editingContent ? 'PATCH' : 'POST';

      const requestBody = editingContent
        ? formData
        : { ...formData, departmentId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (data.content || data.success) {
        await loadContents();
        setShowDialog(false);
        alert(editingContent ? '修改成功！' : '添加成功！');
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('操作失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除培训内容
  const deleteContent = async (id: string, title: string) => {
    if (!confirm(`确定要删除培训内容"${title}"吗？`)) return;

    try {
      const res = await fetch(`/api/training-content/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        await loadContents();
        alert('删除成功！');
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 切换启用状态
  const toggleActive = async (content: TrainingContent) => {
    try {
      const res = await fetch(`/api/training-content/${content.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !content.isActive }),
      });

      const data = await res.json();
      if (data.content) {
        await loadContents();
      }
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <div className="p-1.5 rounded-lg bg-amber-50">
            <BookOpen className="h-5 w-5 text-amber-600" />
          </div>
          <span className="font-medium">晨会培训内容管理</span>
        </div>
        <Button onClick={openAddDialog} size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600">
          <Plus className="h-4 w-4 mr-1" />
          添加培训内容
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : contents.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>暂无培训内容</p>
          <p className="text-sm mt-1">点击上方按钮添加晨会必须宣贯的内容</p>
        </div>
      ) : (
        <ScrollArea className="h-[200px] sm:h-[300px] md:h-[400px]">
          <div className="space-y-3 pr-4">
            {contents.map((content) => {
              const categoryInfo = CATEGORY_CONFIG[content.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.general;
              const priorityInfo = PRIORITY_CONFIG[content.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
              const CategoryIcon = categoryInfo.icon;

              return (
                <div
                  key={content.id}
                  className={`p-4 rounded-xl border transition-all ${
                    content.isActive
                      ? 'bg-white border-slate-200 hover:shadow-md'
                      : 'bg-slate-50 border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                      <CategoryIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-800 truncate">{content.title}</h4>
                        <span className={`px-1.5 py-0.5 text-xs rounded border ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs rounded border ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                        {!content.isActive && (
                          <Badge variant="secondary" className="text-xs">已禁用</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{content.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        {content.createdBy && <span>创建人：{content.createdBy}</span>}
                        <span>{new Date(content.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleActive(content)}
                        title={content.isActive ? '禁用' : '启用'}
                      >
                        {content.isActive ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-blue-500" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-blue-50"
                        onClick={() => openEditDialog(content)}
                        title="编辑"
                      >
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-red-50"
                        onClick={() => deleteContent(content.id, content.title)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* 新增/编辑弹窗 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContent ? '编辑培训内容' : '添加培训内容'}</DialogTitle>
            <DialogDescription>
              {editingContent ? '修改晨会必须宣贯的培训内容' : '添加晨会必须宣贯的培训内容，供各班组实时查看'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="title">标题 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：安全生产操作规程"
              />
            </div>
            <div>
              <Label htmlFor="content">内容 *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入培训内容详情..."
                className="min-h-[120px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">通用</SelectItem>
                    <SelectItem value="safety">安全</SelectItem>
                    <SelectItem value="technical">技术</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>优先级</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        高优先级
                      </span>
                    </SelectItem>
                    <SelectItem value="normal">普通</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="createdBy">创建人</Label>
              <Input
                id="createdBy"
                value={formData.createdBy}
                onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                placeholder="请输入创建人姓名"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isActive ? 'bg-blue-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <Label>启用状态 {formData.isActive ? '（对班组可见）' : '（对班组不可见）'}</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                取消
              </Button>
              <Button onClick={saveContent} disabled={saving} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
