'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Clock, Users, BookOpen, AlertTriangle, HelpCircle } from 'lucide-react';

export function MeetingGuidelines() {
  const [isOpen, setIsOpen] = useState(false);

  const requirements = [
    {
      icon: Users,
      title: '参会人员',
      content: '每班上岗前召开晨会，原则上与现有的班前会合并，由班组长或班组长指定带班人员主持，当班人员必须全员参加并签名。',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Clock,
      title: '会议时长',
      content: '时间不少于5分钟。',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: FileText,
      title: '会议内容',
      content: '"晨会"内容应包括：会前点名、检查与会人员状态、安排部署工作任务、组织教育培训、强调当班安全生产注意事项、抽问员工（不少于2人）等。',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: AlertTriangle,
      title: '实时场景',
      content: '晨会是否按照实时场景开展，比如防寒应对阶段，是否有扫雪除冰等相关内容。',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <Card className="border-l-4 border-l-blue-500">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                晨会召开要求
                <Badge variant="secondary" className="text-xs">必读</Badge>
              </span>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {requirements.map((req, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg ${req.bgColor} border`}
              >
                <div className="flex items-start gap-3">
                  <req.icon className={`h-5 w-5 ${req.color} shrink-0 mt-0.5`} />
                  <div>
                    <h4 className={`font-semibold text-sm ${req.color} mb-1`}>
                      {index + 1}. {req.title}
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {req.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* 快速检查清单 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                晨会检查清单
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>会前点名完成</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>人员状态检查</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>工作任务部署</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>安全教育培训</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>强调当班安全生产注意事项</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>员工抽问（≥2人）</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>实时场景内容</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>全员签名确认</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="rounded" />
                  <span>时长≥5分钟</span>
                </label>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
