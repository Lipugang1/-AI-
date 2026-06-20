'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type TabKey = 'hazard' | 'equipment' | 'monthlyCheck' | 'meeting';
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hazard', label: '隐患数据分析', icon: '⚠️' },
  { key: 'equipment', label: '器材巡查统计', icon: '🔧' },
  { key: 'monthlyCheck', label: '月度安全检查', icon: '📋' },
  { key: 'meeting', label: '晨会统计', icon: '📅' },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('hazard');
  const [reportData, setReportData] = useState<any>(null); // for AI report

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && (d.user || d.data)) setUser(d.user || d.data);
        else router.push('/login');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, period, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`/api/analytics?${params}`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="flex items-center gap-3"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><span className="text-gray-500">加载中...</span></div></div>;
  if (!user) return null;
  if (!data) return <div className="p-6 text-gray-500">暂无数据</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">数据分析中心</h1>
            <p className="text-sm text-gray-500 mt-1">多维度数据分析与可视化，覆盖隐患、器材、安全检查、晨会</p>
          </div>
        </div>

        {/* 时间筛选栏 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">时间范围：</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPeriod('custom'); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPeriod('custom'); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={period} onChange={e => { setPeriod(e.target.value); if (e.target.value !== 'custom') { setStartDate(''); setEndDate(''); } }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">全部时间</option>
            <option value="month">本月</option>
            <option value="custom" disabled>自定义</option>
          </select>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setPeriod('all'); }}
              className="text-sm text-blue-600 hover:text-blue-700 underline">
              清除日期
            </button>
          )}
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'hazard' && <HazardAnalytics data={data.hazard} period={period} startDate={startDate} endDate={endDate} />}
      {activeTab === 'equipment' && <EquipmentAnalytics data={data.equipment} period={period} />}
      {activeTab === 'monthlyCheck' && <MonthlyCheckAnalytics data={data.monthlyCheck} period={period} />}
      {activeTab === 'meeting' && <MeetingAnalytics data={data.meeting} period={period} />}
    </div>
  );
}

// ========== 隐患数据分析 ==========
function HazardAnalytics({ data, period, startDate, endDate }: { data: any; period: string; startDate: string; endDate: string }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [aiError, setAiError] = useState('');

  if (!data) return <EmptyState />;
  const { summary, departmentStats, levelStats, statusStats, inspectorStats, monthlyTrend } = data;

  const handleGenerateReport = async () => {
    setAiLoading(true);
    setAiError('');
    setAiReport('');
    try {
      const res = await fetch('/api/ai-hazard-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          summary,
          departmentStats,
          levelStats,
          statusStats,
          inspectorStats: inspectorStats?.slice(0, 10) || [],
          monthlyTrend,
          period,
          startDate,
          endDate,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setAiReport(result.report);
      } else {
        setAiError(result.error || '生成报告失败');
      }
    } catch (e: any) {
      setAiError('请求失败：' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const timeLabel = startDate && endDate
    ? `${startDate} 至 ${endDate}`
    : period === 'month' ? '本月' : '全部时间';

  return (
    <div>
      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="隐患总数" value={summary.total} color="blue" />
        <StatCard label="涉及部门" value={summary.departments} color="green" />
        <StatCard label="排查人数" value={summary.inspectors} color="purple" />
        <StatCard label="部门均量" value={summary.avgPerDepartment} color="orange" />
        <StatCard label="已关闭" value={summary.closed || 0} color="teal" />
        <StatCard label="闭环率" value={`${summary.closedRate || 0}%`} color="cyan" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 部门分布 */}
        <Panel title="📊 部门隐患分布">
          {Object.keys(departmentStats).length === 0 ? (
            <EmptySection />
          ) : (
            <div className="space-y-2">
              {Object.entries(departmentStats).sort(([, a], [, b]) => (b as number) - (a as number)).map(([name, count]: [string, any]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="flex-1 text-sm text-gray-600 truncate">{name}</div>
                  <div className="w-32 bg-gray-100 rounded-full h-3 overflow-hidden flex-shrink-0">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, count / summary.total * 100)}%` }}></div>
                  </div>
                  <div className="text-sm font-medium text-gray-800 w-8 text-right">{count}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* 等级分布 */}
        <Panel title="🔺 隐患等级分布">
          {Object.keys(levelStats).length === 0 ? <EmptySection /> : (
            <div className="space-y-3">
              {Object.entries(levelStats).map(([name, count]: [string, any]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    name.includes('重大') ? 'bg-red-100 text-red-700' :
                    name.includes('I级') ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{name}</span>
                  <span className="text-lg font-bold text-gray-800">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* 状态分布 */}
        <Panel title="📝 隐患状态分布">
          {Object.keys(statusStats).length === 0 ? <EmptySection /> : (
            <div className="space-y-2">
              {Object.entries(statusStats).map(([name, count]: [string, any]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    name === '已关闭' ? 'bg-green-100 text-green-700' :
                    name === '已上报' ? 'bg-blue-100 text-blue-700' :
                    name === '治理中' ? 'bg-yellow-100 text-yellow-700' :
                    name === '草稿' ? 'bg-gray-100 text-gray-600' :
                    'bg-red-100 text-red-700'
                  }`}>{name}</span>
                  <span className="font-medium text-gray-800">{count}条</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* 排查人员TOP5 */}
        <Panel title="🏆 排查人员TOP5">
          {inspectorStats?.length === 0 ? <EmptySection /> : (
            <div className="space-y-2">
              {inspectorStats?.slice(0, 5).map((ins: any, i: number) => (
                <div key={ins.name} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-500' :
                    i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'
                  }`}>{i + 1}</div>
                  <div className="flex-1 text-sm text-gray-700">{ins.name}</div>
                  <div className="text-sm font-medium text-gray-800">{ins.count}条</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 月度趋势 */}
      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className="mt-4">
          <MonthlyTrendChart data={monthlyTrend} title="📈 隐患月度趋势（近6个月）" color="blue" />
        </div>
      )}

      {/* ====== AI隐患分析报告 ====== */}
      <div className="mt-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">AI 隐患分析报告</h3>
                <p className="text-xs text-gray-500">基于 {timeLabel} 数据进行智能分析</p>
              </div>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={aiLoading || summary.total === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {aiLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  AI分析中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  生成分析报告
                </>
              )}
            </button>
          </div>
          <div className="p-6">
            {aiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                {aiError}
              </div>
            )}
            {aiReport ? (
              <div className="prose prose-sm max-w-none">
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiReport}</div>
              </div>
            ) : !aiLoading && !aiError ? (
              <div className="text-center py-8 text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                <p className="text-sm">点击"生成分析报告"按钮，AI 将基于当前数据进行智能分析</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 器材巡查统计 ==========
function EquipmentAnalytics({ data, period }: { data: any; period: string }) {
  if (!data) return <EmptyState />;
  const { summary, equipmentTypeStats, eqInspectorStats, monthlyTrend } = data;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="巡查总次数" value={summary.totalInspections} color="blue" />
        <StatCard label="器材总数" value={summary.totalEquipment} color="green" />
        <StatCard label="正常" value={summary.normalCount} color="teal" />
        <StatCard label="异常" value={summary.anomalyCount} color="red" />
        <StatCard label="异常率" value={`${summary.anomalyRate}%`} color="orange" />
        <StatCard label="巡查人数" value={summary.totalInspectors} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="🔧 器材类型巡查分布">
          {Object.keys(equipmentTypeStats || {}).length === 0 ? <EmptySection /> : (
            <div className="space-y-2">
              {Object.entries(equipmentTypeStats || {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([type, count]: [string, any]) => {
                const colors: Record<string, string> = { '消火栓': 'bg-blue-500', '灭火器': 'bg-red-500', '消防沙': 'bg-yellow-500' };
                return (
                  <div key={type} className="flex items-center gap-2">
                    <div className="flex-1 text-sm text-gray-600">{type}</div>
                    <div className="w-32 bg-gray-100 rounded-full h-3 overflow-hidden flex-shrink-0">
                      <div className={`${colors[type] || 'bg-blue-500'} h-full rounded-full`}
                        style={{ width: `${Math.min(100, count / summary.totalInspections * 100)}%` }}></div>
                    </div>
                    <div className="text-sm font-medium text-gray-800 w-8 text-right">{count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="👤 巡查人员统计">
          {eqInspectorStats?.length === 0 ? <EmptySection /> : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eqInspectorStats?.slice(0, 10).map((ins: any, i: number) => (
                <div key={ins.name} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{i + 1}</div>
                  <div className="flex-1 text-gray-700">{ins.name}</div>
                  <span className="text-blue-600 font-medium">{ins.count}次</span>
                  {ins.anomalyCount > 0 && <span className="text-red-500 text-xs">异常{ins.anomalyCount}</span>}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className="mt-4">
          <MonthlyTrendChart data={monthlyTrend} title="📈 器材巡查月度趋势（近6个月）" color="green" />
        </div>
      )}
    </div>
  );
}

// ========== 月度安全检查 ==========
function MonthlyCheckAnalytics({ data, period }: { data: any; period: string }) {
  if (!data) return <EmptyState />;
  const { summary, monthlyTrend } = data;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="检查总次数" value={summary.totalChecks} color="blue" />
        <StatCard label="区域总数" value={summary.totalAreas} color="green" />
        <StatCard label="合格次数" value={summary.qualifiedChecks} color="teal" />
        <StatCard label="不合格次数" value={summary.unqualifiedChecks} color="red" />
        <StatCard label="合格率" value={`${summary.qualifiedRate}%`} color="emerald" />
        <StatCard label="区域覆盖" value={`${summary.areaCoverageRate}%`} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="✅ 月度检查合格率">
          <div className="flex flex-col items-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx="64" cy="64" r="56" fill="none"
                  stroke={summary.qualifiedRate >= 80 ? '#10b981' : summary.qualifiedRate >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${351.86}`} strokeDashoffset={`${351.86 * (1 - summary.qualifiedRate / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">{summary.qualifiedRate}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">合格 {summary.qualifiedChecks} / 总数 {summary.totalChecks}</p>
          </div>
        </Panel>
        <Panel title="📍 区域检查覆盖率">
          <div className="flex flex-col items-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx="64" cy="64" r="56" fill="none"
                  stroke={summary.areaCoverageRate >= 80 ? '#8b5cf6' : summary.areaCoverageRate >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${351.86}`} strokeDashoffset={`${351.86 * (1 - summary.areaCoverageRate / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">{summary.areaCoverageRate}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">已查 {Math.round(summary.totalAreas * summary.areaCoverageRate / 100)} / 总数 {summary.totalAreas} 个区域</p>
          </div>
        </Panel>
      </div>

      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className="mt-4">
          <MonthlyTrendChart data={monthlyTrend} title="📈 月度安全检查趋势（近6个月）" color="purple" />
        </div>
      )}
    </div>
  );
}

// ========== 晨会统计 ==========
function MeetingAnalytics({ data, period }: { data: any; period: string }) {
  if (!data) return <EmptyState />;
  const { summary, monthlyTrend } = data;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="晨会总数" value={summary.totalMeetings} color="blue" />
        <StatCard label="覆盖部门" value={summary.departmentsCovered} color="green" />
        <StatCard label="签到总人次" value={summary.totalAttendance} color="purple" />
        <StatCard label="出勤" value={summary.presentCount} color="teal" />
        <StatCard label="缺勤" value={summary.absentCount} color="red" />
        <StatCard label="出勤率" value={`${summary.attendanceRate}%`} color="cyan" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="👥 出勤率统计">
          <div className="flex flex-col items-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx="64" cy="64" r="56" fill="none"
                  stroke={summary.attendanceRate >= 90 ? '#10b981' : summary.attendanceRate >= 70 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${351.86}`} strokeDashoffset={`${351.86 * (1 - summary.attendanceRate / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">{summary.attendanceRate}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">出勤 {summary.presentCount} / 总数 {summary.totalAttendance} 人次</p>
          </div>
        </Panel>
        <Panel title="📊 晨会概览">
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">晨会总场次</span>
              <span className="text-xl font-bold text-blue-600">{summary.totalMeetings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">覆盖部门数</span>
              <span className="text-xl font-bold text-green-600">{summary.departmentsCovered}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">平均每场出勤率</span>
              <span className="text-xl font-bold text-purple-600">{summary.totalMeetings > 0 ? Math.round(summary.presentCount / summary.totalMeetings) : 0}人</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">出勤</span>
                <span className="text-gray-500">缺勤</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="h-full flex">
                  <div className="bg-teal-500 h-full" style={{ width: `${summary.attendanceRate}%` }}></div>
                  <div className="bg-red-400 h-full" style={{ width: `${100 - summary.attendanceRate}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-teal-600">{summary.presentCount}人</span>
                <span className="text-red-500">{summary.absentCount}人</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className="mt-4">
          <MonthlyTrendChart data={monthlyTrend} title="📈 晨会月度趋势（近6个月）" color="cyan" />
        </div>
      )}
    </div>
  );
}

// ========== 复用组件 ==========

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color] || colorMap.blue}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-bold mt-1">{value ?? 0}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptySection() {
  return <div className="text-sm text-gray-400 py-4 text-center">{'暂无数据'}</div>;
}

function EmptyState() {
  return <div className="text-center py-20 text-gray-400">暂无统计数据</div>;
}

function MonthlyTrendChart({ data, title, color }: { data: { month: string; count: number }[]; title: string; color: string }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="text-xs text-gray-500 font-medium">{item.count}</div>
            <div className={`w-full ${colorMap[color] || 'bg-blue-500'} rounded-t transition-all hover:opacity-80`}
              style={{ height: `${Math.max(8, item.count / maxCount * 100)}px` }}></div>
            <div className="text-xs text-gray-400 truncate w-full text-center">{item.month}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
