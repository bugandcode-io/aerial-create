import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const { beginInteraction, commitInteraction } = useEditorStore();
  return <div className="field">{label}<div className="color-field">
    <input aria-label={`${label} picker`} type="color" value={value} onFocus={beginInteraction}
      onChange={(event) => { beginInteraction(); onChange(event.target.value); }} onBlur={commitInteraction} />
    <input aria-label={`${label} hex`} className="hex-input" value={draft ?? value} maxLength={7}
      onFocus={beginInteraction} onChange={(event) => {
        setDraft(event.target.value);
        if (/^#[0-9a-f]{6}$/i.test(event.target.value)) { beginInteraction(); onChange(event.target.value); }
      }} onBlur={() => { commitInteraction(); setDraft(null); }} />
  </div></div>;
}
