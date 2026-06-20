import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await query('SELECT * FROM areas WHERE id=?', [id]) as any[];
  return NextResponse.json({ area: r || null });
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  if (body.name) await query('UPDATE areas SET name=? WHERE id=?', [body.name, id]);
  const [r] = await query('SELECT * FROM areas WHERE id=?', [id]) as any[];
  return NextResponse.json({ area: r });
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await query('DELETE FROM areas WHERE id=?', [await params.then(p => p.id)]);
  return NextResponse.json({ success: true });
}
