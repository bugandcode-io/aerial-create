import { Group } from 'react-konva';
import { useEditorStore } from '../../store/editorStore';
import type { EditorElement } from '../../types/editor';
import { ShapeElement } from './ShapeElement';
import { TextElement } from './TextElement';
export function CanvasElement({ element, editing, onEdit }: {
  element: EditorElement; editing: boolean; onEdit: () => void;
}) {
  const { select, updateTransform, updateShape, beginInteraction, commitInteraction } = useEditorStore();
  return <Group id={element.id} name={editing ? 'inline-editing-text' : 'design-element'}
    x={element.x} y={element.y} scaleX={element.scaleX} scaleY={element.scaleY}
    rotation={element.rotation} opacity={element.opacity} visible={element.visible && !editing}
    listening={!element.locked} draggable={!element.locked}
    onClick={() => select(element.id)} onTap={() => select(element.id)}
    onDblClick={() => { if (element.type === 'text' && !element.locked) onEdit(); }}
    onDblTap={() => { if (element.type === 'text' && !element.locked) onEdit(); }}
    onDragStart={() => select(element.id)}
    onDragEnd={(event) => updateTransform(element.id, { x: event.target.x(), y: event.target.y() })}
    onTransformEnd={(event) => {
      const node = event.currentTarget;
      beginInteraction();
      if (element.type !== 'text') {
        const width = Math.max(1, element.width * node.scaleX());
        const height = element.type === 'line' || element.type === 'arrow' ? 0 : Math.max(1, element.height * node.scaleY());
        node.scale({ x: 1, y: 1 });
        updateShape(element.id, { width, height });
      }
      updateTransform(element.id, { x: node.x(), y: node.y(), rotation: node.rotation(), scaleX: node.scaleX(), scaleY: node.scaleY() });
      commitInteraction();
    }}>
    {element.type === 'text' ? <TextElement element={element} /> : <ShapeElement element={element} />}
  </Group>;
}
