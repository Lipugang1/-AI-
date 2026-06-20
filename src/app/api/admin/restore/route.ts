import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getUserFromRequest } from '@/lib/auth';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: '请上传备份文件' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const sqlContent = Buffer.from(arrayBuffer).toString('utf-8');

    // 执行 SQL 恢复（危险操作，需谨慎）
    const conn = await (await import('@/lib/db')).getConnection();
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (e: any) {
        console.warn('Skip statement:', e.message);
      }
    }
    await conn.end();

    return NextResponse.json({ success: true, data: { restored: statements.length } });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ success: false, error: '恢复失败：' + error.message }, { status: 500 });
  }
}
