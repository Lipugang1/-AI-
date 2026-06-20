import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const filename = `sanheyi-backup-${timestamp}.sql`;
    const backupDir = path.join(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const filePath = path.join(backupDir, filename);

    // 使用 mysqldump 导出
    const cmd = `mysqldump -h ${process.env.DB_HOST || '10.214.88.95'} -u ${process.env.DB_USER || 'sanheyi'} -p${process.env.DB_PASSWORD || 'sanheyi2024'} ${process.env.DB_NAME || 'sanheyi'} > "${filePath}"`;
    await execAsync(cmd);

    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ success: false, error: '备份失败：' + error.message }, { status: 500 });
  }
}

async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'sanheyi_super_secret_key_2024_!@#$%^&*()');
    const { getConnection } = require('@/lib/db');
    const conn = await getConnection();
    const [rows]: any = await conn.execute('SELECT id, username, name, role FROM users WHERE id = ? AND is_active = 1', [payload.id]);
    await conn.end();
    return rows[0] || null;
  } catch { return null; }
}
