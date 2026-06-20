import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: '登录已过期' }, { status: 401 });
    }

    const users = await query(
      'SELECT id, username, name, role, department_id, team_id, inspection_center, inspection_department, inspection_team, inspection_position FROM users WHERE id = ? AND is_active = 1',
      [user.id]
    ) as any[];

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, error: '用户不存在或已禁用' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: users[0],
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败: ' + error.message },
      { status: 500 }
    );
  }
}
