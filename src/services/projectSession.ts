import type { StoreApi } from 'zustand';
import type { EditorState } from '../store/editorStore';
import type { DocumentPersistence } from './documentPersistence';
import type { RemoteProjects } from './remoteProjects';
import type { DocumentStorage } from './documentStorage';
import { createDocument, deserializeDocument } from './documentFormat';
import { ApiError } from './api';

// Remote saves are explicit; local autosave continues independently for crash recovery.
export function createProjectSession(store: StoreApi<EditorState>, local: DocumentPersistence,
  storage: DocumentStorage, remote: RemoteProjects) {
  const save = async () => {
    store.getState().commitInteraction();
    if (!local.flush()) throw new Error('Local recovery could not be saved. Export JSON before continuing.');
    const document = structuredClone(store.getState().getDocument());
    let exists = true;
    try { await remote.load(document.id); }
    catch (error) { if (error instanceof ApiError && error.status === 404) exists = false; else throw error; }
    const saved = exists ? await remote.update(document) : await remote.create(document);
    return saved;
  };
  return {
    save,
    async open(id: string) {
      if (id === store.getState().document.id) return;
      const target = await remote.load(id);
      await save();
      storage.saveDocument(target);
      store.getState().loadDocument(target);
      local.flush();
    },
    async newDocument() {
      await save(); local.newDocument();
      await save();
    },
    async importDocument(json:string) {
      const document = deserializeDocument(json);
      // Imported documents always become independent, owned projects.
      document.id = createDocument().id;
      await save(); local.importDocument(JSON.stringify(document)); await save();
    },
    async remove(id:string) {
      if (id === store.getState().document.id) {
        store.getState().commitInteraction();
        if (!local.flush()) throw new Error('Local recovery could not be saved. Export JSON before deleting.');
        // Prepare recovery for a fresh draft before deleting the current project remotely.
        const blank = createDocument();
        storage.saveDocument(blank);
        try { await remote.remove(id); }
        catch(error) { storage.activateDocument(id); throw error; }
        // The blank recovery pointer is already durable: no failing write can resurrect the deleted project.
        store.getState().loadDocument(blank);
        local.flush();
      } else await remote.remove(id);
    },
  };
}
