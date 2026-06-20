import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function GET(request: NextRequest) {
  const rows = await query('SELECT * FROM teams ORDER BY name') as any[];
  return NextResponse.json({ teams: rows });
}
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const id = `team-${Date.now()}`;
  await query('INSERT INTO teams (id,name) VALUES (?,?)', [id, body.name]);
  const [r] = await query('SELECT * FROM teams WHERE id=?', [id]) as any[];
  return NextResponse.json({ team: r });
}
