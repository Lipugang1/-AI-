import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const response = NextResponse.json(
    { success: true, message: '已退出登录' },
    { status: 200 }
  );
  
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
  
  return response;
}
