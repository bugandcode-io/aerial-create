import { apiRequest } from './api';
import { deserializeDocument } from './documentFormat';
import type { AerialDocument } from '../types/document';
import type { DocumentSummary } from './documentStorage';
export interface RemoteProjects {
  list: () => Promise<DocumentSummary[]>;
  load: (id:string) => Promise<AerialDocument>;
  create: (document:AerialDocument) => Promise<AerialDocument>;
  update: (document:AerialDocument) => Promise<AerialDocument>;
  remove: (id:string) => Promise<void>;
}
const validated = async (request: Promise<unknown>) => deserializeDocument(JSON.stringify(await request));
export const remoteProjects: RemoteProjects = {
  list: async () => (await apiRequest<{projects:DocumentSummary[]}>('/projects')).projects,
  load: id => validated(apiRequest(`/projects/${encodeURIComponent(id)}`)),
  create: document => validated(apiRequest('/projects','POST',document)),
  update: document => validated(apiRequest(`/projects/${encodeURIComponent(document.id)}`,'PUT',document)),
  remove: id => apiRequest(`/projects/${encodeURIComponent(id)}`,'DELETE'),
};
