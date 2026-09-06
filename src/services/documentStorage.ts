import type { AerialDocument } from '../types/document';
import { deserializeDocument, serializeDocument } from './documentFormat';
export interface DocumentStorage {
  saveDocument: (document: AerialDocument) => void;
  loadDocument: () => AerialDocument | null;
  clearDocument: () => void;
}
export type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
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
    loadDocument() {
      const storage = access();
      const id = storage.getItem(ACTIVE_DOCUMENT_KEY);
      if (!id) return null;
      const json = storage.getItem(documentKey(id));
      if (!json) throw new Error('The active local document is missing.');
      const document = deserializeDocument(json);
      if (document.id !== id) throw new Error('Local document identifier mismatch.');
      return document;
    },
    clearDocument() {
      const storage = access();
      const id = storage.getItem(ACTIVE_DOCUMENT_KEY);
      if (id) storage.removeItem(documentKey(id));
      storage.removeItem(ACTIVE_DOCUMENT_KEY);
    },
  };
}
export const localDocumentStorage = createLocalDocumentStorage(() => window.localStorage);
