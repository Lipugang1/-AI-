import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const fields: string[] = [], vals: any[] = [];
  if (body.name !== undefined) { fields.push('name=?'); vals.push(body.name); }
  if (body.location !== undefined) { fields.push('location=?'); vals.push(body.location); }
  if (body.position !== undefined) { fields.push('position=?'); vals.push(body.position); }
  if (body.isLeader !== undefined) { fields.push('is_leader=?'); vals.push(body.isLeader?1:0); }
  if (fields.length > 0) { vals.push(id); await query(`UPDATE team_members SET ${fields.join(',')} WHERE id=?`, vals); }
  const [r] = await query('SELECT * FROM team_members WHERE id=?', [id]) as any[];
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ member: { id: r.id, teamId: r.team_id, name: r.name, location: r.location, position: r.position, isLeader: !!r.is_leader } });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query('DELETE FROM team_members WHERE id=?', [id]);
  return NextResponse.json({ success: true });
}
