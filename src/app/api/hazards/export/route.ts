import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'reviewer')) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { startDate, endDate, inspectionCenter, inspectionDepartment, hazardLevel, status } = body;

    let hazards: any[] = await query('SELECT * FROM hazards ORDER BY created_at DESC') as any[];

    // 应用筛选条件
    if (startDate) hazards = hazards.filter((h: any) => h.inspection_date >= startDate);
    if (endDate) hazards = hazards.filter((h: any) => h.inspection_date <= endDate);
    if (inspectionCenter) hazards = hazards.filter((h: any) => h.inspection_center === inspectionCenter);
    if (inspectionDepartment) hazards = hazards.filter((h: any) => h.inspection_department === inspectionDepartment);
    if (hazardLevel) hazards = hazards.filter((h: any) => h.hazard_level === hazardLevel);
    if (status) hazards = hazards.filter((h: any) => h.status === status);

    const exportData = hazards.map((r: any, i: number) => ({
      '序号': i + 1,
      '排查中心': r.inspection_center || '',
      '排查部门': r.inspection_department || '',
      '排查班组': r.inspection_team || '',
      '排查岗位': r.inspection_position || '',
      '排查人工号': r.inspector_id || '',
      '排查人员': r.inspector_name || '',
      '排查日期': r.inspection_date || '',
      '排查地点': r.inspection_location || '',
      '所属线别': r.line || '',
      '隐患描述': r.hazard_description || '',
      '治理责任部门': r.governance_department || '',
      '配合部门': r.cooperating_department || '',
      '治理责任人': r.governance_person || '',
      '隐患分类': r.hazard_category || '',
      '隐患等级': r.hazard_level === 'general_i' ? '一般隐患I级' : '一般隐患II级',
      '临时管控措施': r.temporary_measures || '',
      '治理措施': r.governance_measure || '',
      '治理时限': r.governance_deadline || '',
      '治理结果': r.governance_result || '',
      '具体治理情况': r.governance_details || '',
      '复查人': r.reviewer_name || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 10 },
      { wch: 50 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 20 },
      { wch: 15 }, { wch: 40 }, { wch: 50 }, { wch: 12 }, { wch: 30 }, { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, '隐患排查治理记录');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `隐患排查治理记录_${new Date().toISOString().split('T')[0]}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: '导出失败' }, { status: 500 });
  }
}

async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'sanheyi_super_secret_key_2024_!@#$%^&*()');
    const conn = await (await import('@/lib/db')).getConnection();
    const [rows]: any = await conn.execute(
      'SELECT id, username, name, role FROM users WHERE id = ? AND is_active = 1',
      [payload.id]
    );
    await conn.end();
    return rows[0] || null;
  } catch {
    return null;
  }
}
