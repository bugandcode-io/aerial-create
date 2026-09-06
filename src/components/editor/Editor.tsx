import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { useEditorStore } from '../../store/editorStore';
import { exportCanvas } from '../../utils/exportCanvas';
import './editor.css';
import { useDocumentPersistence } from '../../hooks/useDocumentPersistence';
export function Editor() {
    const stageRef = useRef<Konva.Stage>(null);
    const [error, setError] = useState('');
    const { status, session } = useDocumentPersistence();
    const documentId = useEditorStore((state) => state.document.id);
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement && (target.closest('input, textarea, select') || target.isContentEditable))
                return;
            const state = useEditorStore.getState();
            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')) {
                event.preventDefault();
                if (key === 'y' || event.shiftKey)
                    state.redo();
                else
                    state.undo();
            }
            else if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'd'].includes(key)) {
                event.preventDefault();
                if (key === 'c') state.copySelected();
                else if (key === 'v') state.paste();
                else state.duplicateSelected();
            }
            else if ((event.ctrlKey || event.metaKey) && (event.code === 'BracketRight' || event.code === 'BracketLeft')) {
                event.preventDefault();
                state.moveSelected(event.code === 'BracketRight' ? (event.shiftKey ? 'front' : 'forward') : (event.shiftKey ? 'back' : 'backward'));
            }
            else if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                state.deleteSelected();
            }
            else if (event.key === 'Escape')
                state.select(null);
        };
        const isTextInput = (target: EventTarget | null) => target instanceof HTMLElement &&
            (target.closest('input, textarea, select') || target.isContentEditable);
        const onCopy = (event: ClipboardEvent) => {
            if (isTextInput(event.target)) return;
            const state = useEditorStore.getState();
            const element = state.elements.find((item) => item.id === state.selectedId);
            if (!element) return;
            state.copySelected();
            event.preventDefault();
            event.clipboardData?.setData('text/plain', element.type === 'text' ? element.text : element.name);
        };
        const onPaste = (event: ClipboardEvent) => {
            if (isTextInput(event.target) || !useEditorStore.getState().clipboard) return;
            event.preventDefault();
            useEditorStore.getState().paste();
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('copy', onCopy);
        window.addEventListener('paste', onPaste);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('copy', onCopy);
            window.removeEventListener('paste', onPaste);
        };
    }, []);
    return <div className="editor">
      <TopBar key={documentId} saveStatus={status}
        onNew={() => {
          try { session.current?.newDocument(); setError(''); }
          catch (error) { setError(error instanceof Error ? error.message : 'Could not create a new design.'); }
        }}
        onExport={() => {
          try {
            const json = session.current?.exportDocument();
            if (!json) return;
            const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${useEditorStore.getState().document.name.replace(/[<>:"/\\|?*]/g, '_')}.aerial.json`;
            link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setError('');
          } catch (error) { setError(error instanceof Error ? error.message : 'Could not export JSON.'); }
        }}
        onImport={async (file) => {
          try {
            if (file.size > 10_000_000) throw new Error('Document exceeds the 10 MB import limit.');
            const json = await file.text();
            session.current?.importDocument(json); setError('');
          } catch (error) { setError(error instanceof Error ? error.message : 'Could not import this document.'); }
        }}
        onDownload={() => { if (!stageRef.current)
        return; try {
        exportCanvas(stageRef.current, useEditorStore.getState().document);
        setError('');
    }
    catch {
        setError('The PNG could not be exported. Please try again.');
    } }}/>
      <div className="editor-body">
        <Sidebar />
        <Canvas key={documentId} stageRef={stageRef}/>
        <PropertiesPanel />
      </div>
      {error && <div role="alert" className="export-error">
        {error}
        <button onClick={() => setError('')}>Dismiss</button>
      </div>}
    </div>;
}





