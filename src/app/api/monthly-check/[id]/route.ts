import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { toCamelCase } from '@/lib/case-converter';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await query('SELECT * FROM monthly_safety_checks WHERE id=?', [id]) as any[];
  return NextResponse.json({ success: true, check: r ? toCamelCase(r) : null });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const fields: string[] = [], vals: any[] = [];
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && k !== 'id') { fields.push(`${k}=?`); vals.push(v); }
  }
  if (fields.length > 0) { vals.push(id); await query(`UPDATE monthly_safety_checks SET ${fields.join(',')} WHERE id=?`, vals); }
  const [r] = await query('SELECT * FROM monthly_safety_checks WHERE id=?', [id]) as any[];
  return NextResponse.json({ success: true, check: r ? toCamelCase(r) : null });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query('DELETE FROM monthly_safety_checks WHERE id=?', [id]);
  return NextResponse.json({ success: true });
}
