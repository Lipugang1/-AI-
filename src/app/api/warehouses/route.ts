import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const team_id = searchParams.get('teamId');
  let rows = team_id ? await query('SELECT * FROM warehouses WHERE team_id=? ORDER BY name', [team_id]) as any[] : await query('SELECT * FROM warehouses ORDER BY name') as any[];
  return NextResponse.json({ warehouses: rows });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const body = await request.json();
  if (!body.name || !body.teamId) return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  const id = `wh-${Date.now()}`;
  await query('INSERT INTO warehouses (id,team_id,name) VALUES (?,?,?)', [id, body.teamId, body.name]);
  const [r] = await query('SELECT * FROM warehouses WHERE id=?', [id]) as any[];
  return NextResponse.json({ success: true, warehouse: r });
}
