export type IconName = 'design' | 'elements' | 'text' | 'uploads' | 'photos' | 'background' | 'undo' | 'redo' | 'download' | 'share' | 'trash';
const paths: Record<IconName, string> = {
    design: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    elements: 'M4 3h7v7H4z M17 3l5 8H12z M11 17a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M15 15h6v6h-6z',
    text: 'M4 5V3h16v2 M12 3v18 M8 21h8', uploads: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
    photos: 'M3 3h18v18H3z M3 17l6-6 5 5 3-3 4 4 M16 7h.01', background: 'M3 3h18v18H3z M3 15L15 3 M3 9l6-6 M3 21L21 3 M9 21l12-12 M15 21l6-6',
    undo: 'M9 5L4 10l5 5 M4 10h10a6 6 0 0 1 6 6v3', redo: 'M15 5l5 5-5 5 M20 10H10a6 6 0 0 0-6 6v3',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5', share: 'M12 15V3 M7 8l5-5 5 5 M5 12v9h14v-9', trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
};
export function Icon({ name }: {
    name: IconName;
}) { return <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d={paths[name]}/>
    </svg>; }

