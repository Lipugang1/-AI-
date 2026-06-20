import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('team_id');
  const tid = teamId || searchParams.get('teamId');
  let rows;
  if (tid) rows = await query('SELECT * FROM team_members WHERE team_id=? ORDER BY is_leader DESC, created_at ASC', [tid]) as any[];
  else rows = await query('SELECT * FROM team_members ORDER BY created_at ASC') as any[];
  const members = rows.map(r => ({ id: r.id, teamId: r.team_id, name: r.name, location: r.location, position: r.position, isLeader: !!r.is_leader, team_id: r.team_id, is_leader: r.is_leader }));
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const teamId = body.teamId || body.team_id;
  if (!teamId || !body.name) return NextResponse.json({ error: 'teamId and name required' }, { status: 400 });
  const id = `tm-${Date.now()}`;
  await query('INSERT INTO team_members (id,team_id,name,location,position,is_leader) VALUES (?,?,?,?,?,?)',
    [id, teamId, body.name, body.location||null, body.position||null, body.isLeader?1:0]);
  const [r] = await query('SELECT * FROM team_members WHERE id=?', [id]) as any[];
  return NextResponse.json({ member: { id: r.id, teamId: r.team_id, name: r.name, location: r.location, position: r.position, isLeader: !!r.is_leader } });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { teamId, members } = body;
  if (!teamId || !members?.length) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  for (const m of members) {
    const id = `tm-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    await query('INSERT INTO team_members (id,team_id,name,location,position,is_leader) VALUES (?,?,?,?,?,?)',
      [id, teamId, m.name, m.location||null, m.position||null, m.isLeader?1:0]);
  }
  const rows = await query('SELECT * FROM team_members WHERE team_id=?', [teamId]) as any[];
  return NextResponse.json({ members: rows.map(r => ({ id: r.id, teamId: r.team_id, name: r.name, location: r.location, position: r.position, isLeader: !!r.is_leader })) });
}
