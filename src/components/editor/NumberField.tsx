import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}
export function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const { beginInteraction, commitInteraction } = useEditorStore();

  return <label className="field">{label}
    <input type="number" step="any" min={min} max={max} value={draft ?? Number(value.toFixed(2))}
      onFocus={beginInteraction}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = event.target.valueAsNumber;
        if (Number.isFinite(next) && (min === undefined || next >= min) && (max === undefined || next <= max)) {
          beginInteraction();
          onChange(next);
        }
      }}
      onBlur={() => { commitInteraction(); setDraft(null); }}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
  </label>;
}

