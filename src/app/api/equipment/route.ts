import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { toCamelCase } from '@/lib/case-converter';

// GET - 获取器材列表（含最新巡查记录用于预警判断）
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const warehouse_id = searchParams.get('warehouse_id');
  const area_id = searchParams.get('area_id');

  let where = '1=1';
  const params: any[] = [];
  if (warehouse_id) { where += ' AND fe.warehouse_id=?'; params.push(warehouse_id); }
  if (area_id) { where += ' AND fe.area_id=?'; params.push(area_id); }

  // 连表查询最新巡查记录 + 区域名称，用于前端预警判断
  const sql = `
    SELECT fe.*, 
           lr.inspection_time AS last_inspection_time,
           lr.status AS last_inspection_status,
           a.name AS area_name
    FROM fire_equipment fe
    LEFT JOIN areas a ON fe.area_id = a.id
    LEFT JOIN (
      SELECT equipment_id, inspection_time, status,
             ROW_NUMBER() OVER (PARTITION BY equipment_id ORDER BY inspection_time DESC) as rn
      FROM inspection_records
    ) lr ON fe.id = lr.equipment_id AND lr.rn = 1
    WHERE ${where}
    ORDER BY fe.type, fe.code
  `;

  const rows = await query(sql, params) as any[];
  
  // 将查询结果转换为前端期望的格式（records 数组）
  const equipment = rows.map((row: any) => ({
    ...row,
    records: row.last_inspection_time ? [{
      inspectionTime: row.last_inspection_time,
      status: row.last_inspection_status || '良好',
    }] : [],
  }));

  return NextResponse.json({ equipment: toCamelCase(equipment) });
}

// POST - 创建器材
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const body = await request.json();
  
  // 兼容 camelCase 和 snake_case
  const warehouse_id = body.warehouseId || body.warehouse_id || body.warehouseID || null;
  const area_id = body.areaId || body.area_id || null;
  const type = body.type || '';
  const code = body.code || '';
  const responsible_person = body.responsiblePerson || body.responsible_person || '';

  if (!warehouse_id || !type || !code) {
    return NextResponse.json({ success: false, error: '缺少必填字段（warehouseId, type, code）' }, { status: 400 });
  }

  const id = `fe-${Date.now()}`;
  await query('INSERT INTO fire_equipment (id,warehouse_id,area_id,type,code,responsible_person) VALUES (?,?,?,?,?,?)',
    [id, warehouse_id, area_id, type, code, responsible_person]);
  const [r] = await query('SELECT * FROM fire_equipment WHERE id=?', [id]) as any[];
  return NextResponse.json({ success: true, equipment: r });
}
