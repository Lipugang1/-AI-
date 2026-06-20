import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m] = await query('SELECT m.*, t.name as team_name FROM meetings m LEFT JOIN teams t ON m.team_id=t.id WHERE m.id=?', [id]) as any[];
  if (!m) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const participants = await query('SELECT * FROM participants WHERE meeting_id=? ORDER BY created_at ASC', [id]) as any[];
  const records = await query('SELECT * FROM meeting_records WHERE meeting_id=? ORDER BY created_at DESC', [id]) as any[];
  return NextResponse.json({ meeting: m, participants, records });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const fields: string[] = ['updated_at=NOW()'], vals: any[] = [];
  if (body.status !== undefined) { fields.push('status=?'); vals.push(body.status); }
  if (body.date !== undefined) { fields.push('date=?'); vals.push(body.date); }
  if (fields.length > 1) { vals.push(id); await query(`UPDATE meetings SET ${fields.join(',')} WHERE id=?`, vals); }
  const [r] = await query('SELECT * FROM meetings WHERE id=?', [id]) as any[];
  return NextResponse.json({ meeting: r });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conn = await getConnection();
  try {
    await conn.execute('DELETE FROM meeting_records WHERE meeting_id=?', [id]);
    await conn.execute('DELETE FROM participants WHERE meeting_id=?', [id]);
    await conn.execute('DELETE FROM meetings WHERE id=?', [id]);
  } finally { await conn.end(); }
  return NextResponse.json({ success: true });
}
