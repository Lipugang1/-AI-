'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RiskDatabasePage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [keyword, setKeyword] = useState('');
  const [module, setModule] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ serial_number: '', business_module: '', specific_location: '', risk_point_description: '', risk_level: 'general', hazard_inspection_cycle: '', control_responsibility_unit: '' });

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setUser(d.user); }).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/risk-database', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        let filtered = data.data || [];
        if (keyword) filtered = filtered.filter((i: any) => i.specific_location?.includes(keyword) || i.risk_point_description?.includes(keyword));
        if (module) filtered = filtered.filter((i: any) => i.business_module === module);
        setItems(filtered);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/risk-database', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        alert('添加成功');
        setShowForm(false);
        setForm({ serial_number: '', business_module: '', specific_location: '', risk_point_description: '', risk_level: 'general', hazard_inspection_cycle: '', control_responsibility_unit: '' });
        fetchData();
      } else alert(data.error || '添加失败');
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* 返回按钮 + 标题 */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/hazards')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          返回
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">风险数据库</h1>
          <p className="text-sm text-gray-500 mt-0.5">管理已知风险点和排查周期</p>
        </div>
      </div>

      {/* 筛选和操作栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
          placeholder="搜索位置、风险描述..." value={keyword} onChange={e => setKeyword(e.target.value)} />
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={module} onChange={e => setModule(e.target.value)}>
          <option value="">全部板块</option>
          {['仓储管理','设备设施','消防安全','用电安全','特种设备安全','有限空间','相关方管理'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          + 新增风险项
        </button>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p>加载中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">📊</div>
            <p>暂无风险数据</p>
            <button onClick={() => setShowForm(true)} className="text-blue-600 text-sm mt-2 hover:underline">添加第一条风险项 &rarr;</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">序号</th>
                  <th className="px-4 py-3 font-medium text-gray-600">业务板块</th>
                  <th className="px-4 py-3 font-medium text-gray-600">具体位置/设备</th>
                  <th className="px-4 py-3 font-medium text-gray-600">风险点描述</th>
                  <th className="px-4 py-3 font-medium text-gray-600">风险等级</th>
                  <th className="px-4 py-3 font-medium text-gray-600">排查周期</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{item.serial_number || i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.business_module}</td>
                    <td className="px-4 py-3 text-gray-700">{item.specific_location}</td>
                    <td className="px-4 py-3 max-w-[300px] truncate text-gray-700" title={item.risk_point_description}>{item.risk_point_description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.risk_level === 'large' ? 'bg-red-100 text-red-700' : 
                        item.risk_level === 'general' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.risk_level === 'large' ? '重大' : item.risk_level === 'general' ? '一般' : '较小'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.hazard_inspection_cycle || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-800">新增风险项</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">业务板块 <span className="text-red-500">*</span></label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.business_module} onChange={e => setForm(f => ({ ...f, business_module: e.target.value }))}>
                  <option value="">请选择</option>
                  {['仓储管理','设备设施','消防安全','用电安全','特种设备安全','有限空间','相关方管理'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">具体位置/设备 <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：东部仓库A区" value={form.specific_location} onChange={e => setForm(f => ({ ...f, specific_location: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">风险点描述 <span className="text-red-500">*</span></label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y" placeholder="详细描述风险点" value={form.risk_point_description} onChange={e => setForm(f => ({ ...f, risk_point_description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value }))}>
                    <option value="large">重大</option>
                    <option value="general">一般</option>
                    <option value="small">较小</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排查周期</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：每周、每月" value={form.hazard_inspection_cycle} onChange={e => setForm(f => ({ ...f, hazard_inspection_cycle: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleSubmit} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
