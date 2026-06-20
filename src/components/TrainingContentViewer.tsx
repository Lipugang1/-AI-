'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Shield, Wrench, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

interface TrainingContent {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  departmentId: string;
  createdAt: string;
}

const CATEGORY_CONFIG = {
  general: { label: '通用', icon: BookOpen, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  safety: { label: '安全', icon: Shield, color: 'bg-red-50 text-red-700 border-red-200' },
  technical: { label: '技术', icon: Wrench, color: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const PRIORITY_CONFIG = {
  high: { label: '高优先级', color: 'bg-red-100 text-red-700 border-red-200' },
  normal: { label: '', color: '' },
};

interface TrainingContentViewerProps {
  departmentId: string;
}

export function TrainingContentViewer({ departmentId }: TrainingContentViewerProps) {
  const [contents, setContents] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载培训内容
  const loadContents = useCallback(async () => {
    if (!departmentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/training-content?active=true&departmentId=${departmentId}`);
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

  // 按优先级和分类排序
  const sortedContents = [...contents].sort((a, b) => {
    // 高优先级排在前面
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    // 然后按创建时间倒序
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const highPriorityContents = sortedContents.filter(c => c.priority === 'high');
  const normalContents = sortedContents.filter(c => c.priority !== 'high');

  if (loading) {
    return (
      <Card className="shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <div className="p-1.5 rounded-lg bg-amber-50">
              <BookOpen className="h-4 w-4 text-amber-600" />
            </div>
            晨会必读内容
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
            <div className="p-1.5 rounded-lg bg-amber-50">
              <BookOpen className="h-4 w-4 text-amber-600" />
            </div>
            晨会必读内容
            {contents.length > 0 && (
              <Badge className="bg-blue-500 text-white text-xs">{contents.length}</Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadContents}
            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {contents.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无必读内容</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-4 pr-3">
              {/* 高优先级内容 */}
              {highPriorityContents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">重要提醒</span>
                  </div>
                  <div className="space-y-2">
                    {highPriorityContents.map((content) => {
                      const categoryInfo = CATEGORY_CONFIG[content.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.general;
                      const CategoryIcon = categoryInfo.icon;

                      return (
                        <div
                          key={content.id}
                          className="p-3 rounded-lg border border-red-200 bg-red-50/50"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <CategoryIcon className="h-4 w-4 mt-0.5 text-red-600" />
                            <h4 className="font-medium text-slate-800 flex-1">{content.title}</h4>
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{content.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded border ${categoryInfo.color}`}>
                              {categoryInfo.label}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(content.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 普通内容 */}
              {normalContents.length > 0 && (
                <div>
                  {highPriorityContents.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-600">常规宣贯</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {normalContents.map((content) => {
                      const categoryInfo = CATEGORY_CONFIG[content.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.general;
                      const CategoryIcon = categoryInfo.icon;

                      return (
                        <div
                          key={content.id}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <CategoryIcon className="h-4 w-4 mt-0.5 text-slate-600" />
                            <h4 className="font-medium text-slate-700 flex-1">{content.title}</h4>
                            <span className={`px-1.5 py-0.5 text-xs rounded border ${categoryInfo.color}`}>
                              {categoryInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{content.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {new Date(content.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
