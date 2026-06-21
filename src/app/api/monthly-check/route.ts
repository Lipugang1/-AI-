import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { toCamelCase } from '@/lib/case-converter';

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get('warehouseId') || searchParams.get('warehouse_id');
  let sql = 'SELECT * FROM monthly_safety_checks WHERE 1=1';
  const params: any[] = [];
  if (warehouseId) { sql += ' AND warehouse_id=?'; params.push(warehouseId); }
  sql += ' ORDER BY check_date DESC LIMIT 50';
  const rows = await query(sql, params) as any[];
  return NextResponse.json({ success: true, checks: toCamelCase(rows) });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const body = await request.json();
    if (!body.warehouseId) return NextResponse.json({ error: '缺少warehouseId' }, { status: 400 });

    const id = `msc-${Date.now()}`;
    const fields = ['id','warehouse_id','check_date','inspector_name','overall_conclusion'];
    const vals = [id, body.warehouseId, body.checkDate||new Date().toISOString(), body.inspectorName||user.name||'', body.overallConclusion||'pending'];

    const optionalFields = ['area_id','fire_hazard_rectification','evacuation_route','fire_truck_channel','fire_equipment_status','micro_fire_station_status','electrical_safety','key_personnel_knowledge','key_areas_management','hazardous_material_safety','fire_control_room_status','fire_patrol_status','fire_safety_signs','other_check_items','remarks','photo_key','photo_url','ai_result'];
    for (const f of optionalFields) {
      const camelKey = snakeToCamel(f);
      let val: any = undefined;
      if (body[f] !== undefined && body[f] !== '') {
        val = body[f];
      } else if (body[camelKey] !== undefined && body[camelKey] !== '') {
        val = body[camelKey];
      }
      if (val !== undefined) {
        fields.push(f);
        vals.push(val);
      }
    }

    await query(`INSERT INTO monthly_safety_checks (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`, vals);
    const [r] = await query('SELECT * FROM monthly_safety_checks WHERE id=?', [id]) as any[];
    return NextResponse.json({ success: true, check: toCamelCase(r) });
  } catch (error: any) {
    console.error('Monthly check POST error:', error);
    return NextResponse.json({ success: false, error: error.message || '提交失败' }, { status: 500 });
  }
}
