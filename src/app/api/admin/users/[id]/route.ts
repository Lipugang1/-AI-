import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// 从 cookie 获取当前用户
async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return await getUserById(payload.id);
  } catch {
    return null;
  }
}

// PUT /api/admin/users/[id] - 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const success = await updateUser(id, body);
    if (!success) {
      return NextResponse.json({ success: false, error: '更新用户失败' }, { status: 500 });
    }

    const updatedUser = await getUserById(id);
    if (!updatedUser) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const { password_hash, ...result } = updatedUser;
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ success: false, error: '更新用户失败' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const { id } = await params;

    // 不允许删除自己
    if (id === currentUser.id) {
      return NextResponse.json({ success: false, error: '不能删除当前登录用户' }, { status: 400 });
    }

    const success = await deleteUser(id);
    if (!success) {
      return NextResponse.json({ success: false, error: '删除用户失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, error: '删除用户失败' }, { status: 500 });
  }
}
