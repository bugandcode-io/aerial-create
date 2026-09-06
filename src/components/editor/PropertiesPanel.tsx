import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { TextElement } from '../../types/editor';
import { NumberField } from './NumberField';
import { Icon } from './Icon';
import { ShapeProperties } from './ShapeProperties';
import { LayersPanel } from './LayersPanel';

const fonts = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New'];
function TextProperties({ element }: { element: TextElement }) {
  const { updateText, deleteSelected, beginInteraction, commitInteraction } = useEditorStore();
  const [hex, setHex] = useState<string | null>(null);

  const bold = element.fontStyle.includes('bold');
  const italic = element.fontStyle.includes('italic');
  const setStyle = (nextBold: boolean, nextItalic: boolean) => {
    const fontStyle = nextBold ? (nextItalic ? 'bold italic' : 'bold') : (nextItalic ? 'italic' : 'normal');
    updateText(element.id, { fontStyle });
  };
  return <>
    <div className="panel-heading"><h2>Text properties</h2><Icon name="text" /></div>
    <label className="field">Content
      <textarea value={element.text} onFocus={beginInteraction}
        onChange={(event) => { beginInteraction(); updateText(element.id, { text: event.target.value }); }}
        onBlur={commitInteraction} />
    </label>
    <label className="field">Font
      <select value={element.fontFamily} onChange={(event) => updateText(element.id, { fontFamily: event.target.value })}>
        {fonts.map((font) => <option key={font}>{font}</option>)}
      </select>
    </label>
    <NumberField label="Font size" value={element.fontSize} min={1} max={1000}
      onChange={(fontSize) => updateText(element.id, { fontSize })} />
    <div className="field">Style
      <div className="text-style-controls">
        <button aria-pressed={bold} onClick={() => setStyle(!bold, italic)}><b>Bold</b></button>
        <button aria-pressed={italic} onClick={() => setStyle(bold, !italic)}><i>Italic</i></button>
      </div>
    </div>
    <label className="field">Alignment
      <select value={element.align} onChange={(event) => updateText(element.id, { align: event.target.value as TextElement['align'] })}>
        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
      </select>
    </label>
    <div className="field">Text color
      <div className="color-field">
        <input aria-label="Text color picker" type="color" value={element.fill}
          onFocus={beginInteraction} onPointerDown={beginInteraction}
          onChange={(event) => { beginInteraction(); updateText(element.id, { fill: event.target.value }); }}
          onBlur={commitInteraction} />
        <input className="hex-input" aria-label="Hex color" value={hex ?? element.fill} maxLength={7}
          onFocus={beginInteraction}
          onChange={(event) => {
            const value = event.target.value;
            setHex(value);
            if (/^#[0-9a-f]{6}$/i.test(value)) { beginInteraction(); updateText(element.id, { fill: value }); }
          }} onBlur={() => { commitInteraction(); setHex(null); }} />
      </div>
    </div>
    <label className="field">Opacity · {Math.round(element.opacity * 100)}%
      <input aria-label="Opacity" type="range" min="0" max="100" value={Math.round(element.opacity * 100)}
        onPointerDown={beginInteraction} onKeyDown={beginInteraction}
        onChange={(event) => { beginInteraction(); updateText(element.id, { opacity: Number(event.target.value) / 100 }); }}
        onPointerUp={commitInteraction} onPointerCancel={commitInteraction}
        onKeyUp={commitInteraction} onBlur={commitInteraction} />
    </label>
    <NumberField label="Rotation" value={element.rotation} onChange={(rotation) => updateText(element.id, { rotation })} />
    <div className="field-row">
      <NumberField label="Position X" value={element.x} onChange={(x) => updateText(element.id, { x })} />
      <NumberField label="Position Y" value={element.y} onChange={(y) => updateText(element.id, { y })} />
    </div>
    <button className="delete-button" onClick={deleteSelected}><Icon name="trash" />Delete element</button>
  </>;
}
export function PropertiesPanel() {
  const document = useEditorStore((state) => state.document);
  const element = useEditorStore((state) => state.elements.find((item) => item.id === state.selectedId));
  return <aside className="properties-panel" aria-label="Element properties">
    <LayersPanel />
    {element?.locked && <p className="element-status">Locked — unlock this layer to edit it.</p>}
    {element && !element.visible && <p className="element-status">Hidden — this layer is excluded from export.</p>}
    {element ? <fieldset className="element-properties" disabled={element.locked}>
      {element.type === 'text' ? <TextProperties key={element.id} element={element} /> : <ShapeProperties key={element.id} element={element} />}
    </fieldset> : <>
      <div className="panel-heading"><h2>Properties</h2><span className="tiny-label">DESIGN</span></div>
      <div className="document-preview"><div /><span>{document.width === document.height ? 'Square canvas' : 'Custom canvas'}</span><strong>{document.width} × {document.height} px</strong></div>
      <div className="property-empty"><Icon name="text" /><h3>A blank canvas.<br />Endless possibilities.</h3><p>Add a text element to begin. Select it to fine-tune the details here.</p></div>
      <div className="shortcut-card"><span className="section-label">A FEW HANDY SHORTCUTS</span><p>Undo <kbd>Ctrl Z</kbd></p><p>Redo <kbd>Ctrl ⇧ Z</kbd></p><p>Delete selection <kbd>Del</kbd></p></div>
    </>}
  </aside>;
}



