import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

function toSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export async function GET(request: NextRequest) {
  let conn: any = null;
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    conn = await getConnection();
    if (id) {
      const [rows]: any = await conn.execute('SELECT * FROM hazards WHERE id = ?', [id]);
      await conn.end();
      conn = null;
      if (rows.length === 0) return NextResponse.json({ success: false, error: '未找到' }, { status: 404 });
      return NextResponse.json({ success: true, data: rows[0] });
    }

    // 列表查询
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    let where = '1=1';
    const params: any[] = [];

    // 部门数据权限：非管理员只能看自己部门的数据
    if (!isAdmin(user) && user.department_id) {
      const [deptRows]: any = await conn.execute('SELECT name FROM departments WHERE id = ?', [user.department_id]);
      if (deptRows.length > 0) {
        where += ' AND inspection_department = ?';
        params.push(deptRows[0].name);
      }
    }

    const dept = searchParams.get('inspectionDepartment');
    if (dept && dept !== 'all' && isAdmin(user)) { where += ' AND inspection_department = ?'; params.push(dept); }

    const team = searchParams.get('inspectionTeam');
    if (team && team !== 'all') { where += ' AND inspection_team = ?'; params.push(team); }

    const person = searchParams.get('inspectorName');
    if (person && person !== 'all') { where += ' AND (inspector_name = ? OR inspector = ?)'; params.push(person, person); }

    const startDate = searchParams.get('startDate');
    if (startDate) { where += ' AND inspection_date >= ?'; params.push(startDate); }

    const endDate = searchParams.get('endDate');
    if (endDate) { where += ' AND inspection_date <= ?'; params.push(endDate); }

    const status = searchParams.get('status');
    if (status) { where += ' AND status = ?'; params.push(status); }

    const level = searchParams.get('hazardLevel');
    if (level) { where += ' AND hazard_level = ?'; params.push(level); }

    const keyword = searchParams.get('keyword');
    if (keyword) { where += ' AND (inspection_location LIKE ? OR hazard_description LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }

    const [countRows]: any = await conn.execute(`SELECT COUNT(*) as total FROM hazards WHERE ${where}`, params);
    const total = countRows[0].total;

    const [rows]: any = await conn.execute(
      `SELECT * FROM hazards WHERE ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      params
    );

    await conn.end();
    conn = null;
    return NextResponse.json({
      success: true,
      data: {
        items: rows,
        page, pageSize, total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error: any) {
    if (conn) await conn.end().catch(() => {});
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let conn: any = null;
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });

    const body = await request.json();
    const getVal = (key: string, defaultVal: any = undefined): any => {
      if (body[key] !== undefined) return body[key];
      if (body[toSnake(key)] !== undefined) return body[toSnake(key)];
      return defaultVal;
    };
    conn = await getConnection();
    const id = `hazard-${Date.now()}`;

    await conn.execute(`
      INSERT INTO hazards (
        id, inspection_date, inspection_location, line,
        inspection_center, inspection_department, inspection_team, inspection_position,
        inspector, inspector_name, inspector_id,
        hazard_description, hazard_category, hazard_level,
        temporary_measures, governance_department, cooperating_department,
        governance_person, governance_measure, governance_deadline,
        status, images, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      getVal('inspectionDate', ''), getVal('inspectionLocation', ''), getVal('line', ''),
      user.inspection_center || '', user.inspection_department || '', user.inspection_team || '', user.inspection_position || '',
      user.name, user.name, user.id,
      getVal('hazardDescription', ''), getVal('hazardCategory', ''), getVal('hazardLevel', 'general_i'),
      getVal('temporaryMeasures', ''), getVal('governanceDepartment', ''), getVal('cooperatingDepartment', ''),
      getVal('governancePerson', ''), getVal('governanceMeasure', ''), getVal('governanceDeadline', ''),
      getVal('status', 'draft'), getVal('images') ? JSON.stringify(getVal('images')) : null, user.id
    ]);

    await conn.end();
    conn = null;
    return NextResponse.json({ success: true, data: { id, ...body } });
  } catch (error: any) {
    if (conn) await conn.end().catch(() => {});
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
