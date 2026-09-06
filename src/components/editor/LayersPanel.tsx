import { useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { ElementIcon } from './ElementIcon';
export function LayersPanel() {
  const { elements, selectedId, select, toggleVisible, toggleLocked, moveSelected,
    beginInteraction, commitInteraction, cancelInteraction, reorder } = useEditorStore();
  const dragging = useRef<{ id: string; startY: number; started: boolean } | null>(null);
  const lastTarget = useRef<string | null>(null);
  const index = elements.findIndex((element) => element.id === selectedId);

  return <section className="layers-panel" aria-label="Layers">
    <div className="panel-heading"><h2>Layers</h2><span className="tiny-label">{elements.length} ELEMENTS</span></div>
    <div className="layer-order-controls">
      <button aria-label="Bring to front" title="Bring to front (Ctrl+Shift+])" disabled={index < 0 || index === elements.length - 1} onClick={() => moveSelected('front')}>⇈</button>
      <button aria-label="Bring forward" title="Bring forward (Ctrl+])" disabled={index < 0 || index === elements.length - 1} onClick={() => moveSelected('forward')}>↑</button>
      <button aria-label="Send backward" title="Send backward (Ctrl+[)" disabled={index <= 0} onClick={() => moveSelected('backward')}>↓</button>
      <button aria-label="Send to back" title="Send to back (Ctrl+Shift+[)" disabled={index <= 0} onClick={() => moveSelected('back')}>⇊</button>
    </div>
    <div className="layer-list"
      onPointerDown={(event) => {
        if (event.button !== 0 || !(event.target instanceof Element) || event.target.closest('.layer-toggle')) return;
        const row = event.target.closest<HTMLElement>('[data-layer-id]');
        if (!row?.dataset.layerId) return;
        dragging.current = { id: row.dataset.layerId, startY: event.clientY, started: false };
        lastTarget.current = null;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragging.current;
        if (!drag) return;
        if (!drag.started) {
          if (Math.abs(event.clientY - drag.startY) < 5) return;
          select(drag.id); beginInteraction(); drag.started = true;
        }
        event.preventDefault();
        const list = event.currentTarget;
        const bounds = list.getBoundingClientRect();
        if (event.clientY < bounds.top + 22) list.scrollTop -= 12;
        if (event.clientY > bounds.bottom - 22) list.scrollTop += 12;
        const rows = [...list.querySelectorAll<HTMLElement>('[data-layer-id]')];
        const target = rows.find((row) => { const rect = row.getBoundingClientRect(); return event.clientY >= rect.top && event.clientY <= rect.bottom; });
        const targetId = target?.dataset.layerId;
        if (!targetId || targetId === drag.id || targetId === lastTarget.current) return;
        lastTarget.current = targetId;
        reorder(drag.id, useEditorStore.getState().elements.findIndex((element) => element.id === targetId));
      }}
      onPointerUp={(event) => {
        const drag = dragging.current;
        if (!drag) return;
        if (drag.started) commitInteraction(); else select(drag.id);
        dragging.current = null; lastTarget.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        if (dragging.current?.started) cancelInteraction();
        dragging.current = null; lastTarget.current = null;
      }}>
      {[...elements].reverse().map((element) => <div key={element.id} data-layer-id={element.id}
        className={`layer-row${selectedId === element.id ? ' selected' : ''}${!element.visible ? ' hidden-layer' : ''}`}>
        <button className="layer-select" aria-label={`Select ${element.name}`} aria-pressed={selectedId === element.id} onClick={() => select(element.id)}>
          <ElementIcon type={element.type} /><span>{element.name}</span>
        </button>
        <button className="layer-toggle" aria-label={`${element.visible ? 'Hide' : 'Show'} ${element.name}`} title={element.visible ? 'Hide layer' : 'Show layer'} onClick={() => toggleVisible(element.id)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!element.visible && <path d="m3 3 18 18"/>}</svg>
        </button>
        <button className="layer-toggle" aria-label={`${element.locked ? 'Unlock' : 'Lock'} ${element.name}`} title={element.locked ? 'Unlock layer' : 'Lock layer'} onClick={() => toggleLocked(element.id)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d={element.locked ? 'M8 10V6a4 4 0 0 1 8 0v4' : 'M8 10V6a4 4 0 0 1 8 0'}/></svg>
        </button>
      </div>)}
      {!elements.length && <p className="field-help">Your elements will appear here.</p>}
    </div>
    {!!elements.length && <p className="field-help">Front at top · Drag rows to reorder</p>}
  </section>;
}

