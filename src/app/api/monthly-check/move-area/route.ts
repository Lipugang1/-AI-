import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { warehouseId, fromAreaId, toAreaId } = body;
  if (!fromAreaId || !toAreaId) return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  await query('UPDATE monthly_safety_checks SET area_id=? WHERE area_id=?', [toAreaId, fromAreaId]);
  return NextResponse.json({ success: true });
}
