'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [initError, setInitError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'org'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    username: '', name: '', password: '', role: 'inspector',
    inspection_center: '', inspection_department: '', inspection_team: '', inspection_position: '', is_active: true
  });

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (d.success) {
          setUser(d.user || d.data);
        } else {
          setInitError(d.error || '获取用户信息失败');
        }
      })
      .catch(e => {
        console.error('Admin auth/me error:', e);
        setInitError('无法加载用户信息: ' + (e.message || '未知错误'));
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const data = await res.json();
      setUsers(data.success ? data.data || [] : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSaveUser = async () => {
    if (!userForm.username.trim()) { alert('请输入用户名'); return; }
    if (!userForm.name.trim()) { alert('请输入姓名'); return; }
    if (!editingUser && !userForm.password) { alert('请输入密码'); return; }
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = { ...userForm };
      if (editingUser && !userForm.password) delete (body as any).password;

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        alert(editingUser ? '更新成功！' : '创建成功！');
        setShowUserModal(false);
        setEditingUser(null);
        setUserForm({ username: '', name: '', password: '', role: 'inspector',
          inspection_center: '', inspection_department: '', inspection_team: '', inspection_position: '', is_active: true });
        fetchUsers();
      } else alert(data.error || '操作失败');
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`确定删除用户「${u.name}」吗？`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { alert('删除成功！'); fetchUsers(); }
      else alert(data.error || '删除失败');
    } catch (e: any) { alert(e.message); }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({ username: '', name: '', password: '', role: 'inspector',
      inspection_center: '', inspection_department: '', inspection_team: '', inspection_position: '', is_active: true });
    setShowUserModal(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setUserForm({
      username: u.username, name: u.name, password: '',
      role: u.role || 'inspector',
      inspection_center: u.inspection_center || '',
      inspection_department: u.inspection_department || '',
      inspection_team: u.inspection_team || '',
      inspection_position: u.inspection_position || '',
      is_active: u.is_active !== false
    });
    setShowUserModal(true);
  };

  const [orgTree, setOrgTree] = useState<any[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgModalType, setOrgModalType] = useState<'dept' | 'team'>('dept');
  const [orgForm, setOrgForm] = useState({ id: '', name: '', code: '', parentId: '', description: '', sortOrder: 99, teamDeptId: '' });
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [orgSaveMsg, setOrgSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchOrgTree = async () => {
    setOrgLoading(true);
    try {
      const res = await fetch('/api/departments?action=tree', { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrgTree(data.data);
        console.log('orgTree refreshed:', data.data.length, 'roots');
        return true;
      }
      console.error('fetchOrgTree failed:', data);
      return false;
    } catch (e) { console.error('fetchOrgTree error:', e); return false; }
    finally { setOrgLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'org' && user) fetchOrgTree();
  }, [activeTab, user]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/departments', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      setImportResult(data);
      if (data.success) fetchOrgTree();
    } catch (e: any) { setImportResult({ success: false, error: e.message }); }
    finally { setImporting(false); e.target.value = ''; }
  };

  const handleSaveOrg = async () => {
    if (!orgForm.name.trim()) { setOrgSaveMsg({ type: 'error', text: '请输入名称' }); return; }
    setSaving(true);
    setOrgSaveMsg(null);
    try {
      let res: Response;
      if (orgModalType === 'dept') {
        const deptId = orgForm.id || `dept-${Date.now()}`;
        const body: any = { id: deptId, name: orgForm.name.trim(), code: orgForm.code.trim() || '', parentId: orgForm.parentId || null, description: orgForm.description.trim() || '', sortOrder: orgForm.sortOrder || 99 };
        if (orgForm.id) {
          res = await fetch(`/api/departments?id=${deptId}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } else {
          res = await fetch('/api/departments', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
      } else {
        const teamDeptId = orgForm.teamDeptId || orgForm.parentId;
        if (!teamDeptId) { setOrgSaveMsg({ type: 'error', text: '请选择所属部门' }); setSaving(false); return; }
        res = await fetch('/api/teams', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: orgForm.name.trim(), departmentId: teamDeptId, description: orgForm.description.trim() }) });
      }
      const data = await res.json();
      if (!data.success) {
        setOrgSaveMsg({ type: 'error', text: data.error || '保存失败' });
        setSaving(false);
        return;
      }
      setOrgSaveMsg({ type: 'success', text: orgModalType === 'dept' ? '部门保存成功！' : '班组保存成功！' });
      setShowOrgModal(false);
      await fetchOrgTree();
      setTimeout(() => setOrgSaveMsg(null), 3000);
    } catch (e: any) {
      setOrgSaveMsg({ type: 'error', text: e.message || '网络错误' });
    }
    finally { setSaving(false); }
  };

  const handleDeleteDept = async (deptId: string, name: string) => {
    if (!confirm(`确定删除「${name}」及其所有子部门和班组吗？`)) return;
    try {
      const res = await fetch(`/api/departments?id=${deptId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        fetchOrgTree();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (e: any) { alert('网络错误：' + (e.message || '请稍后重试')); }
  };

  const handleDeleteTeam = async (teamId: string, name: string) => {
    if (!confirm(`确定删除班组「${name}」吗？`)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        fetchOrgTree();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (e: any) { alert('网络错误：' + (e.message || '请稍后重试')); }
  };

  if (!user && !initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-xl mb-4">&#9888;</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">加载失败</h2>
          <p className="text-sm text-gray-500 mb-4">{initError}</p>
          <button
            onClick={() => { setInitError(''); window.location.reload(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">系统管理后台</h1>
        <p className="text-sm text-gray-500 mt-1">用户管理 · 组织架构</p>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {([
          { key: 'users', label: '人员权限管理' },
          { key: 'org', label: '组织架构' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2 rounded-t-lg text-sm font-medium transition-colors
              ${activeTab === tab.key ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">共 {users.length} 个用户</span>
            <button onClick={openCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + 新增用户
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3">用户名</th>
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">部门</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">操作</th>
              </tr></thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'admin' ? '管理员' : u.role === 'reviewer' ? '审核员' : '检查员'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{u.inspection_department || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEditModal(u)} className="text-blue-600 hover:text-blue-800 text-xs mr-2">编辑</button>
                      {u.id !== user.id && (
                        <button onClick={() => handleDeleteUser(u)} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showUserModal && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowUserModal(false)}>
              <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-lg text-gray-800">{editingUser ? '编辑用户' : '新增用户'}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">用户名 <span className="text-red-500">*</span></label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="登录用户名"
                        value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="用户姓名"
                        value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">密码 {editingUser ? '' : <span className="text-red-500">*</span>}</label>
                      <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder={editingUser ? '留空表示不修改' : '登录密码'}
                        value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                        <option value="inspector">检查员</option>
                        <option value="reviewer">审核员</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排查中心</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="如：物资后勤中心"
                        value={userForm.inspection_center} onChange={e => setUserForm(f => ({ ...f, inspection_center: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排查部门</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="如：综合管理部"
                        value={userForm.inspection_department} onChange={e => setUserForm(f => ({ ...f, inspection_department: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">班组</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="班组名称"
                        value={userForm.inspection_team} onChange={e => setUserForm(f => ({ ...f, inspection_team: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">岗位</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="岗位名称"
                        value={userForm.inspection_position} onChange={e => setUserForm(f => ({ ...f, inspection_position: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={userForm.is_active} onChange={e => setUserForm(f => ({ ...f, is_active: e.target.checked }))} />
                    <label className="text-sm text-gray-700">启用（取消则禁用该用户）</label>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                  <button onClick={() => setShowUserModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm">取消</button>
                  <button onClick={handleSaveUser} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                    {editingUser ? '保存修改' : '创建用户'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'org' && (
        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowOrgModal(true); setOrgModalType('dept'); setOrgForm({ id: '', name: '', code: '', parentId: '', description: '', sortOrder: 99, teamDeptId: '' }); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                + 新增部门
              </button>
              <button
                onClick={() => { setShowOrgModal(true); setOrgModalType('team'); setOrgForm({ id: '', name: '', code: '', parentId: '', description: '', sortOrder: 99, teamDeptId: '' }); }}
                className="border border-blue-300 text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium">
                + 新增班组
              </button>
            </div>
            <div className="flex items-center gap-3">
              <a href="/api/departments?action=template" download
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                下载Excel模板
              </a>
              <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2 transition-colors ${importing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                {importing ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>导入中...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>一键导入Excel</>
                )}
                <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" disabled={importing} />
              </label>
            </div>
          </div>

          {importResult && (
            <div className={`mb-4 p-4 rounded-lg text-sm ${importResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {importResult.success ? (
                <div>
                  <p className="font-medium mb-1">导入成功！</p>
                  <p>新增/更新 {importResult.data.departments} 个部门，{importResult.data.teams} 个班组</p>
                  {importResult.data.errors?.length > 0 && (
                    <div className="mt-2 text-red-600">
                      <p className="font-medium">错误：</p>
                      {importResult.data.errors.map((e: string, i: number) => <p key={i} className="text-xs">• {e}</p>)}
                    </div>
                  )}
                </div>
              ) : (
                <p>{importResult.error || '导入失败'}</p>
              )}
              <button onClick={() => setImportResult(null)} className="mt-2 text-xs underline">关闭</button>
            </div>
          )}

          {orgSaveMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center justify-between ${orgSaveMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <span>{orgSaveMsg.type === 'success' ? '✅' : '❌'} {orgSaveMsg.text}</span>
              <button onClick={() => setOrgSaveMsg(null)} className="text-xs underline ml-4">关闭</button>
            </div>
          )}

          {orgLoading ? (
            <div className="py-16 text-center text-gray-400">加载中...</div>
          ) : (
            <div className="space-y-1">
              {orgTree.map((company: any) => (
                <OrgTreeNode key={company.id} node={company} depth={0}
                  onAddDept={(parentId) => { setShowOrgModal(true); setOrgModalType('dept'); setOrgForm({ id: '', name: '', code: '', parentId, description: '', sortOrder: 99, teamDeptId: '' }); }}
                  onAddTeam={(deptId) => { setShowOrgModal(true); setOrgModalType('team'); setOrgForm({ id: '', name: '', code: '', parentId: '', description: '', sortOrder: 99, teamDeptId: deptId }); }}
                  onDeleteDept={(id, name) => handleDeleteDept(id, name)}
                  onDeleteTeam={(id, name) => handleDeleteTeam(id, name)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showOrgModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowOrgModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg">{orgModalType === 'dept' ? (orgForm.id ? '编辑部门' : '新增部门') : '新增班组'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{orgModalType === 'dept' ? '部门名称' : '班组名称'} *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="请输入名称"
                  value={orgForm.name} onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              {orgModalType === 'dept' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">部门编码</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="如: WCC"
                      value={orgForm.code} onChange={e => setOrgForm(f => ({ ...f, code: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">上级部门</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={orgForm.parentId || ''} onChange={e => setOrgForm(f => ({ ...f, parentId: e.target.value }))}>
                      <option value="">无（顶级节点）</option>
                      {flattenOrgNodes(orgTree).map((d: any) => (
                        <option key={d.id} value={d.id}>{'─'.repeat(Math.max(0, getOrgDepth(orgTree, d.id)))} {d.name}{d.code ? ` [${d.code}]` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={orgForm.sortOrder} onChange={e => setOrgForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 99 }))} />
                  </div>
                </>
              )}
              {orgModalType === 'team' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所属部门 *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={orgForm.teamDeptId || ''} onChange={e => setOrgForm(f => ({ ...f, teamDeptId: e.target.value }))}>
                    <option value="">请选择所属部门</option>
                    {flattenOrgNodes(orgTree).filter((d: any) => (d.children?.length || 0) === 0).map((d: any) => (
                      <option key={d.id} value={d.id}>{'─'.repeat(Math.max(0, getOrgDepth(orgTree, d.id)))} {d.name}{d.code ? ` [${d.code}]` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="可选描述"
                  value={orgForm.description} onChange={e => setOrgForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowOrgModal(false)} disabled={saving} className="px-5 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50">取消</button>
              <button onClick={handleSaveOrg} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {saving && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>}
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function flattenOrgNodes(nodes: any[]): any[] {
  const result: any[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) result.push(...flattenOrgNodes(node.children));
  }
  return result;
}

function getOrgDepth(nodes: any[], targetId: string, depth = 0): number {
  for (const node of nodes) {
    if (node.id === targetId) return depth;
    if (node.children?.length) {
      const d = getOrgDepth(node.children, targetId, depth + 1);
      if (d >= 0) return d;
    }
  }
  return -1;
}

function OrgTreeNode({ node, depth, onAddDept, onAddTeam, onDeleteDept, onDeleteTeam }: {
  node: any; depth: number;
  onAddDept: (parentId: string) => void; onAddTeam: (deptId: string) => void;
  onDeleteDept: (id: string, name: string) => void; onDeleteTeam: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2 || (node.children?.length || 0) > 0 || (node.teams?.length || 0) > 0);
  const hasChildren = (node.children?.length || 0) > 0 || (node.teams?.length || 0) > 0;

  const childCount = (node.children?.length || 0) + (node.teams?.length || 0);
  useEffect(() => {
    if (childCount > 0) setExpanded(true);
  }, [childCount]);

  return (
    <div>
      <div className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 group ${depth === 0 ? 'bg-blue-50 border border-blue-100' : depth === 1 ? 'bg-gray-50' : ''}`}
        style={{ marginLeft: `${depth * 24}px` }}>
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : <span className="w-4"></span>}
        <span className="text-lg">
          {depth === 0 ? '🏢' : depth === 1 ? '🏭' : '📂'}
        </span>
        <span className={`font-medium ${depth === 0 ? 'text-gray-900' : 'text-gray-700'}`}>{node.name}</span>
        {node.code && <span className="text-xs text-gray-400 font-mono">[{node.code}]</span>}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => onAddDept(node.id)} className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-1" title="添加子部门">+部门</button>
          <button type="button" onClick={() => onAddTeam(node.id)} className="text-xs text-green-600 hover:text-green-800 hover:underline px-1" title="添加班组">+班组</button>
          {depth > 0 && (
            <button type="button" onClick={() => onDeleteDept(node.id, node.name)} className="text-xs text-red-400 hover:text-red-600 hover:underline px-1" title="删除">删除</button>
          )}
        </div>
      </div>

      {expanded && node.children?.map((child: any) => (
        <OrgTreeNode key={child.id} node={child} depth={depth + 1}
          onAddDept={onAddDept} onAddTeam={onAddTeam} onDeleteDept={onDeleteDept} onDeleteTeam={onDeleteTeam} />
      ))}

      {expanded && node.teams?.length > 0 && (
        <div style={{ marginLeft: `${(depth + 1) * 24}px` }}>
          {node.teams.map((team: any) => (
            <div key={team.id} className="flex items-center gap-2 py-1.5 px-3 rounded hover:bg-yellow-50 group">
              <span className="w-4"></span>
              <span className="text-base">👥</span>
              <span className="text-sm text-gray-600">{team.name}</span>
              <span className="text-xs text-yellow-500 ml-1">班组</span>
              <button type="button" onClick={() => onDeleteTeam(team.id, team.name)}
                className="ml-auto text-xs text-red-400 hover:text-red-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
