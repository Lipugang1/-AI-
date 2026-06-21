import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.name) {
      await query('UPDATE warehouses SET name = ? WHERE id = ?', [body.name, id]);
      await query('UPDATE inspection_spots SET name = ? WHERE id = ?', [body.name, id]).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const protectedIds = ['wh-1', 'wh-2', 'wh-3'];
    if (protectedIds.includes(id)) {
      return NextResponse.json({ success: false, error: '默认库区不可删除' }, { status: 403 });
    }
    const conn = await getConnection();
    try { await Promise.all([
      conn.execute('DELETE FROM inspection_records WHERE equipment_id IN (SELECT id FROM fire_equipment WHERE warehouse_id=?)', [id]),
      conn.execute('DELETE FROM monthly_safety_checks WHERE warehouse_id=?', [id]),
      conn.execute('DELETE FROM areas WHERE warehouse_id=?', [id]),
      conn.execute('DELETE FROM fire_equipment WHERE warehouse_id=?', [id]),
      conn.execute('DELETE FROM warehouses WHERE id=?', [id]),
      conn.execute('DELETE FROM inspection_spots WHERE id=?', [id]),
    ]); } finally { await conn.end(); }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
