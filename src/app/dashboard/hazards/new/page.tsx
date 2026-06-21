'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: string;
  name: string;
  username: string;
  role: string;
  inspection_center: string;
  inspection_department: string;
  inspection_team: string;
  inspection_position: string;
}

export default function NewHazardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const [aiResult, setAiResult] = useState('');
  const [aiLocation, setAiLocation] = useState('');
  const [aiLevel, setAiLevel] = useState('general_ii');

  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().slice(0, 10),
    line: '',
    inspection_center: '',
    inspection_department: '',
    inspection_team: '',
    inspection_position: '',
    inspection_location: '',
    hazard_category: '',
    hazard_level: 'general_ii',
    hazard_description: '',
    temporary_measures: '',
    governance_department: '',
    cooperating_department: '',
    governance_person: '',
    governance_deadline: '',
    governance_measure: '',
    status: 'draft'
  });

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          const u = data.user;
          setUserInfo(u);
          setForm(f => ({
            ...f,
            inspection_center: u.inspection_center || '',
            inspection_department: u.inspection_department || '',
            inspection_team: u.inspection_team || '',
            inspection_position: u.inspection_position || '',
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/image', { method: 'POST', body: formData, credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setImages(prev => [...prev, { name: data.data.fileName, url: data.data.url }]);
      } else {
        alert('上传失败：' + data.error);
      }
    } catch (e: any) {
      alert('上传失败：' + e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAIAnalyze = async () => {
    if (images.length === 0) { alert('请先上传隐患图片'); return; }
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image_url: window.location.origin + images[0].url })
      });
      const data = await res.json();
      if (data.success) {
        const r = data.data;
        setAiResult(r.hazard_description || r.raw_output || '');
        setAiLocation(r.location || '');
        setAiLevel(r.hazard_level || 'general_ii');
      } else {
        alert('AI识别失败：' + data.error);
      }
    } catch (e: any) {
      alert('AI识别失败：' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const confirmAIResult = () => {
    if (!aiResult) return;
    setForm(f => ({
      ...f,
      hazard_description: aiResult,
      inspection_location: aiLocation || f.inspection_location,
      hazard_level: aiLevel || f.hazard_level,
    }));
    alert('已将AI识别结果填入表单，请检查确认后提交。');
  };

  const cancelAIResult = () => {
    setAiResult('');
    setAiLocation('');
  };

  const handleAISuggestion = async () => {
    if (!form.hazard_description) { alert('请先填写隐患描述'); return; }
    setAiSuggestionLoading(true);
    try {
      const res = await fetch('/api/ai/governance-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hazard_description: form.hazard_description,
          hazard_level: form.hazard_level,
          hazard_category: form.hazard_category,
        })
      });
      const data = await res.json();
      if (data.success) {
        setForm(f => ({ ...f, governance_measure: data.data.suggestion }));
      } else {
        alert('AI建议失败：' + data.error);
      }
    } catch (e: any) {
      alert('AI建议失败：' + e.message);
    } finally {
      setAiSuggestionLoading(false);
    }
  };

  const handleSubmit = async (status: string) => {
    const requiredFields: { key: string; label: string }[] = [
      { key: 'inspection_date', label: '排查日期' },
      { key: 'inspection_location', label: '排查地点' },
      { key: 'hazard_description', label: '隐患描述' },
      { key: 'hazard_category', label: '隐患分类' },
      { key: 'temporary_measures', label: '临时管控措施' },
      { key: 'governance_department', label: '治理责任部门' },
      { key: 'governance_person', label: '治理责任人' },
      { key: 'governance_deadline', label: '治理时限' },
      { key: 'governance_measure', label: '治理措施' },
    ];
    const missing = requiredFields.filter(f => !(form as any)[f.key]?.toString().trim());
    if (missing.length > 0) {
      alert(`请填写以下必填项：${missing.map(m => m.label).join('、')}`);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, status, images: images.map(i => i.url) };
      const res = await fetch('/api/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(status === 'draft' ? '已保存草稿' : '已提交审核');
        router.push('/dashboard/hazards');
      } else {
        alert(data.error || '提交失败');
      }
    } catch (e: any) {
      alert(e.message || '提交失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">上报隐患</h1>
        <button onClick={() => router.push('/dashboard/hazards')}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-50 transition-colors">
          返回列表
        </button>
      </div>

      <div className="p-5 max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-5">

          <div className="w-full lg:w-[380px] lg:flex-shrink-0 space-y-4">

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">上传隐患图片</span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full aspect-[4/3] rounded-lg border-2 border-dashed ${images.length > 0 ? 'border-solid border-gray-300' : 'border-gray-300 hover:border-blue-400'} cursor-pointer overflow-hidden bg-gray-50 flex items-center justify-center relative`}
              >
                {images.length > 0 ? (
                  <>
                    <img src={images[0].url} alt="隐患图片" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(0); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs"
                    >
                      ×
                    </button>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">✓</span>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <p className="text-sm text-gray-400">点击上传图片</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-sm text-blue-500 hover:text-blue-700 text-center w-full"
              >
                添加更多图片
              </button>

              <button
                type="button"
                onClick={handleAIAnalyze}
                disabled={aiLoading || images.length === 0}
                className="mt-3 w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    分析中...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    智能分析图片
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">上传图片后点击分析，AI将识别隐患并生成描述</p>
            </div>

            {aiResult && (
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-700">AI识别结果复核</h3>
                    <p className="text-xs text-amber-600 mt-0.5">请核对AI识别结果，确认无误后点击"确认填入"，也可修改后再确认</p>
                  </div>
                </div>

                <span className="inline-block text-xs bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded mb-2">隐患情况</span>

                <textarea
                  value={aiResult}
                  onChange={e => setAiResult(e.target.value)}
                  rows={8}
                  className="w-full bg-white/80 border border-amber-200 rounded px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-400/30 mb-3"
                />

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-amber-700 font-medium mb-1">识别置信度</label>
                    <select value="editable" className="w-full text-sm border border-amber-300 rounded px-2 py-1.5 bg-white/80 focus:outline-none focus:ring-1 focus:ring-amber-400">
                      <option value="editable">可修改识别位置</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-amber-700 font-medium mb-1">隐患等级</label>
                    <select
                      value={aiLevel}
                      onChange={e => setAiLevel(e.target.value)}
                      className="w-full text-sm border border-amber-300 rounded px-2 py-1.5 bg-white/80 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="general_i">一般隐患I级</option>
                      <option value="general_ii">一般隐患II级</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={confirmAIResult}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded text-sm font-medium transition-colors">
                    确认填入
                  </button>
                  <button type="button" onClick={cancelAIResult}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded text-sm transition-colors">
                    取消
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="flex-1 min-w-0 space-y-4">

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">隐患信息</h2>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex text-sm">
                  <span className="text-gray-500 w-[72px] flex-shrink-0">排查中心</span>
                  <span className="text-gray-800 font-medium">{form.inspection_center || '-'}</span>
                </div>
                <div className="flex text-sm">
                  <span className="text-gray-500 w-[72px] flex-shrink-0">排查部门</span>
                  <span className="text-gray-800 font-medium">{form.inspection_department || '-'}</span>
                </div>
                <div className="flex text-sm">
                  <span className="text-gray-500 w-[72px] flex-shrink-0">排查班组</span>
                  <span className="text-gray-800 font-medium">{form.inspection_team || '-'}</span>
                </div>
                <div className="flex text-sm">
                  <span className="text-gray-500 w-[72px] flex-shrink-0">排查岗位</span>
                  <span className="text-gray-800 font-medium">{form.inspection_position || '-'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                  <FormItem label="排查日期" required labelWidth="72px">
                    <input type="date" className="form-input" value={form.inspection_date}
                      onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))} />
                  </FormItem>
                  <FormItem label="排查地点" required labelWidth="72px">
                    <input type="text" className="form-input" placeholder="如：安顺车辆段3号线物资库房"
                      value={form.inspection_location}
                      onChange={e => setForm(f => ({ ...f, inspection_location: e.target.value }))} />
                  </FormItem>
                </div>

                <FormItem label="所属线别" labelWidth="72px">
                  <select className="form-select" value={form.line}
                    onChange={e => setForm(f => ({ ...f, line: e.target.value }))}>
                    <option value="">请选择线别</option>
                    <option>1号线</option><option>2号线</option><option>3号线</option>
                    <option>4号线</option><option>6号线</option><option>8号线</option>
                    <option>蓝谷快线</option><option>西海岸快线</option>
                  </select>
                </FormItem>

                <FormItem label="隐患描述" required labelWidth="72px">
                  <textarea rows={3} className="form-input resize-y" placeholder="AI分析后将自动填充，或手动输入..."
                    value={form.hazard_description}
                    onChange={e => setForm(f => ({ ...f, hazard_description: e.target.value }))} />
                </FormItem>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                  <FormItem label="隐患分类" required labelWidth="72px">
                    <select className="form-select" value={form.hazard_category}
                      onChange={e => setForm(f => ({ ...f, hazard_category: e.target.value }))}>
                      <option value="">请选择隐患分类</option>
                      <option value="仓储管理">仓储管理</option>
                      <option value="设施监测养护">设施监测养护</option>
                      <option value="设备运行维修">设备运行维修</option>
                      <option value="行车组织">行车组织</option>
                      <option value="客运组织">客运组织</option>
                      <option value="运行环境">运行环境</option>
                      <option value="人员管理">人员管理</option>
                      <option value="施工管理">施工管理</option>
                    </select>
                  </FormItem>
                  <FormItem label="隐患等级" required labelWidth="72px">
                    <select className="form-select" value={form.hazard_level}
                      onChange={e => setForm(f => ({ ...f, hazard_level: e.target.value }))}>
                      <option value="general_i">一般隐患I级</option>
                      <option value="general_ii">一般隐患II级</option>
                    </select>
                  </FormItem>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">治理信息</h2>

              <div className="space-y-3">
                <FormItem label="临时管控措施" required labelWidth="84px">
                  <textarea rows={2} className="form-input resize-y" placeholder="请输入临时管控措施..."
                    value={form.temporary_measures}
                    onChange={e => setForm(f => ({ ...f, temporary_measures: e.target.value }))} />
                </FormItem>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                  <FormItem label="治理责任部门" required labelWidth="84px">
                    <input type="text" className="form-input" placeholder="如：物资后勤中心-物资仓配"
                      value={form.governance_department}
                      onChange={e => setForm(f => ({ ...f, governance_department: e.target.value }))} />
                  </FormItem>
                  <FormItem label="配合部门" labelWidth="84px">
                    <input type="text" className="form-input" placeholder="配合部门"
                      value={form.cooperating_department}
                      onChange={e => setForm(f => ({ ...f, cooperating_department: e.target.value }))} />
                  </FormItem>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                  <FormItem label="治理责任人" required labelWidth="84px">
                    <input type="text" className="form-input" placeholder="责任人姓名"
                      value={form.governance_person}
                      onChange={e => setForm(f => ({ ...f, governance_person: e.target.value }))} />
                  </FormItem>
                  <FormItem label="治理时限" required labelWidth="84px">
                    <div className="relative">
                      <input type="date" className="form-input pr-8"
                        value={form.governance_deadline}
                        onChange={e => setForm(f => ({ ...f, governance_deadline: e.target.value }))} />
                      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                  </FormItem>
                </div>

                <FormItem label="治理措施" required labelWidth="84px">
                  <div className="relative">
                    <textarea rows={3} className="form-input pr-20 resize-y" placeholder="请输入治理措施，或点击AI优化根据隐患描述自动生成..."
                      value={form.governance_measure}
                      onChange={e => setForm(f => ({ ...f, governance_measure: e.target.value }))} />
                    <button type="button" onClick={handleAISuggestion} disabled={aiSuggestionLoading || !form.hazard_description}
                      className="absolute bottom-2 right-2 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 disabled:opacity-50 whitespace-nowrap transition-colors">
                      AI优化
                    </button>
                  </div>
                </FormItem>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => handleSubmit('draft')} disabled={saving}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                {saving ? '保存中...' : '保存草稿'}
              </button>
              <button type="button" onClick={() => handleSubmit('submitted')} disabled={saving}
                className="flex-1 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? '提交中...' : '提交审核'}
              </button>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        .form-select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 28px 6px 10px;
          font-size: 14px;
          color: #374151;
          background: white;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 8px center;
          background-repeat: no-repeat;
          background-size: 16px;
          appearance: none;
          outline: none;
        }
        .form-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
        }
        .form-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 14px;
          color: #374151;
          outline: none;
        }
        .form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
        }
        .form-input::placeholder {
          color: #d1d5db;
        }
      `}</style>
    </div>
  );
}

function FormItem({ label, children, required, labelWidth }: { label: string; children: React.ReactNode; required?: boolean; labelWidth?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">
        {required && <span className="text-red-500 mr-0.5">*</span>}
        {label}
      </label>
      {children}
    </div>
  );
}
