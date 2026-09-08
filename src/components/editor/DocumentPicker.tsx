import { useEffect, useRef, useState } from 'react';
import type { DocumentSummary } from '../../services/documentStorage';

export function DocumentPicker({ documents, currentId, onOpen, onClose, onDelete }: {
  documents: DocumentSummary[]; currentId: string;
  onOpen: (id: string) => Promise<void>; onClose: () => void; onDelete: (id:string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [deleting,setDeleting] = useState<string | null>(null);
  const [removed,setRemoved] = useState<string[]>([]);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="document-picker" aria-labelledby="saved-designs-title"
    onCancel={event=>{if(busy)event.preventDefault();else onClose();}} onKeyDown={(event) => event.stopPropagation()}>
    <div className="panel-heading"><h2 id="saved-designs-title">Open saved design</h2>
      <button autoFocus disabled={busy} onClick={onClose} aria-label="Close saved designs">×</button></div>
    <p className="field-help">Projects saved to your account. Current changes are saved before switching.</p>
    {error && <p role="alert">{error}</p>}
    <div className="saved-design-list">
      {documents.filter(doc=>!removed.includes(doc.id)).map((document) => <div key={document.id}><button disabled={busy || document.id === currentId}
        onClick={async () => { setBusy(true); try { await onOpen(document.id); onClose(); } catch (error) {
          setError(error instanceof Error ? error.message : 'Could not open this design. Your current design remains open.');
        } finally {setBusy(false);} }}>
        <strong>{document.name}{document.id === currentId ? ' (current)' : ''}</strong>
        <time dateTime={document.updatedAt}>Last saved {new Date(document.updatedAt).toLocaleString()}</time>
      </button>
      <button disabled={busy} onClick={()=>setDeleting(document.id)}>Delete {document.name}</button>
      {deleting === document.id && <div className="delete-confirm"><p>Permanently delete “{document.name}” from your account? This cannot be undone.</p>
        <button disabled={busy} onClick={async()=>{setBusy(true);try{await onDelete(document.id);setRemoved([...removed,document.id]);setDeleting(null);}catch(error){setError(error instanceof Error ? error.message : 'Deletion failed.');}finally{setBusy(false);}}}>Confirm deletion</button>
        <button disabled={busy} onClick={()=>setDeleting(null)}>Cancel</button></div>}
      </div>)}
      {!documents.length && <p className="field-help">No saved designs are available yet.</p>}
    </div>
  </dialog>;
}
