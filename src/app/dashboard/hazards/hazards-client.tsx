'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type TabKey = 'home' | 'list' | 'review' | 'risk';

export default function HazardsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getTabFromPath = (): TabKey => {
    if (pathname === '/dashboard/hazards/new') return 'list';
    if (pathname === '/dashboard/hazards') return 'home';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getTabFromPath());

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

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'risk') router.push('/dashboard/risk-database');
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">加载中...</div></div>;
  if (!user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">登录信息已过期，正在跳转...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
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

        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {([
            { key: 'home', label: '首页' },
            { key: 'list', label: '隐患管理' },
            { key: 'review', label: '待审核', roles: ['admin', 'reviewer'] },
            { key: 'risk', label: '风险数据库' },
          ] as { key: TabKey; label: string; roles?: string[] }[]).filter(tab => !tab.roles || tab.roles.includes(user?.role)).map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab.label}
              {tab.key === 'review' && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">NEW</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'home' && <HomeContent user={user} onNavigate={setActiveTab} />}
        {activeTab === 'list' && <ListContent user={user} />}
        {activeTab === 'review' && <ReviewContent user={user} onRefresh={() => setActiveTab('home')} />}
      </div>
    </div>
  );
}
