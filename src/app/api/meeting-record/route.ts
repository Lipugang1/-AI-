import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get('meeting_id') || searchParams.get('meetingId');
  if (!meetingId) return NextResponse.json({ error: 'meeting_id required' }, { status: 400 });
  const records = await query('SELECT * FROM meeting_records WHERE meeting_id=? ORDER BY created_at DESC', [meetingId]) as any[];
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetingId, audioUrl, transcript, summary } = body;
  if (!meetingId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 });
  const id = `record-${Date.now()}`;
  await query('INSERT INTO meeting_records (id,meeting_id,audio_url,transcript,summary) VALUES (?,?,?,?,?)',
    [id, meetingId, audioUrl||'', transcript||'', summary ? (typeof summary === 'string' ? summary : JSON.stringify(summary)) : '']);
  const [r] = await query('SELECT * FROM meeting_records WHERE id=?', [id]) as any[];
  return NextResponse.json({ record: r });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, meetingId, audioUrl, transcript, summary } = body;
  const recordId = id || body.id;
  if (!recordId) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const fields: string[] = [], vals: any[] = [];
  if (audioUrl !== undefined) { fields.push('audio_url=?'); vals.push(audioUrl); }
  if (transcript !== undefined) { fields.push('transcript=?'); vals.push(transcript); }
  if (summary !== undefined) { fields.push('summary=?'); vals.push(typeof summary === 'string' ? summary : JSON.stringify(summary)); }
  if (fields.length > 0) { vals.push(recordId); await query(`UPDATE meeting_records SET ${fields.join(',')} WHERE id=?`, vals); }
  const [r] = await query('SELECT * FROM meeting_records WHERE id=?', [recordId]) as any[];
  return NextResponse.json({ record: r, records: r ? [r] : [] });
}
