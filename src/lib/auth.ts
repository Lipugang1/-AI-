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
  inspection_center?: string;
  inspection_department?: string;
  inspection_team?: string;
  inspection_position?: string;
  team_id?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
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
  return verifyToken(token) as User | null;
}

export async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    const rows: any = await query(
      'SELECT id, username, name, role, inspection_center, inspection_department, inspection_team, inspection_position FROM users WHERE id = ? AND is_active = 1',
      [payload.id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}
