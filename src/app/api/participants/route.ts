import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meeting_id = searchParams.get('meeting_id');
    if (!meeting_id) return NextResponse.json({ error: '缺少会议ID' }, { status: 400 });

    const rows = await query('SELECT * FROM participants WHERE meeting_id = ? ORDER BY created_at ASC', [meeting_id]) as any[];
    return NextResponse.json({ participants: rows });
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    return NextResponse.json({ error: '获取参会人员失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_id, name, location, attendance_type } = body;
    if (!meeting_id || !name) return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });

    const id = `part-${Date.now()}`;
    await query(
      'INSERT INTO participants (id, meeting_id, member_id, name, location, attendance_status, attendance_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, meeting_id, null, name, location || null, 'pending', attendance_type || 'onsite']
    );

    const parts = await query('SELECT * FROM participants WHERE id = ?', [id]) as any[];
    return NextResponse.json({ participant: parts[0] });
  } catch (error: any) {
    console.error('Error adding participant:', error);
    return NextResponse.json({ error: '添加参会人员失败' }, { status: 500 });
  }
}
