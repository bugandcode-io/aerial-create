import type { ShapeElement } from '../../types/editor';
import { useEditorStore } from '../../store/editorStore';
import { NumberField } from './NumberField';
import { ColorField } from './ColorField';
import { Icon } from './Icon';
export function ShapeProperties({ element }: { element: ShapeElement }) {
  const { updateShape, updateTransform, updateArrow, deleteSelected, beginInteraction, commitInteraction } = useEditorStore();
  const linear = element.type === 'line' || element.type === 'arrow';
  return <>
    <div className="panel-heading"><h2>{element.type[0].toUpperCase() + element.type.slice(1)} properties</h2></div>
    {!linear && <ColorField label="Fill color" value={element.fill} onChange={(fill) => updateShape(element.id, { fill })} />}
    <ColorField label="Stroke color" value={element.stroke} onChange={(stroke) => updateShape(element.id, { stroke })} />
    <NumberField label="Stroke width" value={element.strokeWidth} min={0} max={200} onChange={(strokeWidth) => updateShape(element.id, { strokeWidth })} />
    <label className="field">Opacity · {Math.round(element.opacity * 100)}%
      <input aria-label="Opacity" type="range" min="0" max="100" value={Math.round(element.opacity * 100)}
        onPointerDown={beginInteraction} onKeyDown={beginInteraction}
        onChange={(event) => { beginInteraction(); updateTransform(element.id, { opacity: Number(event.target.value) / 100 }); }}
        onPointerUp={commitInteraction} onPointerCancel={commitInteraction} onKeyUp={commitInteraction} onBlur={commitInteraction} />
    </label>
    <NumberField label="Rotation" value={element.rotation} onChange={(rotation) => updateTransform(element.id, { rotation })} />
    <div className="field-row">
      <NumberField label="Position X" value={element.x} onChange={(x) => updateTransform(element.id, { x })} />
      <NumberField label="Position Y" value={element.y} onChange={(y) => updateTransform(element.id, { y })} />
    </div>
    <div className={linear ? '' : 'field-row'}>
      <NumberField label={linear ? 'Length' : 'Width'} value={element.width} min={1} onChange={(width) => updateShape(element.id, { width })} />
      {!linear && <NumberField label="Height" value={element.height} min={1} onChange={(height) => updateShape(element.id, { height })} />}
    </div>
    {element.type === 'arrow' && <div className="field-row">
      <NumberField label="Arrowhead length" value={element.pointerLength} min={1} max={200} onChange={(pointerLength) => updateArrow(element.id, { pointerLength })} />
      <NumberField label="Arrowhead width" value={element.pointerWidth} min={1} max={200} onChange={(pointerWidth) => updateArrow(element.id, { pointerWidth })} />
    </div>}
    <button className="delete-button" onClick={deleteSelected}><Icon name="trash" />Delete element</button>
  </>;
}
