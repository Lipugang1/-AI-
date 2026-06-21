import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  let conn: any = null;
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    conn = await getConnection();

    let whereDeptClause = '';
    const deptParam: any[] = [];
    if (user.role !== 'admin' && user.inspection_department) {
      whereDeptClause = 'WHERE inspection_department = ?';
      deptParam.push(user.inspection_department);
    }

    const [totalRows]: any = await conn.execute(
      `SELECT COUNT(*) as total FROM hazards ${whereDeptClause}`,
      [...deptParam]
    );

    const [pendingRows]: any = await conn.execute(
      `SELECT COUNT(*) as count FROM hazards ${whereDeptClause ? whereDeptClause + ' AND' : 'WHERE'} status = 'submitted'`,
      [...deptParam]
    );

    const [approvedRows]: any = await conn.execute(
      `SELECT COUNT(*) as count FROM hazards ${whereDeptClause ? whereDeptClause + ' AND' : 'WHERE'} status = 'approved'`,
      [...deptParam]
    );

    const [rejectedRows]: any = await conn.execute(
      `SELECT COUNT(*) as count FROM hazards ${whereDeptClause ? whereDeptClause + ' AND' : 'WHERE'} status = 'rejected'`,
      [...deptParam]
    );

    const [inProgressRows]: any = await conn.execute(
      `SELECT COUNT(*) as count FROM hazards ${whereDeptClause ? whereDeptClause + ' AND' : 'WHERE'} status = 'processing'`,
      [...deptParam]
    );

    const [closedRows]: any = await conn.execute(
      `SELECT COUNT(*) as count FROM hazards ${whereDeptClause ? whereDeptClause + ' AND' : 'WHERE'} status = 'closed'`,
      [...deptParam]
    );

    const [levelRows]: any = await conn.execute(
      `SELECT hazard_level, COUNT(*) as count FROM hazards ${whereDeptClause} GROUP BY hazard_level`,
      [...deptParam]
    );

    const [statusRows]: any = await conn.execute(
      `SELECT status, COUNT(*) as count FROM hazards ${whereDeptClause} GROUP BY status`,
      [...deptParam]
    );

    await conn.end();
    conn = null;

    return NextResponse.json({
      success: true,
      data: {
        total: totalRows[0].total,
        pending: pendingRows[0].count,
        approved: approvedRows[0].count,
        rejected: rejectedRows[0].count,
        inProgress: inProgressRows[0].count,
        closed: closedRows[0].count,
        byLevel: levelRows,
        byStatus: statusRows
      }
    });
  } catch (error: any) {
    if (conn) await conn.end().catch(() => {});
    console.error('Get stats error:', error);
    return NextResponse.json({ success: false, error: '获取统计失败' }, { status: 500 });
  }
}
