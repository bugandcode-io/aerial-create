import type { AerialDocument } from '../types/document';
import { deserializeDocument, serializeDocument } from './documentFormat';
export interface DocumentStorage {
  saveDocument: (document: AerialDocument) => void;
  loadDocument: (id?: string) => AerialDocument | null;
  listDocuments: () => { documents: DocumentSummary[]; invalidCount: number };
  activateDocument: (id: string) => void;
  clearDocument: () => void;
}
export type DocumentSummary = Pick<AerialDocument, 'id' | 'name' | 'updatedAt'>;
export type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
export const ACTIVE_DOCUMENT_KEY = 'aerial-create:active-document';
export const documentKey = (id: string) => `aerial-create:document:${id}`;
export function createLocalDocumentStorage(access: () => StorageAccess): DocumentStorage {
  return {
    saveDocument(document) {
      const json = serializeDocument(document);
      const storage = access();
      // Write the complete document before moving the active pointer. Older IDs remain saved.
      storage.setItem(documentKey(document.id), json);
      storage.setItem(ACTIVE_DOCUMENT_KEY, document.id);
    },
    loadDocument(requestedId) {
      const storage = access();
      const id = requestedId ?? storage.getItem(ACTIVE_DOCUMENT_KEY);
      if (!id) return null;
      const json = storage.getItem(documentKey(id));
      if (!json) throw new Error('The active local document is missing.');
      const document = deserializeDocument(json);
      if (document.id !== id) throw new Error('Local document identifier mismatch.');
      return document;
    },
    listDocuments() {
      const storage = access();
      const documents: DocumentSummary[] = [];
      let invalidCount = 0;
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (!key?.startsWith(documentKey(''))) continue;
        const json = storage.getItem(key);
        try {
          const document = deserializeDocument(json ?? '');
          if (key !== documentKey(document.id)) throw new Error('Local document identifier mismatch.');
          documents.push({ id: document.id, name: document.name, updatedAt: document.updatedAt });
        } catch { invalidCount++; }
      }
      documents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
      return { documents, invalidCount };
    },
    activateDocument(id) { access().setItem(ACTIVE_DOCUMENT_KEY, id); },
    clearDocument() {
      const storage = access();
      const id = storage.getItem(ACTIVE_DOCUMENT_KEY);
      if (id) storage.removeItem(documentKey(id));
      storage.removeItem(ACTIVE_DOCUMENT_KEY);
    },
  };
}
export const localDocumentStorage = createLocalDocumentStorage(() => window.localStorage);

// Recovery keys are account-scoped. Legacy anonymous drafts are retained, never auto-assigned.
export function userDocumentStorage(userId: string, access: () => StorageAccess = () => window.localStorage): DocumentStorage {
  const prefix = `aerial-create:user:${userId}:`;
  return createLocalDocumentStorage(() => {
    const storage = access();
    const keys = () => Array.from({length:storage.length},(_,i) => storage.key(i))
      .filter((key): key is string => key !== null && key.startsWith(prefix));
    return {
      getItem: key => storage.getItem(prefix + key),
      setItem: (key,value) => storage.setItem(prefix + key,value),
      removeItem: key => storage.removeItem(prefix + key),
      get length() { return keys().length; },
      key: index => keys()[index]?.slice(prefix.length) ?? null,
    };
  });
}
