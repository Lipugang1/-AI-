import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await query('SELECT * FROM inspection_records WHERE id=?', [id]) as any[];
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ record: r });
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const fields: string[] = [], vals: any[] = [];
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && !['id','equipment_id'].includes(k)) { fields.push(`${k}=?`); vals.push(v); }
  }
  if (fields.length > 0) { vals.push(id); await query(`UPDATE inspection_records SET ${fields.join(',')} WHERE id=?`, vals); }
  const [r] = await query('SELECT * FROM inspection_records WHERE id=?', [id]) as any[];
  return NextResponse.json({ record: r });
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await query('DELETE FROM inspection_records WHERE id=?', [await params.then(p => p.id)]);
  return NextResponse.json({ success: true });
}
