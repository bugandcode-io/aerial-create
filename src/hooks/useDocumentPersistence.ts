import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { createDocumentPersistence, type DocumentPersistence, type SaveStatus } from '../services/documentPersistence';
import { userDocumentStorage } from '../services/documentStorage';
import { createDocument } from '../services/documentFormat';
export function useDocumentPersistence(userId: string) {
  const session = useRef<DocumentPersistence | null>(null);
  const [status, setStatus] = useState<SaveStatus>('Saving...');
  const [warning, setWarning] = useState('');
  useEffect(() => {
    useEditorStore.getState().loadDocument(createDocument());
    const persistence = createDocumentPersistence(useEditorStore, userDocumentStorage(userId), {
      onStatus: setStatus,
      onWarning: (message, error) => { setWarning(message); if (import.meta.env.DEV) console.warn(message, error); },
    });
    session.current = persistence;
    const flush = () => { persistence.flush(); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      flush(); persistence.dispose(); session.current = null;
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [userId]);
  return { status, session, warning, dismissWarning: () => setWarning('') };
}
