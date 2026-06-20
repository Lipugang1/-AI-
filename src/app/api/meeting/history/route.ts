import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('team_id') || searchParams.get('teamId');
  const departmentId = searchParams.get('departmentId') || searchParams.get('department_id');

  let rows = await query(
    'SELECT m.*, t.name as team_name FROM meetings m LEFT JOIN teams t ON m.team_id=t.id ' +
    (teamId ? 'WHERE m.team_id=?' : departmentId ? 'WHERE m.department_id=?' : '') +
    ' ORDER BY m.created_at DESC',
    teamId ? [teamId] : departmentId ? [departmentId] : []
  ) as any[];

  const meetings = await Promise.all(rows.map(async m => {
    const participants = await query('SELECT * FROM participants WHERE meeting_id=?', [m.id]) as any[];
    const records = await query('SELECT * FROM meeting_records WHERE meeting_id=?', [m.id]) as any[];
    return { ...m, participants, meeting_records: records };
  }));

  return NextResponse.json({ meetings });
}
