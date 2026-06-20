import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { toCamelCase } from '@/lib/case-converter';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const equipmentId = searchParams.get('equipmentId') || searchParams.get('equipment_id');

  let sql = 'SELECT * FROM inspection_records WHERE 1=1';
  const params: any[] = [];
  if (equipmentId) { sql += ' AND equipment_id=?'; params.push(equipmentId); }
  sql += ' ORDER BY inspection_time DESC LIMIT 50';

  const rows = await query(sql, params) as any[];
  return NextResponse.json({ records: toCamelCase(rows) });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const body = await request.json();
  if (!body.equipmentId) return NextResponse.json({ error: '缺少equipmentId' }, { status: 400 });

  const id = `ir-${Date.now()}`;
  const fields = ['id','equipment_id','status','inspection_time','inspector_name'];
  const inspectionTime = body.inspectionTime 
    ? new Date(body.inspectionTime).toISOString().replace('T', ' ').replace('Z', '')
    : new Date().toISOString().replace('T', ' ').replace('Z', '');
  const vals = [id, body.equipmentId, body.status||'normal', inspectionTime, body.inspectorName||user.name||''];
  
  // Add optional fields (map camelCase from frontend to snake_case)
  const optionalFieldsMap: Record<string, string> = {
    photoKey: 'photo_key',
    aiStatus: 'ai_status',
    aiResult: 'ai_result',
    remarks: 'remarks',
    hydrantFrontClear: 'hydrant_front_clear',
    hydrantBoxAppearance: 'hydrant_box_appearance',
    hydrantSignage: 'hydrant_signage',
    hydrantNoLeakage: 'hydrant_no_leakage',
    hydrantEquipmentComplete: 'hydrant_equipment_complete',
    hydrantHoseCondition: 'hydrant_hose_condition',
    hydrantValveCondition: 'hydrant_valve_condition',
    hydrantReelCondition: 'hydrant_reel_condition',
    hydrantNozzleCondition: 'hydrant_firection',
    hydrantNoDebris: 'hydrant_no_debris',
    extinguisherConfigCorrect: 'extinguisher_config_correct',
    extinguisherWithinExpiration: 'extinguisher_within_expiration',
    extinguisherCylinderNormal: 'extinguisher_cylinder_normal',
    extinguisherNozzleNormal: 'extinguisher_nozzle_normal',
    extinguisherPipelineNormal: 'extinguisher_pipeline_normal',
    extinguisherSealIntact: 'extinguisher_seal_intact',
    extinguisherPressureNormal: 'extinguisher_pressure_normal',
    extinguisherCo2WeightNormal: 'extinguisher_co2_weight_normal',
    sandNoCaking: 'sand_no_caking',
  };
  for (const [camel, snake] of Object.entries(optionalFieldsMap)) {
    if (body[camel] !== undefined) { fields.push(snake); vals.push(body[camel]); }
  }

  await query(`INSERT INTO inspection_records (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`, vals);
  const [r] = await query('SELECT * FROM inspection_records WHERE id=?', [id]) as any[];
  return NextResponse.json({ success: true, record: r });
}
