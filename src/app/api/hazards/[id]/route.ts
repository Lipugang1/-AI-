import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    // 获取隐患记录
    const [rows]: any = await pool.execute('SELECT * FROM hazards WHERE id = ?', [id]);
    if (rows.length === 0) return NextResponse.json({ success: false, error: '未找到' }, { status: 404 });

    const result: any = { success: true, data: rows[0] };

    // 如果需要变更历史
    if (includeHistory) {
      const [logRows]: any = await pool.execute(
        `SELECT ol.*, u.name as user_name 
         FROM operation_logs ol 
         LEFT JOIN users u ON ol.user_id = u.id 
         WHERE ol.module = ? 
           AND ol.details LIKE CONCAT('%', ?, '%')
         ORDER BY ol.created_at DESC`,
        ['hazards', id]
      );
      result.history = logRows.map((row: any) => ({
        id: row.id,
        action: row.action,
        userName: row.user_name || '未知用户',
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
        ipAddress: row.ip_address,
        createdAt: row.created_at,
      }));
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const conn = await pool.getConnection();
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const body = await request.json();
    const { id } = await params;

    // 1. 先查出旧记录用于对比
    const [oldRows]: any = await conn.execute('SELECT * FROM hazards WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      conn.release();
      return NextResponse.json({ success: false, error: '未找到' }, { status: 404 });
    }
    const oldRecord = oldRows[0];

    // 2. 构建更新
    const fields: string[] = [];
    const values: any[] = [];
    const changes: Record<string, { from: any; to: any }> = {};

    const updatableFields = [
      'inspection_date', 'inspection_location', 'line',
      'inspection_center', 'inspection_department', 'inspection_team', 'inspection_position',
      'hazard_description', 'hazard_category', 'hazard_level',
      'temporary_measures', 'governance_department', 'cooperating_department',
      'governance_person', 'governance_measure', 'governance_deadline',
      'governance_result', 'governance_details', 'reviewer_name', 'status',
      'images'
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        const newVal = field === 'images' && typeof body[field] === 'object'
          ? JSON.stringify(body[field])
          : body[field];
        const oldVal = field === 'images'
          ? (typeof oldRecord[field] === 'string' ? oldRecord[field] : JSON.stringify(oldRecord[field] || []))
          : String(oldRecord[field] ?? '');

        // 只记录真正变化了的字段
        if (String(newVal) !== oldVal) {
          fields.push(`${field} = ?`);
          values.push(newVal);
          changes[field] = { from: oldRecord[field] ?? null, to: body[field] };
        }
      }
    }

    if (fields.length === 0) {
      conn.release();
      return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
    }

    // 添加 updated_by 和 updated_at
    fields.push('updated_by = ?');
    values.push(user.id || user.name);

    values.push(id);
    await conn.execute(`UPDATE hazards SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

    // 3. 记录操作日志
    // 判断操作类型：是否涉及治理字段
    const governanceFields = ['governance_result', 'governance_details', 'reviewer_name',
      'governance_measure', 'governance_person', 'governance_department',
      'governance_deadline', 'cooperating_department', 'status'];

    const isGovernance = Object.keys(changes).some(f => governanceFields.includes(f));
    const action = isGovernance ? '隐患治理更新' : '隐患信息修改';

    // 格式化变更详情
    const changeList = Object.entries(changes).map(([field, diff]) => ({
      field,
      label: getFieldLabel(field),
      from: diff.from,
      to: diff.to,
    }));

    await conn.execute(
      `INSERT INTO operation_logs (id, user_id, action, module, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user.id,
        action,
        'hazards',
        JSON.stringify({
          hazard_id: id,
          changes: changeList,
          updated_by_name: user.name,
        }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      ]
    );

    conn.release();
    return NextResponse.json({ success: true, changes: Object.keys(changes).length });
  } catch (error: any) {
    conn.release();
    console.error('[Hazard PUT] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const conn = await pool.getConnection();
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const { id } = await params;

    // Record deletion log before deleting
    await conn.execute(
      `INSERT INTO operation_logs (id, user_id, action, module, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user.id,
        '隐患删除',
        'hazards',
        JSON.stringify({ hazard_id: id, deleted_by_name: user.name }),
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      ]
    );

    await conn.execute('DELETE FROM hazards WHERE id = ?', [id]);
    conn.release();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    conn.release();
    console.error('[Hazard DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    inspection_date: '排查日期',
    inspection_location: '排查地点',
    inspection_department: '部门',
    inspection_team: '班组',
    inspection_position: '岗位',
    inspector_name: '上报人',
    hazard_description: '隐患描述',
    hazard_category: '隐患分类',
    hazard_level: '隐患等级',
    temporary_measures: '临时措施',
    governance_department: '治理责任部门',
    cooperating_department: '配合部门',
    governance_person: '治理责任人',
    governance_measure: '治理措施',
    governance_deadline: '整改期限',
    governance_result: '治理结果',
    governance_details: '具体治理情况',
    reviewer_name: '复查人',
    status: '状态',
    images: '照片',
  };
  return labels[field] || field;
}
