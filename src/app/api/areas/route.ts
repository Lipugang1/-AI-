import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get('warehouseId');
  let rows = warehouseId ? await query('SELECT * FROM areas WHERE warehouse_id=? ORDER BY name', [warehouseId]) as any[] : await query('SELECT * FROM areas ORDER BY name') as any[];
  return NextResponse.json({ areas: rows });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const body = await request.json();
  if (!body.warehouseId || !body.name) return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  const id = `area-${Date.now()}`;
  await query('INSERT INTO areas (id,warehouse_id,name) VALUES (?,?,?)', [id, body.warehouseId, body.name]);
  const [r] = await query('SELECT * FROM areas WHERE id=?', [id]) as any[];
  return NextResponse.json({ area: r });
}
