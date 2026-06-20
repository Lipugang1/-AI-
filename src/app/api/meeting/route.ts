import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('team_id') || searchParams.get('teamId');
  const departmentId = searchParams.get('departmentId') || searchParams.get('department_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // 优先获取进行中的
  let rows = await query(
    'SELECT m.*, t.name as team_name FROM meetings m LEFT JOIN teams t ON m.team_id=t.id WHERE m.date=? AND m.status=? ' +
    (teamId ? 'AND m.team_id=?' : (departmentId ? 'AND m.department_id=?' : '')),
    [date, 'ongoing', ...(teamId ? [teamId] : departmentId ? [departmentId] : [])]
  ) as any[];
  if (rows.length) return NextResponse.json({ meeting: rows[0] });

  // 最近一条
  rows = await query(
    'SELECT m.*, t.name as team_name FROM meetings m LEFT JOIN teams t ON m.team_id=t.id WHERE m.date=? ' +
    (teamId ? 'AND m.team_id=?' : (departmentId ? 'AND m.department_id=?' : '')) + ' ORDER BY m.created_at DESC LIMIT 1',
    [date, ...(teamId ? [teamId] : departmentId ? [departmentId] : [])]
  ) as any[];
  return NextResponse.json({ meeting: rows[0] || null });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const teamId = body.teamId || body.team_id;
  const departmentId = body.departmentId || body.department_id;
  if (!departmentId) return NextResponse.json({ error: 'departmentId required' }, { status: 400 });
  const date = body.date || new Date().toISOString().split('T')[0];

  // 检查进行中的
  let existing = await query('SELECT * FROM meetings WHERE date=? AND department_id=? AND status=?', [date, departmentId, 'ongoing']) as any[];
  if (teamId) existing = existing.filter(m => m.team_id === teamId);
  if (existing.length > 0) return NextResponse.json({ error: '会议进行中', meeting: existing[0] }, { status: 400 });

  const id = `meeting-${Date.now()}`;
  await query('INSERT INTO meetings (id,team_id,department_id,date,status) VALUES (?,?,?,?,?)',
    [id, teamId||null, departmentId, date, 'ongoing']);

  // 自动添加班组成员到参会
  if (teamId) {
    const selectedMemberIds = body.selectedMemberIds || body.selected_member_ids;
    let members;
    if (selectedMemberIds?.length)
      members = await query(`SELECT * FROM team_members WHERE team_id=? AND id IN (${selectedMemberIds.map(()=>'?').join(',')})`, [teamId, ...selectedMemberIds]) as any[];
    else
      members = await query('SELECT * FROM team_members WHERE team_id=?', [teamId]) as any[];

    const conn = await getConnection();
    try {
      for (const m of members) {
        const pid = `part-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        await conn.execute('INSERT INTO participants (id,meeting_id,member_id,name,location,attendance_status,attendance_type) VALUES (?,?,?,?,?,?,?)',
          [pid, id, m.id, m.name, m.location, 'pending', 'onsite']);
      }
    } finally { await conn.end(); }
  }

  const [r] = await query('SELECT m.*, t.name as team_name FROM meetings m LEFT JOIN teams t ON m.team_id=t.id WHERE m.id=?', [id]) as any[];
  return NextResponse.json({ meeting: r });
}
