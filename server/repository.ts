import type { AerialDocument } from '../src/types/document';
export interface User { id: string; email: string; password_hash: string }
export type PublicUser = Pick<User, 'id' | 'email'>;
export type ProjectSummary = Pick<AerialDocument, 'id' | 'name' | 'updatedAt'>;
export interface Repository {
  createUser(user: User): Promise<boolean>;
  userByEmail(email: string): Promise<User | null>;
  userBySession(hash: string): Promise<PublicUser | null>;
  createSession(hash: string, userId: string, expires: Date): Promise<void>;
  deleteSession(hash: string): Promise<void>;
  listProjects(userId: string): Promise<ProjectSummary[]>;
  getProject(userId: string, id: string): Promise<AerialDocument | null>;
  createProject(userId: string, document: AerialDocument): Promise<boolean>;
  updateProject(userId: string, document: AerialDocument): Promise<boolean>;
  deleteProject(userId: string, id: string): Promise<boolean>;
}
