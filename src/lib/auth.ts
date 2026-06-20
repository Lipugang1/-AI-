import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'sanheyi_super_secret_key_2024_!@#$%^&*()';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  department_id?: string;
  team_id?: string;
  inspection_center?: string;
  inspection_department?: string;
  inspection_team?: string;
  inspection_position?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department_id: user.department_id,
      team_id: user.team_id,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION as any }
  );
}

export function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const rows: any = await query(
    'SELECT id, username, name, role, department_id, team_id FROM users WHERE id = ? AND is_active = 1',
    [payload.id]
  );
  return rows[0] || null;
}

export async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    const rows: any = await query(
      'SELECT id, username, name, role, department_id, team_id FROM users WHERE id = ? AND is_active = 1',
      [payload.id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

/** 判断是否为系统管理员（不受权限限制） */
export function isAdmin(user: any): boolean {
  return user?.role === 'admin';
}

/** 获取用户的部门ID列表（本部门 + 所有子部门），用于数据权限过滤 */
export async function getUserDepartmentIds(user: any): Promise<string[]> {
  if (!user?.department_id) return [];
  const deptIds = [user.department_id];
  // 递归获取所有子部门
  const children = await query(
    'SELECT id FROM departments WHERE parent_id = ? AND is_active = 1',
    [user.department_id]
  ) as any[];
  for (const child of children) {
    const subIds = await getUserDepartmentIds({ department_id: child.id });
    deptIds.push(...subIds);
  }
  return deptIds;
}

/** 获取用户的部门层级链（从根到当前），用于判断所属中心 */
export async function getUserDepartmentChain(user: any): Promise<any[]> {
  if (!user?.department_id) return [];
  const chain: any[] = [];
  let currentId = user.department_id;
  while (currentId) {
    const rows = await query('SELECT id, name, code, parent_id FROM departments WHERE id = ?', [currentId]) as any[];
    if (rows.length === 0) break;
    chain.unshift(rows[0]);
    currentId = rows[0].parent_id;
  }
  return chain;
}

/** 获取用户所属的中心（二级部门） */
export async function getUserCenter(user: any): Promise<any | null> {
  const chain = await getUserDepartmentChain(user);
  // 组织架构：公司 → 中心 → 科室 → 班组
  // 中心是第2层（索引1）
  return chain.length >= 2 ? chain[1] : (chain.length === 1 ? chain[0] : null);
}
