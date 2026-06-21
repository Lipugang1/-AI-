import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    let rows;
    if (teamId) {
      rows = await query('SELECT * FROM inspection_spots WHERE team_id = ? ORDER BY name', [teamId]) as any[];
    } else {
      rows = await query('SELECT * FROM inspection_spots ORDER BY name') as any[];
    }

    return NextResponse.json({ success: true, data: rows || [] });
  } catch (error: any) {
    console.error('Get inspection spots error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const body = await request.json();
    if (!body.teamId || !body.name) {
      return NextResponse.json({ error: '缺少必填字段（teamId, name）' }, { status: 400 });
    }

    const id = `spot-${Date.now()}`;
    
    await query(
      'INSERT INTO inspection_spots (id, team_id, name, description) VALUES (?, ?, ?, ?)',
      [id, body.teamId, body.name.trim(), body.description?.trim() || '']
    );

    await query(
      'INSERT INTO warehouses (id, team_id, name) VALUES (?, ?, ?)',
      [id, body.teamId, body.name.trim()]
    );

    const [row] = await query('SELECT * FROM inspection_spots WHERE id = ?', [id]) as any[];
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error('Create inspection spot error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    await query('DELETE FROM fire_equipment WHERE warehouse_id = ?', [id]);
    await query('DELETE FROM monthly_safety_checks WHERE warehouse_id = ?', [id]);
    await query('DELETE FROM areas WHERE warehouse_id = ?', [id]);
    await query('DELETE FROM warehouses WHERE id = ?', [id]);
    await query('DELETE FROM inspection_spots WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete inspection spot error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
