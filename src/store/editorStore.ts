import { create } from 'zustand';
import type { AerialDocument, DocumentMetadata } from '../types/document';
import { createDocument } from '../services/documentFormat';
import { type EditorElement, type TextPatch, type TextPreset, type ShapeKind, type ShapePatch, type TransformPatch, type OrderAction } from '../types/editor';

export interface EditorState {
  document: DocumentMetadata;
  getDocument: () => AerialDocument;
  loadDocument: (document: AerialDocument) => void;
  renameDocument: (name: string) => void;
  markDocumentSaved: (updatedAt: string) => void;
  elements: EditorElement[];
  selectedId: string | null;
  past: EditorElement[][];
  future: EditorElement[][];
  interactionStart: EditorElement[] | null;
  clipboard: EditorElement | null;
  beginInteraction: () => void;
  commitInteraction: () => void;
  cancelInteraction: () => void;
  select: (id: string | null) => void;
  addText: (preset: TextPreset) => void;
  addShape: (type: ShapeKind) => void;
  updateText: (id: string, patch: TextPatch) => void;
  updateShape: (id: string, patch: ShapePatch) => void;
  updateTransform: (id: string, patch: TransformPatch) => void;
  updateArrow: (id: string, patch: { pointerLength?: number; pointerWidth?: number }) => void;
  toggleLocked: (id: string) => void;
  toggleVisible: (id: string) => void;
  reorder: (id: string, index: number) => void;
  moveSelected: (action: OrderAction) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  duplicateSelected: () => void;
  undo: () => void;
  redo: () => void;
}
const presets = {
  heading: { text: 'Add a heading', fontSize: 64, fontStyle: 'bold' as const },
  subheading: { text: 'Add a subheading', fontSize: 36, fontStyle: 'normal' as const },
  body: { text: 'Add body text', fontSize: 22, fontStyle: 'normal' as const },
};
const remember = (state: EditorState, elements: EditorElement[]) => ({
  elements, past: [...state.past, state.elements].slice(-100), future: [],
});
const nextName = (elements: EditorElement[], base: string) => {
  const names = new Set(elements.map((element) => element.name));
  if (!names.has(base)) return base;
  let suffix = 2;
  while (names.has(`${base} ${suffix}`)) suffix++;
  return `${base} ${suffix}`;
};
export const useEditorStore = create<EditorState>((set, get) => {
  const change = (transform: (element: EditorElement) => EditorElement) => set((state) => {
    const elements = state.elements.map(transform);
    if (JSON.stringify(elements) === JSON.stringify(state.elements)) return state;
    return state.interactionStart ? { elements } : remember(state, elements);
  });
  const insertCopy = (source: EditorElement | undefined | null) => {
    if (!source) return;
    get().commitInteraction();
    const element = { ...source, id: crypto.randomUUID(), x: source.x + 24, y: source.y + 24,
      name: nextName(get().elements, source.name.replace(/ \d+$/, '')) };
    set((state) => ({ ...remember(state, [...state.elements, element]), selectedId: element.id }));
  };
  return {
    document: (() => { const { elements: _elements, ...metadata } = createDocument(); return metadata; })(),
    getDocument: () => ({ ...get().document, elements: get().elements }),
    loadDocument: (document) => {
      const { elements, ...metadata } = structuredClone(document);
      set({ document: metadata, elements, selectedId: null, past: [], future: [], interactionStart: null, clipboard: null });
    },
    renameDocument: (name) => set((state) => name.trim() && name.length <= 200 && name !== state.document.name
      ? { document: { ...state.document, name } } : state),
    markDocumentSaved: (updatedAt) => set((state) => ({ document: { ...state.document, updatedAt } })),
    elements: [], selectedId: null, past: [], future: [], interactionStart: null, clipboard: null,
    beginInteraction: () => set((state) => state.interactionStart ? state : { interactionStart: state.elements }),
    commitInteraction: () => set((state) => {
      if (!state.interactionStart) return state;
      const changed = JSON.stringify(state.interactionStart) !== JSON.stringify(state.elements);
      return { interactionStart: null,
        ...(changed ? { past: [...state.past, state.interactionStart].slice(-100), future: [] } : {}) };
    }),
    cancelInteraction: () => set((state) => state.interactionStart ? {
      elements: state.interactionStart, interactionStart: null,
    } : state),
    select: (selectedId) => {
      if (get().selectedId !== selectedId) get().commitInteraction();
      set({ selectedId });
    },
    addText: (preset) => {
      get().commitInteraction();
      set((state) => {
        const defaults = presets[preset];
        const element: EditorElement = {
          id: crypto.randomUUID(), type: 'text', x: (state.document.width - Math.min(800, state.document.width * 0.8)) / 2,
          name: nextName(state.elements, preset === 'heading' ? 'Heading' : preset === 'subheading' ? 'Subheading' : 'Body text'),
          visible: true, locked: false,
          y: (state.document.height - defaults.fontSize) / 2 + (state.elements.length % 5) * 12,
          width: Math.min(800, state.document.width * 0.8), rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
          fontFamily: 'Arial', fill: '#202334', align: 'center', ...defaults,
        };
        return { ...remember(state, [...state.elements, element]), selectedId: element.id };
      });
    },
    addShape: (type) => {
      get().commitInteraction();
      set((state) => {
        const base = { id: crypto.randomUUID(), name: nextName(state.elements, type[0].toUpperCase() + type.slice(1)),
          x: (state.document.width - 300) / 2, y: (state.document.height - 300) / 2, width: 300, height: 300, rotation: 0, scaleX: 1, scaleY: 1,
          opacity: 1, visible: true, locked: false, fill: '#8260ed', stroke: '#35304f', strokeWidth: 0 };
        const element: EditorElement = type === 'arrow'
          ? { ...base, type, height: 0, y: state.document.height / 2, strokeWidth: 6, pointerLength: 24, pointerWidth: 24 }
          : type === 'line' ? { ...base, type, height: 0, y: state.document.height / 2, strokeWidth: 6 }
          : { ...base, type };
        return { ...remember(state, [...state.elements, element]), selectedId: element.id };
      });
    },
    updateText: (id, patch) => change((element) => element.id === id && element.type === 'text' && !element.locked ? { ...element, ...patch } : element),
    updateShape: (id, patch) => change((element) => element.id === id && element.type !== 'text' && !element.locked ? { ...element, ...patch } : element),
    updateTransform: (id, patch) => change((element) => element.id === id && !element.locked ? { ...element, ...patch } : element),
    updateArrow: (id, patch) => change((element) => element.id === id && element.type === 'arrow' && !element.locked ? { ...element, ...patch } : element),
    toggleLocked: (id) => { get().commitInteraction(); change((element) => element.id === id ? { ...element, locked: !element.locked } : element); },
    toggleVisible: (id) => { get().commitInteraction(); change((element) => element.id === id ? { ...element, visible: !element.visible } : element); },
    reorder: (id, index) => set((state) => {
      const from = state.elements.findIndex((element) => element.id === id);
      if (from < 0 || !Number.isFinite(index)) return state;
      const to = Math.max(0, Math.min(state.elements.length - 1, Math.trunc(index)));
      if (from === to) return state;
      const elements = [...state.elements];
      const [element] = elements.splice(from, 1);
      elements.splice(to, 0, element);
      return state.interactionStart ? { elements } : remember(state, elements);
    }),
    moveSelected: (action) => {
      get().commitInteraction();
      const state = get();
      const index = state.elements.findIndex((element) => element.id === state.selectedId);
      if (index < 0) return;
      state.reorder(state.selectedId!, action === 'front' ? state.elements.length - 1 : action === 'back' ? 0 : index + (action === 'forward' ? 1 : -1));
    },
    deleteSelected: () => {
      get().commitInteraction();
      set((state) => state.elements.some((element) => element.id === state.selectedId && !element.locked) ? {
        ...remember(state, state.elements.filter((element) => element.id !== state.selectedId)), selectedId: null,
      } : state);
    },
    copySelected: () => {
      const state = get();
      const element = state.elements.find((item) => item.id === state.selectedId);
      if (element) set({ clipboard: { ...element } });
    },
    paste: () => {
      insertCopy(get().clipboard);
      const state = get();
      if (state.clipboard) set({ clipboard: { ...state.elements.find((item) => item.id === state.selectedId)! } });
    },
    duplicateSelected: () => insertCopy(get().elements.find((item) => item.id === get().selectedId)),
    undo: () => {
      get().commitInteraction();
      set((state) => state.past.length ? {
        elements: state.past.at(-1)!, past: state.past.slice(0, -1),
        future: [state.elements, ...state.future], selectedId: null,
      } : state);
    },
    redo: () => {
      get().commitInteraction();
      set((state) => state.future.length ? {
        elements: state.future[0], past: [...state.past, state.elements].slice(-100),
        future: state.future.slice(1), selectedId: null,
      } : state);
    },
  };
});

