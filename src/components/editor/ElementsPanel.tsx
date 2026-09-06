import type { ShapeKind } from '../../types/editor';
import { useEditorStore } from '../../store/editorStore';
import { ElementIcon } from './ElementIcon';
const shapes: ShapeKind[] = ['rectangle', 'circle', 'line', 'triangle', 'arrow'];
export function ElementsPanel() {
  const addShape = useEditorStore((state) => state.addShape);
  return <><p className="panel-description">Build your idea, one shape at a time.</p>
    <div className="section-label">BASIC SHAPES</div>
    <div className="shape-presets">{shapes.map((type) => <button key={type} onClick={() => addShape(type)}>
      <ElementIcon type={type} /><span>{type[0].toUpperCase() + type.slice(1)}</span><span>+</span>
    </button>)}</div></>;
}
