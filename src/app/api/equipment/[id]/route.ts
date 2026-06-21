import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await query('SELECT * FROM fire_equipment WHERE id=?', [id]) as any[];
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ equipment: r });
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const fields: string[] = [], vals: any[] = [];
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && k !== 'id') { fields.push(`${k}=?`); vals.push(v); }
  }
  if (fields.length > 0) { vals.push(id); await query(`UPDATE fire_equipment SET ${fields.join(',')} WHERE id=?`, vals); }
  const [r] = await query('SELECT * FROM fire_equipment WHERE id=?', [id]) as any[];
  return NextResponse.json({ equipment: r });
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query('DELETE FROM fire_equipment WHERE id=?', [id]);
  return NextResponse.json({ success: true });
}
