import { useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { SaveStatus } from '../../services/documentPersistence';
import { Icon } from './Icon';
interface TopBarProps {
  onDownload: () => void; saveStatus: SaveStatus; onNew: () => void;
  onExport: () => void; onImport: (file: File) => void;
}
export function TopBar({ onDownload, saveStatus, onNew, onExport, onImport }: TopBarProps) {
  const { past, future, undo, redo, document, renameDocument } = useEditorStore();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeMenu = () => { if (menuRef.current) menuRef.current.open = false; };
  return <header className="topbar">
    <div className="brand" aria-label="Aerial Create"><span className="brand-mark">A</span><span>AERIAL{' '}<b>CREATE</b></span></div>
    <span className="top-divider" />
    <div className="project-name">
      <input aria-label="Project name" className="project-name-input" maxLength={200}
        value={nameDraft ?? document.name} onChange={(event) => { setNameDraft(event.target.value); renameDocument(event.target.value); }}
        onBlur={() => { if (nameDraft?.trim()) renameDocument(nameDraft.trim()); setNameDraft(null); }}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur(); }} />
      <span className="project-tag">{document.width} × {document.height}</span>
    </div>
    <span className="save-status" role="status" title={saveStatus === 'Unsaved changes' ? 'Changes are pending. If this persists, export JSON to protect your work.' : 'Saved locally in this browser'}>{saveStatus}</span>
    <details className="document-menu" ref={menuRef}>
      <summary aria-label="Document menu" title="Document menu">⋯</summary>
      <div className="document-menu-items">
        <button onClick={() => { closeMenu(); onNew(); }}>New design</button>
        <button onClick={() => { closeMenu(); onExport(); }}>Export JSON</button>
        <button onClick={() => { closeMenu(); fileRef.current?.click(); }}>Import JSON</button>
      </div>
    </details>
    <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Import document JSON"
      onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onImport(file); }} />
    <div className="history-actions">
      <button className="icon-button" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!past.length} onClick={undo}><Icon name="undo" /></button>
      <button className="icon-button" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!future.length} onClick={redo}><Icon name="redo" /></button>
    </div>
    <button className="share-button" disabled title="Sharing is coming in a later milestone"><Icon name="share" />Share</button>
    <button className="download-button" onClick={onDownload}><Icon name="download" />Download<span>PNG</span></button>
  </header>;
}
