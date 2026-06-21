import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // 组织架构树
  if (action === 'tree') {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
    const depts = await query('SELECT * FROM departments WHERE is_active=1 ORDER BY sort_order') as any[];
    const teams = await query('SELECT * FROM teams ORDER BY name') as any[];
    const deptMap: Record<string, any> = {};
    const roots: any[] = [];
    depts.forEach(d => { deptMap[d.id] = { ...d, children: [], teams: [] }; });
    teams.forEach(t => { if (t.department_id && deptMap[t.department_id]) deptMap[t.department_id].teams.push(t); });
    depts.forEach(d => {
      const node = deptMap[d.id];
      if (d.parent_id && deptMap[d.parent_id]) deptMap[d.parent_id].children.push(node);
      else roots.push(node);
    });
    return NextResponse.json({ success: true, data: roots });
  }

  // Excel模板下载
  if (action === 'template') {
    const deptHeaders = ['部门ID', '部门名称', '部门编码', '上级编码', '说明', '排序'];
    const deptExample = [
      { '部门ID': 'dept-company', '部门名称': '青岛地铁运营有限公司', '部门编码': 'QDMR', '上级编码': '', '说明': '公司总部', '排序': 0 },
      { '部门ID': 'dept-001', '部门名称': '物资后勤中心', '部门编码': 'WLC', '上级编码': 'QDMR', '说明': '中心级别', '排序': 10 },
      { '部门ID': 'dept-003', '部门名称': '物资仓储部', '部门编码': 'WCC', '上级编码': 'WLC', '说明': '科室级别', '排序': 20 },
    ];
    const teamHeaders = ['班组名称', '所属部门编码', '描述'];
    const teamExample = [
      { '班组名称': '东部储运工班', '所属部门编码': 'WCC', '描述': '' },
      { '班组名称': '西部储运工班', '所属部门编码': 'WCC', '描述': '' },
    ];
    const wb = XLSX.utils.book_new();
    const deptWs = XLSX.utils.json_to_sheet(deptExample, { header: deptHeaders });
    deptWs['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, deptWs, 'Dept');
    const teamWs = XLSX.utils.json_to_sheet(teamExample, { header: teamHeaders });
    teamWs['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, teamWs, 'Team');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    return new NextResponse(wbout, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=template.xlsx',
      },
    });
  }

  // 默认：返回扁平列表
  const rows = await query('SELECT * FROM departments ORDER BY sort_order ASC') as any[];
  const departments = rows.map(r => ({ id: r.id, name: r.name, code: r.code, parentId: r.parent_id, description: r.description, isActive: !!r.is_active, sortOrder: r.sort_order }));
  return NextResponse.json({ departments });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });

  const contentType = request.headers.get('content-type') || '';

  // Excel导入
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) return NextResponse.json({ success: false, error: '请上传Excel文件' }, { status: 400 });
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const results = { departments: 0, teams: 0, errors: [] as string[] };

      if (workbook.SheetNames.includes('部门')) {
        const sheet = workbook.Sheets['部门'];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];
        for (const row of rows) {
          try {
            const id = row['部门ID'] || `dept-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const name = row['部门名称'];
            const code = row['部门编码'] || '';
            const parentCode = row['上级编码'] || null;
            if (!name) continue;
            let parentId = null;
            if (parentCode) {
              const [parent] = await query('SELECT id FROM departments WHERE code=?', [parentCode]) as any[];
              if (parent) parentId = parent.id;
            }
            const [existing] = await query('SELECT id FROM departments WHERE id=?', [id]) as any[];
            if (existing.length > 0) {
              await query('UPDATE departments SET name=?, code=?, parent_id=?, description=?, sort_order=? WHERE id=?',
                [name, code, parentId, row['说明'] || '', row['排序'] || 99, id]);
            } else {
              await query('INSERT INTO departments (id,name,code,parent_id,description,is_active,sort_order) VALUES (?,?,?,?,?,1,?)',
                [id, name, code, parentId, row['说明'] || '', row['排序'] || 99]);
            }
            results.departments++;
          } catch (e: any) { results.errors.push(`部门 ${row['部门名称']}: ${e.message}`); }
        }
      }

      if (workbook.SheetNames.includes('班组')) {
        const sheet = workbook.Sheets['班组'];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];
        for (const row of rows) {
          try {
            const name = row['班组名称'];
            const deptCode = row['所属部门编码'];
            if (!name || !deptCode) continue;
            const [dept] = await query('SELECT id FROM departments WHERE code=?', [deptCode]) as any[];
            if (!dept) { results.errors.push(`班组 ${name}: 部门编码 ${deptCode} 不存在`); continue; }
            const id = `team-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            await query('INSERT INTO teams (id,name,department_id) VALUES (?,?,?)', [id, name, dept.id]);
            results.teams++;
          } catch (e: any) { results.errors.push(`班组 ${row['班组名称']}: ${e.message}`); }
        }
      }
      return NextResponse.json({ success: true, data: results });
    } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }); }
  }

  // JSON新增部门
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const id = body.id || `dept-${Date.now()}`;
  await query('INSERT INTO departments (id,name,code,parent_id,description,sort_order) VALUES (?,?,?,?,?,?)',
    [id, body.name, body.code || null, body.parentId || null, body.description || '', body.sortOrder || 99]);
  const [r] = await query('SELECT * FROM departments WHERE id=?', [id]) as any[];
  return NextResponse.json({ success: true, department: r[0] || r });
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const body = await request.json();
  const fields: string[] = [];
  const values: any[] = [];
  if (body.name !== undefined) { fields.push('name=?'); values.push(body.name); }
  if (body.code !== undefined) { fields.push('code=?'); values.push(body.code || null); }
  if (body.parentId !== undefined) { fields.push('parent_id=?'); values.push(body.parentId); }
  if (body.description !== undefined) { fields.push('description=?'); values.push(body.description); }
  if (body.sortOrder !== undefined) { fields.push('sort_order=?'); values.push(body.sortOrder); }
  if (body.isActive !== undefined) { fields.push('is_active=?'); values.push(body.isActive ? 1 : 0); }
  if (fields.length === 0) return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  values.push(id);
  await query(`UPDATE departments SET ${fields.join(',')} WHERE id=?`, values);
  const [r] = await query('SELECT * FROM departments WHERE id=?', [id]) as any[];
  return NextResponse.json({ success: true, department: r[0] || r });
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await query('DELETE FROM teams WHERE department_id=?', [id]);
  await query('DELETE FROM departments WHERE parent_id=?', [id]);
  await query('DELETE FROM departments WHERE id=?', [id]);
  return NextResponse.json({ success: true });
}
