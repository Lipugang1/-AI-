import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const team_id = searchParams.get('team_id');

    const params: any[] = [];
    let whereClause = '';

    if (status) { whereClause += ' WHERE m.status = ?'; params.push(status); }
    if (team_id) { whereClause += whereClause ? ' AND m.team_id = ?' : ' WHERE m.team_id = ?'; params.push(team_id); }

    const sql = `
      SELECT m.*, t.name as team_name, d.name as department_name
      FROM meetings m
      LEFT JOIN teams t ON m.team_id = t.id
      LEFT JOIN departments d ON m.department_id = d.id
      ${whereClause}
      ORDER BY m.date DESC, m.created_at DESC
    `;

    const rows = await query(sql, params) as any[];
    return NextResponse.json({ success: true, data: rows.filter(Boolean) });
  } catch (error: any) {
    console.error('List meetings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const body = await request.json();
    const { date, team_id, training_topics } = body;

    if (!date || !team_id) {
      return NextResponse.json({ success: false, error: '日期和班组为必填项' }, { status: 400 });
    }

    const teams = await query(
      'SELECT id, department_id FROM teams WHERE id = ?',
      [team_id]
    ) as any[];

    if (!teams.length) {
      return NextResponse.json({ success: false, error: '班组不存在' }, { status: 404 });
    }

    const id = `meeting-${Date.now()}`;
    const department_id = teams[0].department_id;

    const conn = await getConnection();
    try {
      await conn.execute(
        'INSERT INTO meetings (id, team_id, department_id, date, status) VALUES (?, ?, ?, ?, ?)',
        [id, team_id, department_id, date, 'ongoing']
      );

      if (training_topics && Array.isArray(training_topics) && training_topics.length > 0) {
        await conn.execute(
          'INSERT INTO meeting_records (id, meeting_id, summary) VALUES (?, ?, ?)',
          [`record-${Date.now()}`, id, JSON.stringify({ topics: training_topics })]
        );
      }
    } finally {
      await conn.end();
    }

    return NextResponse.json({ success: true, data: { id, team_id, department_id, date, status: 'ongoing' } });
  } catch (error: any) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
