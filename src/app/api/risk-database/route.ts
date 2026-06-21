import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  let conn: any = null;
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    conn = await getConnection();
    const [rows]: any = await conn.execute('SELECT * FROM risk_items ORDER BY created_at DESC');
    await conn.end();
    conn = null;

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    if (conn) await conn.end().catch(() => {});
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let conn: any = null;
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: '无权操作' }, { status: 403 });

    const body = await request.json();
    conn = await getConnection();
    const id = `risk-${Date.now()}`;

    await conn.execute(`
      INSERT INTO risk_items (
        id, serial_number, business_module, specific_location, risk_point_description,
        risk_level, hazard_inspection_cycle, control_responsibility_unit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, body.serial_number || '', body.business_module || '',
      body.specific_location || '', body.risk_point_description || '',
      body.risk_level || 'general', body.hazard_inspection_cycle || '',
      body.control_responsibility_unit || ''
    ]);

    await conn.end();
    conn = null;
    return NextResponse.json({ success: true, data: { id, ...body } });
  } catch (error: any) {
    if (conn) await conn.end().catch(() => {});
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
