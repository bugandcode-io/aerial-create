import { useEffect, useLayoutEffect, useRef } from 'react';
import type { TextElement } from '../../types/editor';
import { useEditorStore } from '../../store/editorStore';

interface InlineTextEditorProps {
  element: TextElement;
  scale: number;
  onFinish: () => void;
}
export function InlineTextEditor({ element, scale, onFinish }: InlineTextEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finished = useRef(false);
  const { updateText, commitInteraction, cancelInteraction } = useEditorStore();
  const finish = (cancel = false) => {
    if (finished.current) return;
    finished.current = true;
    if (cancel) cancelInteraction();
    else commitInteraction();
    onFinish();
  };
  const finishRef = useRef(finish);
  useLayoutEffect(() => { finishRef.current = finish; });
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !inputRef.current?.contains(event.target)) finishRef.current();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, []);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = '0px';
    input.style.height = `${Math.max(element.fontSize, input.scrollHeight)}px`;
  }, [element.text, element.width, element.fontSize, element.fontFamily, element.fontStyle]);
  return <textarea ref={inputRef} aria-label="Edit canvas text" className="inline-text-editor"
    value={element.text} spellCheck={false}
    style={{
      left: element.x * scale, top: element.y * scale, width: element.width,
      fontSize: element.fontSize, fontFamily: element.fontFamily,
      fontWeight: element.fontStyle.includes('bold') ? 'bold' : 'normal',
      fontStyle: element.fontStyle.includes('italic') ? 'italic' : 'normal',
      color: element.fill, textAlign: element.align, opacity: Math.max(0.2, element.opacity),
      transform: `rotate(${element.rotation}deg) scale(${scale * element.scaleX}, ${scale * element.scaleY})`,
    }}
    onChange={(event) => updateText(element.id, { text: event.target.value })}
    onBlur={() => finish()}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); finish(true); }
      // Enter commits; Shift+Enter inserts a newline, including in multiline text.
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); finish(); }
    }} />;
}

