import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { useEditorStore } from '../../store/editorStore';

import { InlineTextEditor } from './InlineTextEditor';
import { CanvasElement } from './CanvasElement';
import { SelectionTransformer } from './SelectionTransformer';
export function Canvas({ stageRef }: {
    stageRef: React.RefObject<Konva.Stage | null>;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { elements, selectedId, select, beginInteraction, document } = useEditorStore();
    const editingElement = elements.find((element) => element.type === 'text' && element.visible && !element.locked && element.id === editingId && element.id === selectedId);
    useEffect(() => { const observer = new ResizeObserver(([entry]) => { setScale(Math.max(0.001, Math.min((entry.contentRect.width - 64) / document.width, (entry.contentRect.height - 100) / document.height, 1))); }); observer.observe(containerRef.current!); return () => observer.disconnect(); }, [document.width, document.height]);
    return <main className="workspace">
      <div className="workspace-toolbar">
        <span>
          <span className="canvas-indicator"/> {document.width === document.height ? 'Square design' : 'Custom design'}</span>
        <span>{document.width} × {document.height} px</span>
      </div>
      <div className="canvas-area" ref={containerRef} onMouseDown={(event) => { if (event.target === event.currentTarget)
        select(null); }}>
        <div className="canvas-wrap">
          <div className="page-label">
            <span>Page 1{' '}
              <span>— {document.name}</span>
            </span>
            <span>{document.width} × {document.height}</span>
          </div>
          <div className="canvas-surface" role="region" aria-label="Design canvas. Use the Text panel to add elements and the properties panel to edit selected text.">
            <Stage
              ref={stageRef}
              width={document.width * scale}
              height={document.height * scale}
              scaleX={scale}
              scaleY={scale}
              onMouseDown={(event) => { if (event.target === event.target.getStage() || event.target.name() === 'canvas-background')
        select(null); }}
              onTouchStart={(event) => { if (event.target.name() === 'canvas-background')
        select(null); }}>
              <Layer>
                <Rect
                  name="canvas-background"
                  width={document.width}
                  height={document.height}
                  fill={document.background.color}/>
                {elements.map((element) => <CanvasElement key={element.id} element={element}
                  editing={editingElement?.id === element.id}
                  onEdit={() => { select(element.id); beginInteraction(); setEditingId(element.id); }} />)}
              </Layer>
              <Layer><SelectionTransformer element={elements.find((element) => element.id === selectedId)} stageRef={stageRef} editing={Boolean(editingElement)} /></Layer>
            </Stage>
            {editingElement?.type === 'text' && <InlineTextEditor key={editingElement.id} element={editingElement} scale={scale} onFinish={() => setEditingId(null)} />}
          </div>
          <div className="canvas-caption">
            {elements.length ? 'Select an element to make it yours' : 'Your next idea starts here'}
          </div>
        </div>
      </div>
      <footer className="workspace-footer">
        <span>
          <span className="status-dot"/>
          {elements.length}{' '}
          {elements.length === 1 ? 'element' : 'elements'}
        </span>
        <span className="workspace-hint">Drag to move · Handles to resize · Top handle to rotate</span>
        <span className="zoom-label">Fit
          <b>
            {Math.round(scale * 100)}%</b>
        </span>
      </footer>
    </main>;
}





