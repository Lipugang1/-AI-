import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const rows = await query('SELECT * FROM departments ORDER BY sort_order ASC') as any[];
  const departments = rows.map(r => ({ id: r.id, name: r.name, code: r.code, description: r.description, isActive: !!r.is_active, sortOrder: r.sort_order }));
  return NextResponse.json({ departments });
}
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const id = `dept-${Date.now()}`;
  const max = await query('SELECT MAX(sort_order) m FROM departments') as any[];
  await query('INSERT INTO departments (id,name,code,description,sort_order) VALUES (?,?,?,?,?)', [id, body.name, body.code||'', body.description||'', (max[0]?.m||0)+1]);
  const [r] = await query('SELECT * FROM departments WHERE id=?', [id]) as any[];
  return NextResponse.json({ department: { id: r.id, name: r.name, code: r.code, description: r.description, isActive: !!r.is_active, sortOrder: r.sort_order } });
}
