import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const fields: string[] = [];
    const values: any[] = [];
    if (body.attendance_status !== undefined) { fields.push('attendance_status = ?'); values.push(body.attendance_status); }
    if (body.signature_url !== undefined) { fields.push('signature_url = ?'); values.push(body.signature_url); fields.push('signed_at = NOW()'); }
    if (body.leave_reason !== undefined) { fields.push('leave_reason = ?'); values.push(body.leave_reason); }

    if (fields.length > 0) {
      values.push(id);
      await query(`UPDATE participants SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const parts = await query('SELECT * FROM participants WHERE id = ?', [id]) as any[];
    return NextResponse.json({ participant: parts[0] });
  } catch (error: any) {
    console.error('Error updating participant:', error);
    return NextResponse.json({ error: '更新参会人员失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM participants WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting participant:', error);
    return NextResponse.json({ error: '删除参会人员失败' }, { status: 500 });
  }
}
