import type { StoreApi } from 'zustand';
import type { EditorState } from '../store/editorStore';
import type { DocumentStorage } from './documentStorage';
import { createDocument, deserializeDocument, serializeDocument } from './documentFormat';
export type SaveStatus = 'Saving...' | 'Saved' | 'Unsaved changes';
export interface PersistenceOptions {
  debounceMs?: number;
  onStatus?: (status: SaveStatus) => void;
  onWarning?: (message: string, error: unknown) => void;
}
export function createDocumentPersistence(store: StoreApi<EditorState>, storage: DocumentStorage, options: PersistenceOptions = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let savedFingerprint: string | null = null;
  let disposed = false;
  let writing = false;
  const fingerprint = () => {
    const { updatedAt: _updatedAt, ...design } = store.getState().getDocument();
    return JSON.stringify(design);
  };
  const status = (value: SaveStatus) => options.onStatus?.(value);
  try {
    const draft = storage.loadDocument();
    if (draft) { store.getState().loadDocument(draft); savedFingerprint = fingerprint(); status('Saved'); }
  } catch (error) {
    options.onWarning?.('Local draft could not be recovered. Opening a new blank design; the original stored data is retained.', error);
    store.getState().loadDocument(createDocument());
  }
  const flush = (): boolean => {
    clearTimeout(timer);
    const current = fingerprint();
    if (current === savedFingerprint) { status('Saved'); return true; }
    status('Saving...');
    writing = true;
    try {
      const document = { ...store.getState().getDocument(), updatedAt: new Date().toISOString() };
      storage.saveDocument(document);
      store.getState().markDocumentSaved(document.updatedAt);
      savedFingerprint = fingerprint();
      status('Saved');
      return true;
    } catch (error) {
      status('Unsaved changes');
      options.onWarning?.('Local save failed. Keep the editor open and export JSON to protect your work.', error);
      return false;
    } finally { writing = false; }
  };
  const schedule = () => {
    if (writing || disposed) return;
    clearTimeout(timer);
    if (fingerprint() === savedFingerprint) { status('Saved'); return; }
    status('Unsaved changes');
    // Live typing, color changes and layer drags wait for their transaction to finish.
    if (!store.getState().interactionStart) timer = setTimeout(flush, options.debounceMs ?? 600);
  };
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.elements !== previous.elements || state.document !== previous.document || state.interactionStart !== previous.interactionStart) schedule();
  });
  schedule();
  return {
    flush,
    newDocument() {
      store.getState().commitInteraction();
      if (!flush()) throw new Error('The current design could not be saved. Export JSON before starting a new design.');
      const document = createDocument();
      // A failed new-document write never clears the current editor.
      storage.saveDocument(document);
      store.getState().loadDocument(document);
      savedFingerprint = fingerprint(); clearTimeout(timer); status('Saved');
    },
    importDocument(json: string) {
      const document = deserializeDocument(json); // Validate before touching current state/storage.
      store.getState().commitInteraction();
      if (!flush()) throw new Error('The current design could not be saved. Export JSON before importing another design.');
      // An imported revision sharing this design's ID must not destroy the saved current revision.
      if (document.id === store.getState().document.id) document.id = createDocument().id;
      storage.saveDocument(document);
      store.getState().loadDocument(document);
      savedFingerprint = fingerprint(); clearTimeout(timer); status('Saved');
    },
    exportDocument() {
      store.getState().commitInteraction();
      return serializeDocument({ ...store.getState().getDocument(), updatedAt: new Date().toISOString() });
    },
    dispose() { disposed = true; clearTimeout(timer); unsubscribe(); },
  };
}
export type DocumentPersistence = ReturnType<typeof createDocumentPersistence>;
