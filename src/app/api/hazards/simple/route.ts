import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET() {
  try {
    const conn = await getConnection();
    const [rows]: any = await conn.execute('SELECT * FROM hazards LIMIT 5');
    await conn.end();
    return NextResponse.json({ success: true, count: rows.length, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
