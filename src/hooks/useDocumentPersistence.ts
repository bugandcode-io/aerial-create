import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { createDocumentPersistence, type DocumentPersistence, type SaveStatus } from '../services/documentPersistence';
import { localDocumentStorage } from '../services/documentStorage';
export function useDocumentPersistence() {
  const session = useRef<DocumentPersistence | null>(null);
  const [status, setStatus] = useState<SaveStatus>('Saving...');
  useEffect(() => {
    const persistence = createDocumentPersistence(useEditorStore, localDocumentStorage, {
      onStatus: setStatus,
      onWarning: (message, error) => { if (import.meta.env.DEV) console.warn(message, error); },
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
  }, []);
  return { status, session };
}
