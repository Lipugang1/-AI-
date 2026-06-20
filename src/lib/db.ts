import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '10.214.88.95',
  user: process.env.DB_USER || 'sanheyi',
  password: process.env.DB_PASSWORD || 'sanheyi2024',
  database: process.env.DB_NAME || 'sanheyi',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql: string, params: any[] = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getConnection() {
  return await pool.getConnection();
}

export async function getUsers(): Promise<any[]> {
  const [rows]: any = await pool.execute(
    'SELECT id, username, name, role, inspection_center, inspection_department, inspection_team, inspection_position, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

export async function getUserById(id: string): Promise<any | null> {
  const [rows]: any = await pool.execute(
    'SELECT id, username, name, role, inspection_center, inspection_department, inspection_team, inspection_position, is_active FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function createUser(data: any): Promise<any | null> {
  try {
    const id = `user-${Date.now()}`;
    const password_hash = await bcrypt.hash(data.password || '123456', 10);
    await pool.execute(
      `INSERT INTO users (id, username, password_hash, name, role, inspection_center, inspection_department, inspection_team, inspection_position, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.username,
        password_hash,
        data.name || data.username,
        data.role || 'inspector',
        data.inspection_center || '',
        data.inspection_department || '',
        data.inspection_team || '',
        data.inspection_position || '',
        data.is_active !== undefined ? data.is_active : 1
      ]
    );
    return await getUserById(id);
  } catch (e) {
    console.error('createUser error:', e);
    return null;
  }
}

export async function updateUser(id: string, data: any): Promise<boolean> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
    if (data.inspection_center !== undefined) { fields.push('inspection_center = ?'); values.push(data.inspection_center); }
    if (data.inspection_department !== undefined) { fields.push('inspection_department = ?'); values.push(data.inspection_department); }
    if (data.inspection_team !== undefined) { fields.push('inspection_team = ?'); values.push(data.inspection_team); }
    if (data.inspection_position !== undefined) { fields.push('inspection_position = ?'); values.push(data.inspection_position); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }
    if (data.password) {
      fields.push('password_hash = ?');
      values.push(await bcrypt.hash(data.password, 10));
    }
    if (fields.length === 0) return true;
    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (e) {
    console.error('updateUser error:', e);
    return false;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    return true;
  } catch (e) {
    console.error('deleteUser error:', e);
    return false;
  }
}

export default pool;
