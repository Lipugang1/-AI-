import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const conn = await getConnection();

    // 构建基础WHERE（权限控制）
    let whereDept = '';
    const params: any[] = [];
    if (user.role !== 'admin') {
      whereDept = 'WHERE inspection_department = ?';
      params.push(user.inspection_department);
    }

    // 总数
    const [totalRows]: any = await conn.execute(
      `SELECT COUNT(*) as total FROM hazards ${whereDept}`,
      params
    );

    // 待处理（status = draft 或 pending）
    const [pendingRows]: any = await conn.execute(
      `SELECT COUNT(*) as count FROM hazards ${whereDept ? whereDept + ' AND' : 'WHERE'} status IN ('draft', 'pending')`,
      params
    );

    // 治理中
    const [inProgressRows]: any = await conn.execute(
      `SELECT COUNT(*) as count FROM hazards ${whereDept ? whereDept + ' AND' : 'WHERE'} status = 'in_progress'`,
      params
    );

    // 已关闭
    const [closedRows]: any = await conn.execute(
      `SELECT COUNT(*) as count FROM hazards ${whereDept ? whereDept + ' AND' : 'WHERE'} status = 'closed'`,
      params
    );

    // 按等级统计
    const [levelRows]: any = await conn.execute(
      `SELECT hazard_level, COUNT(*) as count FROM hazards ${whereDept} GROUP BY hazard_level`,
      params
    );

    // 按状态统计
    const [statusRows]: any = await conn.execute(
      `SELECT status, COUNT(*) as count FROM hazards ${whereDept} GROUP BY status`,
      params
    );

    await conn.end();

    return NextResponse.json({
      success: true,
      data: {
        total: totalRows[0].total,
        pending: pendingRows[0].count,
        inProgress: inProgressRows[0].count,
        closed: closedRows[0].count,
        byLevel: levelRows,
        byStatus: statusRows
      }
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json({ success: false, error: '获取统计失败' }, { status: 500 });
  }
}
