import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conn = await (await import('@/lib/db')).getConnection();
  try { await Promise.all([
    conn.execute('DELETE FROM inspection_records WHERE equipment_id IN (SELECT id FROM fire_equipment WHERE warehouse_id=?)', [id]),
    conn.execute('DELETE FROM monthly_safety_checks WHERE warehouse_id=?', [id]),
    conn.execute('DELETE FROM areas WHERE warehouse_id=?', [id]),
    conn.execute('DELETE FROM fire_equipment WHERE warehouse_id=?', [id]),
    conn.execute('DELETE FROM warehouses WHERE id=?', [id]),
  ]); } finally { await conn.end(); }
  return NextResponse.json({ success: true });
}
