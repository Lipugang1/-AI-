import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');

  let rows: any[];
  if (departmentId) {
    rows = await query(
      'SELECT t.*, d.name as department_name FROM teams t LEFT JOIN departments d ON t.department_id = d.id WHERE t.department_id = ? ORDER BY t.name',
      [departmentId]
    ) as any[];
  } else {
    rows = await query(
      'SELECT t.*, d.name as department_name FROM teams t LEFT JOIN departments d ON t.department_id = d.id ORDER BY d.name, t.name'
    ) as any[];
  }
  return NextResponse.json({ teams: rows });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const id = `team-${Date.now()}`;
    await query('INSERT INTO teams (id,name,department_id,description) VALUES (?,?,?,?)',
      [id, body.name, body.departmentId || null, body.description || '']);
    const [r] = await query('SELECT t.*, d.name as department_name FROM teams t LEFT JOIN departments d ON t.department_id = d.id WHERE t.id=?', [id]) as any[];
    return NextResponse.json({ success: true, team: r[0] || r });
  } catch (error: any) {
    console.error('POST /api/teams error:', error);
    return NextResponse.json({ success: false, error: error.message || '创建失败' }, { status: 500 });
  }
}
