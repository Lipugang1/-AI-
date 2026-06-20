'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [initError, setInitError] = useState('');
  const [activeTab, setActiveTab] = useState<'review' | 'users'>('review');
  const [pendingHazards, setPendingHazards] = useState<any[]>([]);
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
          // 兼容 data 和 user 两种字段名
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
    if (activeTab === 'review') fetchPending();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, user]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hazards?status=draft', { credentials: 'include' });
      const data = await res.json();
      setPendingHazards(data.success ? data.data.items || [] : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

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
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser ? { ...userForm } : { ...userForm };
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

  // 初始化中
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

  // 初始化失败
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
        <p className="text-sm text-gray-500 mt-1">隐患审核 · 用户管理 · 系统配置</p>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-1 mb-4">
        {(['review', 'users'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors
              ${activeTab === tab ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
            {tab === 'review' ? '待审核隐患' : '人员权限管理'}
          </button>
        ))}
      </div>

      {/* 待审核 */}
      {activeTab === 'review' && (
        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">加载中...</div>
          ) : pendingHazards.length === 0 ? (
            <div className="py-16 text-center text-gray-400">暂无待审核隐患</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3">排查地点</th>
                  <th className="px-4 py-3">隐患描述</th>
                  <th className="px-4 py-3">等级</th>
                  <th className="px-4 py-3">上报人</th>
                  <th className="px-4 py-3">操作</th>
                </tr></thead>
                <tbody>
                  {pendingHazards.map((h: any) => (
                    <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">{h.inspection_location || '-'}</td>
                      <td className="px-4 py-3 max-w-[300px] truncate">{h.hazard_description || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.hazard_level === 'general_i' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {h.hazard_level === 'general_i' ? '一般I级' : '一般II级'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{h.inspector_name || '-'}</td>
                      <td className="px-4 py-3">
                        <button onClick={async () => {
                          if (!confirm('确定通过审核？')) return;
                          await fetch(`/api/hazards/${h.id}`, {
                            method: 'PUT', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'approved' })
                          });
                          fetchPending();
                        }} className="text-green-600 hover:text-green-800 text-xs mr-2">通过</button>
                        <button onClick={async () => {
                          const reason = prompt('请输入驳回原因：');
                          if (!reason) return;
                          await fetch(`/api/hazards/${h.id}`, {
                            method: 'PUT', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'rejected', review_comment: reason })
                          });
                          fetchPending();
                        }} className="text-red-600 hover:text-red-800 text-xs">驳回</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 用户管理 */}
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

          {/* 用户编辑/新增弹窗 */}
          {showUserModal && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowUserModal(false)}>
              <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-lg text-gray-800">{editingUser ? '编辑用户' : '新增用户'}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
