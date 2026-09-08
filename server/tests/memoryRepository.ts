import type { Repository, User } from '../repository';
import type { AerialDocument } from '../../src/types/document';
// Test double only. The runnable API always uses MySQL.
export function memoryRepository(): Repository {
  const users = new Map<string,User>();
  const sessions = new Map<string,{userId:string;expires:Date}>();
  const projects = new Map<string,{userId:string;document:AerialDocument}>();
  return {
    async createUser(user) { if([...users.values()].some(row=>row.email===user.email))return false; users.set(user.id,user);return true; },
    async userByEmail(email) { return [...users.values()].find(user=>user.email===email) ?? null; },
    async userBySession(hash) { const session=sessions.get(hash);const user=session && session.expires>new Date() ? users.get(session.userId) : null; return user ? {id:user.id,email:user.email} : null; },
    async createSession(hash,userId,expires) { sessions.set(hash,{userId,expires}); },
    async deleteSession(hash) { sessions.delete(hash); },
    async listProjects(userId) { return [...projects.values()].filter(row=>row.userId===userId).map(({document})=>({id:document.id,name:document.name,updatedAt:document.updatedAt})); },
    async getProject(userId,id) {const row=projects.get(id);return row?.userId===userId ? structuredClone(row.document) : null;},
    async createProject(userId,document) {if(projects.has(document.id))return false;projects.set(document.id,{userId,document:structuredClone(document)});return true;},
    async updateProject(userId,document) {if(projects.get(document.id)?.userId!==userId)return false;projects.set(document.id,{userId,document:structuredClone(document)});return true;},
    async deleteProject(userId,id) {if(projects.get(id)?.userId!==userId)return false;return projects.delete(id);},
  };
}
