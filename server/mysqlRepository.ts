import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { AerialDocument } from '../src/types/document';
import { deserializeDocument } from '../src/services/documentFormat';
import type { Repository, User, PublicUser, ProjectSummary } from './repository';
const duplicate = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY';
export function mysqlRepository(pool: Pool): Repository {
  return {
    async createUser(user) {
      try { await pool.execute('INSERT INTO users (id,email,password_hash) VALUES (?,?,?)', [user.id,user.email,user.password_hash]); return true; }
      catch (error) { if (duplicate(error)) return false; throw error; }
    },
    async userByEmail(email) {
      const [rows] = await pool.execute<(RowDataPacket & User)[]>('SELECT id,email,password_hash FROM users WHERE email=?', [email]);
      return rows[0] ?? null;
    },
    async userBySession(hash) {
      const [rows] = await pool.execute<(RowDataPacket & PublicUser)[]>(
        'SELECT u.id,u.email FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3)', [hash]);
      return rows[0] ?? null;
    },
    async createSession(hash,userId,expires) {
      await pool.execute('DELETE FROM sessions WHERE expires_at<=UTC_TIMESTAMP(3)');
      await pool.execute('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)', [hash,userId,expires]);
    },
    async deleteSession(hash) { await pool.execute('DELETE FROM sessions WHERE token_hash=?', [hash]); },
    async listProjects(userId) {
      const [rows] = await pool.execute<(RowDataPacket & {id:string;name:string;updated_at:Date})[]>(
        'SELECT id,name,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC,id', [userId]);
      return rows.map((row): ProjectSummary => ({id:row.id,name:row.name,updatedAt:row.updated_at.toISOString()}));
    },
    async getProject(userId,id) {
      const [rows] = await pool.execute<(RowDataPacket & {document_json: AerialDocument | string})[]>(
        'SELECT document_json FROM projects WHERE id=? AND user_id=?', [id,userId]);
      if (!rows[0]) return null;
      const json = rows[0].document_json;
      return deserializeDocument(typeof json === 'string' ? json : JSON.stringify(json));
    },
    async createProject(userId,doc) {
      try {
        await pool.execute('INSERT INTO projects (id,user_id,name,document_json,document_version,width,height,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
          [doc.id,userId,doc.name,JSON.stringify(doc),doc.version,doc.width,doc.height,new Date(doc.createdAt),new Date(doc.updatedAt)]);
        return true;
      } catch (error) { if (duplicate(error)) return false; throw error; }
    },
    async updateProject(userId,doc) {
      const [result] = await pool.execute<ResultSetHeader>('UPDATE projects SET name=?,document_json=?,document_version=?,width=?,height=?,updated_at=? WHERE id=? AND user_id=?',
        [doc.name,JSON.stringify(doc),doc.version,doc.width,doc.height,new Date(doc.updatedAt),doc.id,userId]);
      return result.affectedRows > 0;
    },
    async deleteProject(userId,id) {
      const [result] = await pool.execute<ResultSetHeader>('DELETE FROM projects WHERE id=? AND user_id=?', [id,userId]);
      return result.affectedRows > 0;
    },
  };
}
