import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { toCamelCase } from '@/lib/case-converter';

// GET - 获取器材列表
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const warehouse_id = searchParams.get('warehouse_id');
  const area_id = searchParams.get('area_id');

  let sql = 'SELECT * FROM fire_equipment WHERE 1=1';
  const params: any[] = [];
  if (warehouse_id) { sql += ' AND warehouse_id=?'; params.push(warehouse_id); }
  if (area_id) { sql += ' AND area_id=?'; params.push(area_id); }
  sql += ' ORDER BY type, code';

  const rows = await query(sql, params) as any[];
  return NextResponse.json({ equipment: toCamelCase(rows) });
}

// POST - 创建器材
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const body = await request.json();
  const { warehouse_id, area_id, type, code, responsible_person } = body;
  if (!warehouse_id || !type || !code) return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });

  const id = `fe-${Date.now()}`;
  await query('INSERT INTO fire_equipment (id,warehouse_id,area_id,type,code,responsible_person) VALUES (?,?,?,?,?,?)',
    [id, warehouse_id, area_id||null, type, code, responsible_person||'']);
  const [r] = await query('SELECT * FROM fire_equipment WHERE id=?', [id]) as any[];
  return NextResponse.json({ equipment: r });
}
