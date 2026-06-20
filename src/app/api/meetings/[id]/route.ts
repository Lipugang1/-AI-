import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const { id } = await params;

    const meetings = await query(`
      SELECT m.*, t.name as team_name, d.name as department_name
      FROM meetings m
      LEFT JOIN teams t ON m.team_id = t.id
      LEFT JOIN departments d ON m.department_id = d.id
      WHERE m.id = ?
    `, [id]) as any[];

    if (!meetings.length) {
      return NextResponse.json({ success: false, error: '会议不存在' }, { status: 404 });
    }

    // 获取参会人员
    const participants = await query(`
      SELECT p.*, tm.position, tm.is_leader
      FROM participants p
      LEFT JOIN team_members tm ON p.member_id = tm.id
      WHERE p.meeting_id = ?
      ORDER BY tm.is_leader DESC, p.name ASC
    `, [id]) as any[];

    // 获取会议记录（培训内容等）
    const records = await query(
      'SELECT * FROM meeting_records WHERE meeting_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    ) as any[];

    // 解析培训主题
    let training_topics: string[] = [];
    if (records.length > 0 && records[0].summary) {
      try {
        const summary = typeof records[0].summary === 'string' ? JSON.parse(records[0].summary) : records[0].summary;
        training_topics = summary.topics || [];
      } catch { }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...meetings[0],
        participants,
        training_topics,
      }
    });
  } catch (error: any) {
    console.error('Get meeting error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, training_topics } = body;

    if (status) {
      await query('UPDATE meetings SET status = ? WHERE id = ?', [status, id]);
    }

    // 更新培训主题
    if (training_topics && Array.isArray(training_topics)) {
      const existing = await query('SELECT id FROM meeting_records WHERE meeting_id = ?', [id]) as any[];
      if (existing.length > 0) {
        await query(
          'UPDATE meeting_records SET summary = ? WHERE meeting_id = ?',
          [JSON.stringify({ topics: training_topics }), id]
        );
      } else {
        await query(
          'INSERT INTO meeting_records (id, meeting_id, summary) VALUES (?, ?, ?)',
          [`record-${Date.now()}`, id, JSON.stringify({ topics: training_topics })]
        );
      }
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Update meeting error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const { id } = await params;

    const conn = await getConnection();
    try {
      await conn.execute('DELETE FROM participants WHERE meeting_id = ?', [id]);
      await conn.execute('DELETE FROM meeting_records WHERE meeting_id = ?', [id]);
      await conn.execute('DELETE FROM meetings WHERE id = ?', [id]);
    } finally {
      await conn.end();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
