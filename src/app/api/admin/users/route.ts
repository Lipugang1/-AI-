import { NextRequest, NextResponse } from 'next/server';
import { getUsers, getUserById, createUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'reviewer')) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const users = await getUsers();
    const usersWithoutPassword = users.map((u: any) => {
      const { password_hash, ...rest } = u;
      return rest;
    });

    return NextResponse.json({ success: true, data: usersWithoutPassword });
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json({ success: false, error: '获取用户列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '无权限创建用户' }, { status: 403 });
    }

    const body = await request.json();
    const { password, ...userData } = body;

    if (!password) {
      return NextResponse.json({ success: false, error: '密码不能为空' }, { status: 400 });
    }

    const newUser = await createUser({ ...userData, password });
    if (!newUser) {
      return NextResponse.json({ success: false, error: '创建用户失败，用户名可能已存在' }, { status: 500 });
    }

    const { password_hash, ...userWithoutPassword } = newUser;
    return NextResponse.json({ success: true, data: userWithoutPassword });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ success: false, error: '创建用户失败' }, { status: 500 });
  }
}

async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'sanheyi_super_secret_key_2024_!@#$%^&*()');
    return await getUserById(payload.id);
  } catch {
    return null;
  }
}
