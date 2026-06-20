import { NextRequest, NextResponse } from 'next/server';
export function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
  return NextResponse.redirect(new URL(`/uploads/${key}`, request.url));
}
