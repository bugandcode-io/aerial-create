import type { ElementKind } from '../../types/editor';
export function ElementIcon({ type }: { type: ElementKind }) {
  const paths: Record<ElementKind, string> = {
    text: 'M4 5V3h16v2 M12 3v18 M8 21h8', rectangle: 'M3 5h18v14H3z',
    circle: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', line: 'M3 19L21 5',
    triangle: 'M12 3l10 18H2z', arrow: 'M3 12h18 M15 6l6 6-6 6',
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]} /></svg>;
}
