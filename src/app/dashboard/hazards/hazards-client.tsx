'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type TabKey = 'home' | 'list' | 'risk' | 'analytics';

export default function HazardsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 从URL hash判断当前tab
  const getTabFromPath = (): TabKey => {
    if (pathname === '/dashboard/hazards/new') return 'list';
    if (pathname === '/dashboard/hazards') return 'home';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<TabKey>('home');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user) setUser(d.user);
        else router.push('/login');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  // 切换tab时更新URL
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'risk') router.push('/dashboard/risk-database');
    else if (tab === 'analytics') router.push('/dashboard/analytics');
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">加载中...</div></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ====== 顶部标题栏（仿原系统） ====== */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-tight">隐患排查治理系统</h1>
              <p className="text-xs text-gray-400">{user.inspection_department || '物资仓储部'} / {user.name || '安全工作岗'}</p>
            </div>
          </div>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); router.push('/login'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            退出
          </button>
        </div>

        {/* 子导航标签 */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {([
            { key: 'home', label: '首页' },
            { key: 'list', label: '隐患管理' },
            { key: 'risk', label: '风险数据库' },
            { key: 'analytics', label: '数据分析' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
          {/* 管理入口 - 仅admin/reviewer可见 */}
          {(user.role === 'admin' || user.role === 'reviewer') && (
            <button onClick={() => router.push('/dashboard/admin')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
                pathname?.startsWith('/dashboard/admin')
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              管理
            </button>
          )}
        </div>
      </div>

      {/* ====== 内容区域 ====== */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'home' && <HomeContent user={user} onNavigate={setActiveTab} />}
        {activeTab === 'list' && <ListContent user={user} />}
      </div>
    </div>
  );
}

/* ================================================================
 *   首页内容：统计卡片 + 操作按钮 + 最近记录
 * ================================================================ */
function HomeContent({ user, onNavigate }: { user: any; onNavigate: (t: TabKey) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [recentHazards, setRecentHazards] = useState<any[]>([]);

  useEffect(() => {
    // 获取统计数据
    fetch('/api/hazards/stats', { credentials: 'include' })
      .then(r => r.json())
      .then(d => d.success ? setStats(d.data) : null)
      .catch(console.error);

    // 获取最近5条记录
    fetch('/api/hazards?pageSize=5', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setRecentHazards(d.success ? d.data.items || [] : []))
      .catch(console.error);
  }, []);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('zh-CN'); } catch { return d; }
  };

  const levelMap: Record<string, { label: string; color: string }> = {
    general_i: { label: 'I级', color: 'bg-red-100 text-red-700' },
    general_ii: { label: 'II级', color: 'bg-orange-100 text-orange-700' },
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
    submitted: { label: '已上报', color: 'bg-blue-100 text-blue-700' },
    approved: { label: '审核通过', color: 'bg-green-100 text-green-700' },
    processing: { label: '治理中', color: 'bg-yellow-100 text-yellow-700' },
    closed: { label: '已关闭', color: 'bg-gray-100 text-gray-500' },
  };

  const getLevelInfo = (l: string) => levelMap[l] || { label: l || '-', color: 'bg-gray-100 text-gray-600' };
  const getStatusInfo = (s: string) => statusMap[s] || { label: s, color: 'bg-gray-100 text-gray-600' };

  return (
    <div className="space-y-6">
      {/* 统计卡片行 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="隐患总数" value={stats?.total ?? 0}
          icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
          iconBg="bg-blue-50" iconColor="text-blue-500" valueColor="text-blue-600"
        />
        <StatCard title="待处理" value={stats?.pending ?? 0}
          icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          iconBg="bg-orange-50" iconColor="text-orange-500" valueColor="text-orange-600"
        />
        <StatCard title="治理中" value={stats?.inProgress ?? 0}
          icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
          iconBg="bg-yellow-50" iconColor="text-yellow-500" valueColor="text-yellow-600"
        />
        <StatCard title="已关闭" value={stats?.closed ?? 0}
          icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          iconBg="bg-green-50" iconColor="text-green-500" valueColor="text-green-600"
        />
      </div>

      {/* 操作按钮卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard href="/dashboard/hazards/new" color="blue"
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
          title="上报隐患" desc="智能识别 · AI辅助"
        />
        <ActionCard href="#" color="green" onClick={() => onNavigate('list')}
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          }
          title="查询隐患" desc="多维度筛选导出"
        />
        <ActionCard href="/dashboard/admin" color="purple"
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
          title="审核管理" desc="隐患审核与派发"
        />
      </div>

      {/* 最近隐患记录 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">最近隐患记录</h2>
          <button onClick={() => onNavigate('list')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">查看全部 &rarr;</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">序号</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">排查日期</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">排查地点</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">隐患描述</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">隐患等级</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
              </tr>
            </thead>
            <tbody>
              {recentHazards.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-gray-400">暂无隐患记录</td></tr>
              ) : recentHazards.map((h, idx) => {
                const li = getLevelInfo(h.hazard_level);
                const si = getStatusInfo(h.status);
                return (
                  <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3.5 text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-3.5 text-gray-700 whitespace-nowrap">{formatDate(h.inspection_date)}</td>
                    <td className="px-6 py-3.5 text-gray-800 max-w-[180px] truncate">{h.inspection_location || '-'}</td>
                    <td className="px-6 py-3.5 text-gray-600 max-w-[320px] truncate" title={h.hazard_description}>{h.hazard_description || '-'}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${li.color}`}>{li.label}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${si.color}`}>{si.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
 *   隐患管理列表页（含隐患闭环：治理详情/编辑/治理信息弹窗）
 * ================================================================ */
function ListContent({ user }: { user: any }) {
  const [hazards, setHazards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 0, pageSize: 10 });
  const [showDetail, setShowDetail] = useState(false);
  const [showGovernance, setShowGovernance] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info');
  const [hazardHistory, setHazardHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 治理信息表单
  const [govForm, setGovForm] = useState({
    governance_result: '',
    reviewer_name: '',
    governance_details: '',
    status: 'closed',
  });
  const [govSaving, setGovSaving] = useState(false);
  const [govAiLoading, setGovAiLoading] = useState(false);

  const [exporting, setExporting] = useState(false);

  const filtersDefault = { page: 1, pageSize: 10, startDate: '', endDate: '', department: 'all', team: 'all', inspector: '', status: '', level: '', keyword: '' };
  const [filters, setFilters] = useState(filtersDefault);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(filters.page));
      params.set('pageSize', String(filters.pageSize));
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.department !== 'all') params.set('inspectionDepartment', filters.department);
      if (filters.team !== 'all') params.set('inspectionTeam', filters.team);
      if (filters.inspector) params.set('inspectorName', filters.inspector);
      if (filters.status) params.set('status', filters.status);
      if (filters.level) params.set('hazardLevel', filters.level);
      if (filters.keyword) params.set('keyword', filters.keyword);
      
      const res = await fetch(`/api/hazards?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setHazards(data.data.items || []);
        setPagination(data.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const handleExport = async () => {
    if (!confirm('确定要导出当前筛选结果为Excel吗？')) return;
    setExporting(true);
    try {
      const body: any = {};
      if (filters.startDate) body.startDate = filters.startDate;
      if (filters.endDate) body.endDate = filters.endDate;
      if (filters.department !== 'all') body.inspectionDepartment = filters.department;
      if (filters.status) body.status = filters.status;
      if (filters.level) body.hazardLevel = filters.level;

      const res = await fetch('/api/hazards/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '隐患排查治理记录.xlsx';
        document.body.appendChild(a);
        a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        alert('导出成功！');
      } else {
        const data = await res.json();
        alert('导出失败：' + (data.error || '未知错误'));
      }
    } catch (e: any) { alert('导出失败：' + e.message); }
    finally { setExporting(false); }
  };

  const handleDelete = async (h: any) => {
    if (!confirm(`确定要删除这条隐患吗？\n\n${h.inspection_location}\n${h.hazard_description?.slice(0, 50)}`)) return;
    const res = await fetch(`/api/hazards/${h.id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (data.success) { fetchData(); alert('删除成功'); }
    else alert(data.error || '删除失败');
  };

  // 打开治理信息弹窗
  const handleOpenGovernance = (h: any) => {
    setSelectedHazard(h);
    setGovForm({
      governance_result: h.governance_result || '',
      reviewer_name: h.reviewer_name || '',
      governance_details: h.governance_details || '',
      status: h.status === 'closed' ? 'closed' : 'closed',
    });
    setShowGovernance(true);
  };

  // AI优化治理描述
  const handleAiOptimizeGovernance = async () => {
    if (!selectedHazard) return;
    const baseText = govForm.governance_details.trim();
    if (!baseText && !selectedHazard.hazard_description) {
      alert('请先输入一些治理情况内容，或确保隐患有描述信息');
      return;
    }
    setGovAiLoading(true);
    try {
      const res = await fetch('/api/ai/governance-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'governance_details',
          hazard_description: selectedHazard.hazard_description,
          hazard_level: selectedHazard.hazard_level,
          governance_measure: selectedHazard.governance_measure || '',
          current_text: baseText || '请根据隐患情况生成治理描述',
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.suggestion) {
        setGovForm(f => ({ ...f, governance_details: data.data.suggestion }));
      } else {
        alert('AI优化失败：' + (data.error || '未知错误'));
      }
    } catch (e: any) { alert('AI优化请求失败：' + e.message); }
    finally { setGovAiLoading(false); }
  };

  // 加载隐患变更历史
  const loadHazardHistory = async (hazardId: string) => {
    setHistoryLoading(true);
    setDetailTab('info');
    try {
      const res = await fetch(`/api/hazards/${hazardId}?includeHistory=true`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setHazardHistory(data.history || []);
      else setHazardHistory([]);
    } catch { setHazardHistory([]); }
    finally { setHistoryLoading(false); }
  };

  // 保存治理信息
  const handleSaveGovernance = async () => {
    if (!selectedHazard) return;
    if (!govForm.governance_result) { alert('请选择治理结果'); return; }

    setGovSaving(true);
    try {
      // 根据治理结果自动设置状态
      let newStatus = govForm.status;
      if (govForm.governance_result === '已整改') newStatus = 'closed';
      else if (govForm.governance_result === '整改中') newStatus = 'processing';
      else if (govForm.governance_result === '无法整改') newStatus = 'processing';

      const res = await fetch(`/api/hazards/${selectedHazard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          governance_result: govForm.governance_result,
          reviewer_name: govForm.reviewer_name,
          governance_details: govForm.governance_details,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowGovernance(false);
        setSelectedHazard(null);
        fetchData();
        alert('治理信息保存成功！');
      } else {
        alert('保存失败：' + (data.error || '未知错误'));
      }
    } catch (e: any) { alert('保存失败：' + e.message); }
    finally { setGovSaving(false); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('zh-CN'); } catch { return d; }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
    submitted: { label: '已上报', color: 'bg-blue-100 text-blue-700' },
    approved: { label: '审核通过', color: 'bg-green-100 text-green-700' },
    rejected: { label: '驳回', color: 'bg-red-100 text-red-700' },
    processing: { label: '治理中', color: 'bg-yellow-100 text-yellow-700' },
    closed: { label: '已关闭', color: 'bg-gray-100 text-gray-500' },
  };
  const levelMap: Record<string, { label: string; color: string }> = {
    general_i: { label: '一般I级', color: 'bg-orange-100 text-orange-700' },
    general_ii: { label: '一般II级', color: 'bg-yellow-100 text-yellow-700' },
  };
  const getStatusInfo = (s: string) => statusMap[s] || { label: s, color: 'bg-gray-100 text-gray-600' };
  const getLevelInfo = (l: string) => levelMap[l] || { label: l || '-', color: 'bg-gray-100 text-gray-600' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">隐患提报管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">排查、上报、治理隐患问题</p>
      </div>

      {/* 筛选区域 - 仿原系统布局 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
        {/* 第一行：排查部门、排查班组、排查人员、开始日期、结束日期、隐患等级 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-x-4 gap-y-3 mb-3">
          <FilterField label="排查部门">
            <select className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" value={filters.department}
              onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
              <option value="all">全部部门</option>
              <option value="物资仓储部">物资仓储部</option>
              <option value="后勤保障部">后勤保障部</option>
              <option value="安全生产部">安全生产部</option>
              <option value="综合管理部">综合管理部</option>
            </select>
          </FilterField>
          <FilterField label="排查班组">
            <select className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" value={filters.team}
              onChange={e => setFilters(f => ({ ...f, team: e.target.value }))}>
              <option value="all">全部班组</option>
              <option value="南部基建工班">南部基建工班</option>
              <option value="马店组">马店组</option>
              <option value="董厂">董厂</option>
              <option value="刘广厂">刘广厂</option>
              <option value="宋瑞敏">宋瑞敏</option>
            </select>
          </FilterField>
          <FilterField label="排查人员">
            <select className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" value={filters.inspector}
              onChange={e => setFilters(f => ({ ...f, inspector: e.target.value }))}>
              <option value="">全部人员</option>
              <option value="杨利杰">杨利杰</option>
              <option value="宋真臻">宋真臻</option>
              <option value="付金楠">付金楠</option>
              <option value="徐键健">徐键健</option>
              <option value="刘铭">刘铭</option>
              <option value="刘栋">刘栋</option>
              <option value="魏梦娇">魏梦娇</option>
              <option value="俞冬梅">俞冬梅</option>
              <option value="韩冬梅">韩冬梅</option>
            </select>
          </FilterField>
          <FilterField label="开始日期">
            <input type="date" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </FilterField>
          <FilterField label="结束日期">
            <input type="date" className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </FilterField>
          <FilterField label="隐患等级">
            <select className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" value={filters.level}
              onChange={e => setFilters(f => ({ ...f, level: e.target.value }))}>
              <option value="">全部等级</option>
              <option value="general_i">一般I级</option>
              <option value="general_ii">一般II级</option>
            </select>
          </FilterField>
        </div>
        {/* 第二行：处理状态 + 关键词搜索 */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <FilterField label="处理状态">
            <select className="w-full min-w-[140px] border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">全部状态</option>
              <option value="draft">草稿</option>
              <option value="submitted">已上报</option>
              <option value="approved">审核通过</option>
              <option value="processing">治理中</option>
              <option value="closed">已关闭</option>
            </select>
          </FilterField>
          <div className="flex-1 max-w-md">
            <label className="block text-xs text-gray-500 mb-1">关键词搜索</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" placeholder="排查地点、隐患描述..."
                value={filters.keyword} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') setFilters(f => ({ ...f, page: 1 })); }} />
              <button onClick={() => setFilters(f => ({ ...f, page: 1 }))}
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="text-sm text-gray-500">共 {pagination.total} 条记录</div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting || hazards.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            {exporting ? '导出中...' : '导出Excel'}
          </button>
          <a href="/dashboard/hazards/new">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              上报新隐患
            </button>
          </a>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div><p>加载中...</p>
          </div>
        ) : hazards.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">&#128203;</div>
            <p>暂无隐患数据</p>
            <a href="/dashboard/hazards/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">去上报第一条隐患 &rarr;</a>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">序号</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">排查日期</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">上报人</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">部门</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">排查地点</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">隐患描述</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">隐患等级</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">状态</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {hazards.map((h, idx) => {
                    const si = getStatusInfo(h.status);
                    const li = getLevelInfo(h.hazard_level);
                    return (
                      <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-sm">{(pagination.page - 1) * pagination.pageSize + idx + 1}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">{formatDate(h.inspection_date)}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{h.inspector_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm max-w-[100px] truncate">{h.inspection_department || '-'}</td>
                        <td className="px-4 py-3 text-gray-800 text-sm max-w-[130px] truncate" title={h.inspection_location}>{h.inspection_location || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm max-w-[200px] truncate" title={h.hazard_description}>{h.hazard_description || '-'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${li.color}`}>{li.label}</span></td>
                        <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${si.color}`}>{si.label}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button onClick={() => { setSelectedHazard(h); setShowDetail(true); loadHazardHistory(h.id); }} className="text-blue-500 hover:text-blue-700 text-xs font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">治理详情</button>
                            <button onClick={() => handleOpenGovernance(h)} className="text-emerald-500 hover:text-emerald-700 text-xs font-medium px-2 py-0.5 rounded hover:bg-emerald-50 transition-colors">编辑</button>
                            <button onClick={() => handleDelete(h)} className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-0.5 rounded hover:bg-red-50 transition-colors">删除</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <span className="text-xs text-gray-500">第 {pagination.page}/{pagination.totalPages} 页，共 {pagination.total} 条</span>
                <div className="flex gap-1">
                  <button disabled={pagination.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">&lt; 上一页</button>
                  <button disabled={pagination.page >= pagination.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">下一页 &gt;</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 详情弹窗（含变更历史页签） */}
      {showDetail && selectedHazard && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-start rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg text-gray-800">隐患详情</h3>
                <p className="text-xs text-gray-400 mt-0.5">ID: {selectedHazard.id}</p>
              </div>
              <button onClick={() => setShowDetail(false)} className="text-gray-300 hover:text-gray-500 text-2xl leading-none transition-colors">&times;</button>
            </div>

            {/* 页签导航 */}
            <div className="flex border-b border-gray-100 px-6">
              <button onClick={() => setDetailTab('info')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  detailTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                详情信息
              </button>
              <button onClick={() => setDetailTab('history')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  detailTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                变更历史
                {hazardHistory.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">{hazardHistory.length}</span>
                )}
              </button>
            </div>

            {/* 页签内容 */}
            <div className="overflow-y-auto flex-1 p-6">
              {detailTab === 'info' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="排查日期" value={formatDate(selectedHazard.inspection_date)} />
                    <InfoField label="排查地点" value={selectedHazard.inspection_location} />
                    <InfoField label="部门" value={selectedHazard.inspection_department || '-'} />
                    <InfoField label="班组" value={selectedHazard.inspection_team || '-'} />
                    <InfoField label="上报人" value={selectedHazard.inspector_name || '-'} />
                    <InfoField label="隐患等级">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getLevelInfo(selectedHazard.hazard_level).color}`}>
                        {getLevelInfo(selectedHazard.hazard_level).label}
                      </span>
                    </InfoField>
                    <InfoField label="状态">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusInfo(selectedHazard.status).color}`}>
                        {getStatusInfo(selectedHazard.status).label}
                      </span>
                    </InfoField>
                    <InfoField label="隐患分类" value={selectedHazard.hazard_category || '-'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">隐患描述</label>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap min-h-[60px] border border-gray-100">{selectedHazard.hazard_description || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">临时措施</label>
                    <div className="bg-yellow-50/70 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap min-h-[40px] border border-yellow-100">{selectedHazard.temporary_measures || '-'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="治理责任部门" value={selectedHazard.governance_department || '-'} />
                    <InfoField label="治理责任人" value={selectedHazard.governance_person || '-'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">治理措施</label>
                    <div className="bg-green-50/70 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap min-h-[40px] border border-green-100">{selectedHazard.governance_measure || '-'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="整改期限" value={formatDate(selectedHazard.governance_deadline)} />
                    <InfoField label="配合部门" value={selectedHazard.cooperating_department || '-'} />
                  </div>

                  {/* 治理闭环信息（如果有） */}
                  {(selectedHazard.governance_result || selectedHazard.reviewer_name || selectedHazard.governance_details) && (
                    <>
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">隐患闭环</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <InfoField label="治理结果">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            selectedHazard.governance_result === '已整改' ? 'bg-green-100 text-green-700' :
                            selectedHazard.governance_result === '整改中' ? 'bg-yellow-100 text-yellow-700' :
                            selectedHazard.governance_result === '无法整改' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {selectedHazard.governance_result || '-'}
                          </span>
                        </InfoField>
                        <InfoField label="复查人" value={selectedHazard.reviewer_name || '-'} />
                      </div>
                      {selectedHazard.governance_details && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">具体治理情况</label>
                          <div className="bg-emerald-50/70 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap min-h-[40px] border border-emerald-100">{selectedHazard.governance_details}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* 变更历史页签 */
                <div>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-sm text-gray-400">加载变更记录...</span>
                    </div>
                  ) : hazardHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-3 text-sm text-gray-400">暂无变更记录</p>
                      <p className="text-xs text-gray-300 mt-1">治理操作后将会在此显示变更历史</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* 时间线 */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      <div className="space-y-6">
                        {hazardHistory.map((entry: any, idx: number) => (
                          <div key={entry.id || idx} className="relative pl-10">
                            {/* 时间线圆点 */}
                            <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                              entry.action === '隐患治理更新' ? 'bg-emerald-100 border-emerald-500' :
                              entry.action === '隐患删除' ? 'bg-red-100 border-red-500' :
                              'bg-blue-100 border-blue-500'
                            }`}></div>

                            {/* 历史卡片 */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  entry.action === '隐患治理更新' ? 'bg-emerald-100 text-emerald-700' :
                                  entry.action === '隐患删除' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>{entry.action}</span>
                                <span className="text-xs text-gray-400">{entry.createdAt ? new Date(entry.createdAt).toLocaleString('zh-CN') : ''}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{entry.userName}</span>
                              </div>
                              {entry.details?.changes && entry.details.changes.length > 0 && (
                                <div className="space-y-1.5 mt-2">
                                  {entry.details.changes.map((change: any, ci: number) => (
                                    <div key={ci} className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500 w-20 flex-shrink-0">{change.label}</span>
                                      <span className="text-gray-400 line-through bg-red-50 px-1.5 py-0.5 rounded">{change.from ?? '(空)'}</span>
                                      <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                      </svg>
                                      <span className="text-gray-700 bg-green-50 px-1.5 py-0.5 rounded font-medium">{change.to ?? '(空)'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 rounded-b-2xl flex justify-end">
              <button onClick={() => setShowDetail(false)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-700 font-medium transition-colors">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== 治理信息填写弹窗（隐患闭环）====== */}
      {showGovernance && selectedHazard && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setShowGovernance(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-500">复核人</span>
                </div>
                <div className="text-base font-semibold text-gray-800">{user?.name || '待填派'}</div>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusInfo(selectedHazard.status).color}`}>
                {getStatusInfo(selectedHazard.status).label}
              </span>
            </div>

            {/* 治理信息表单 */}
            <div className="p-6">
              {/* 标题栏 */}
              <div className="flex items-center gap-2 mb-5">
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span className="text-base font-semibold text-gray-800">填写治理信息</span>
                <span className="text-xs text-gray-400">（上报人可在治理时限内填写）</span>
              </div>

              {/* 治理结果 + 复查人 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">治理结果</label>
                  <select
                    value={govForm.governance_result}
                    onChange={e => setGovForm(f => ({ ...f, governance_result: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none bg-white"
                  >
                    <option value="">选择治理结果</option>
                    <option value="已整改">已整改</option>
                    <option value="整改中">整改中</option>
                    <option value="无法整改">无法整改</option>
                    <option value="部分整改">部分整改</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">复查人</label>
                  <input
                    type="text"
                    placeholder="输入复查人姓名"
                    value={govForm.reviewer_name}
                    onChange={e => setGovForm(f => ({ ...f, reviewer_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* 具体治理情况 + AI优化 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">具体治理情况</label>
                  <button
                    onClick={handleAiOptimizeGovernance}
                    disabled={govAiLoading}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:text-gray-400 transition-colors"
                  >
                    <svg className={`h-3.5 w-3.5 ${govAiLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    {govAiLoading ? 'AI生成中...' : 'AI优化'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="请详细描述治理过程和结果..."
                  value={govForm.governance_details}
                  onChange={e => setGovForm(f => ({ ...f, governance_details: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none resize-none placeholder:text-gray-300 leading-relaxed"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGovernance(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveGovernance}
                  disabled={govSaving || !govForm.governance_result}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 rounded-xl text-sm font-medium text-white transition-colors disabled:cursor-not-allowed"
                >
                  {govSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== 子组件 ========== */

function StatCard({ title, value, icon, iconBg, iconColor, valueColor }: {
  title: string; value: number | string;
  icon: React.ReactNode; iconBg: string; iconColor: string; valueColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-0.5">{title}</p>
        <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

function ActionCard({ href, color, icon, title, desc, onClick }: {
  href: string; color: string;
  icon: React.ReactNode; title: string; desc: string;
  onClick?: () => void;
}) {
  const colorMap: Record<string, { bg: string; iconBg: string; iconColor: string; hover: string }> = {
    blue: { bg: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-50', iconColor: 'text-blue-500', hover: 'hover:-translate-y-0.5' },
    green: { bg: 'hover:shadow-emerald-500/20', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', hover: 'hover:-translate-y-0.5' },
    purple: { bg: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-50', iconColor: 'text-purple-500', hover: 'hover:-translate-y-0.5' },
  };
  const c = colorMap[color] || colorMap.blue;

  if (onClick) {
    return (
      <button onClick={onClick}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${c.hover} ${c.bg} hover:shadow-md`}>
        <div className={`w-16 h-16 rounded-2xl ${c.iconBg} flex items-center justify-center`}>
          <div className={c.iconColor}>{icon}</div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
        </div>
      </button>
    );
  }

  return (
    <a href={href}
      className={`block bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center gap-3 transition-all duration-200 ${c.hover} ${c.bg} hover:shadow-md`}>
      <div className={`w-16 h-16 rounded-2xl ${c.iconBg} flex items-center justify-center`}>
        <div className={c.iconColor}>{icon}</div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </a>
  );
}

function InfoField({ label, children, value }: { label: string; children?: React.ReactNode; value?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</label>
      <div className="text-sm text-gray-800 font-medium">{value !== undefined ? value : children}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
