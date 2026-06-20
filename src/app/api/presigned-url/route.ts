import { NextRequest, NextResponse } from 'next/server';
export async function GET(_: NextRequest) {
  const url = new URL(_.url);
  const key = url.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
  return NextResponse.json({ url: `/uploads/${key}` });
}
