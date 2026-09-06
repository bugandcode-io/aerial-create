# Aerial Create

A desktop-first graphic design editor built with React, TypeScript, Vite, Konva, and Zustand. Milestone 3 adds shapes and layer management to the existing text editor; the editor shell and visual identity are unchanged.

## Development and checks

- `npm install` — install the existing dependencies.
- `npm run dev` — start the editor.
- `npm run build` — check TypeScript and build for production.
- `npm run lint` — run Oxlint.
- `node --test tests/editorStore.test.mjs` — run state/history regression tests using the existing TypeScript dependency and Node's built-in test runner.

## Shapes and layers

Elements offers Rectangle, Circle, Line, Triangle, and Arrow. New shapes are centered, selected, and named automatically (Rectangle, Rectangle 2, etc.). Properties provides fill/stroke, stroke width, opacity, rotation, position, and dimensions. Lines and arrows use length plus rotation; arrows also have arrowhead length/width controls. Circle width and height can differ to create an ellipse.

Every element has a readable `name`, `visible`, and `locked` flag. The discriminated union has concrete text, rectangle, circle, line, triangle, and arrow variants. Shape-specific updates cannot change text properties, and vice versa. Shape transforms normalize scale into width/height on release; text retains its existing font size and scale model. A shared Transformer lives in a separate canvas layer above all design elements.

Layers appears within the existing right-side panel. The array in Zustand is the only stacking-order source: first element is at the back, last is at the front. Rows display the reverse (front at top). Select a row to inspect it, including hidden or locked elements. Reorder using the four order buttons, keyboard shortcuts, or drag a row. Pointer capture keeps dragging active outside a row; live reorder previews use one interaction transaction and commit one history step on release. Pointer cancellation restores the original order. The list scrolls near its edges while dragging. No drag-and-drop dependency is installed.

Locked layers cannot be manipulated on the canvas, edited in Properties, or deleted. They remain selectable in Layers for unlocking. Layer ordering and visibility remain available while locked. Hidden layers remain in the list but do not render or export. Lock and visibility are independent and each change is undoable. Copies preserve both flags, formatting, and geometry, and receive unique names/IDs with a 24-pixel offset.

## Text editing

Add a heading (64 px, bold), subheading (36 px), or body text (22 px). New text is centered and selected. Add a text box uses the body preset.

The Properties panel updates the canvas immediately: content, six system font families, size, bold/italic, alignment, color picker/hex, opacity, rotation, and X/Y position. Invalid or incomplete numeric/hex entries remain drafts; leaving the field restores the last valid value. Font size accepts 1–1000 px.

Double-click or double-tap text to edit it through an HTML textarea positioned over the canvas with matching font, position, scale, alignment, and rotation. Enter commits, Shift+Enter inserts a newline, Escape restores the original text, and clicking outside commits. IME composition is not interrupted by Enter. The Konva text is hidden during inline editing and restored afterward.

Drag text to move it; use Transformer handles to resize and the top handle to rotate. Text width and font size remain base dimensions; scaleX/scaleY preserve the transformed size and height is automatically derived from text, width, and font metrics. Click an empty canvas area or press Escape to deselect.

## Shortcuts

- Delete / Backspace: delete selection.
- Ctrl+Z: undo.
- Ctrl+Shift+Z / Ctrl+Y: redo.
- Ctrl+C / Ctrl+V: copy and paste the selected element using the editor's in-memory clipboard.
- Ctrl+D: duplicate selection.
- Escape: deselect (or cancel inline editing).
- Ctrl+]: bring forward.
- Ctrl+[: send backward.
- Ctrl+Shift+]: bring to front.
- Ctrl+Shift+[: send to back.

Command is also supported on macOS. Form controls retain native typing and clipboard/undo behavior. Copies have new IDs, are offset by 24 document pixels, and become selected. Consecutive pastes cascade their offset.

## State and history

Zustand holds serializable elements in drawing order, a selected ID, an internal clipboard, and immutable past/future document snapshots. Konva nodes and HTML inputs stay outside the store.

A continuous interaction captures its starting document once. Live property/typing updates change the current elements without pushing history. Blur or the end of a slider gesture commits one snapshot; inline Escape restores the starting snapshot. Drag and transform results commit once on release. Discrete selections from dropdowns, style toggles, insertion, deletion, and duplication each produce a single step. Selection-only and no-op changes do not add history. Changed commits clear redo; cancellations preserve it. Undo/redo clear selection and retain at most 100 past snapshots.

## Export

Download exports only an opaque white 1080 × 1080 PNG. Transformer controls are temporarily hidden, any text being edited is included, and prior node visibility is restored in a finally block. The HTML editor and surrounding workspace are outside the Konva stage and cannot appear in the export. ResizeObserver scales the stage for display without changing document coordinates.

## Code organization

- `src/components/editor/Editor.tsx`: composition, keyboard and clipboard events.
- `TopBar.tsx` and `Sidebar.tsx`: original navigation and text creation controls.
- `PropertiesPanel.tsx` and `NumberField.tsx`: live property controls and numeric drafts.
- `Canvas.tsx`: scaled stage and inline text editing composition.
- `CanvasElement.tsx`: shared element interaction and transform commits.
- `TextElement.tsx` / `ShapeElement.tsx`: type-specific rendering.
- `SelectionTransformer.tsx`: shared selection controls above design elements.
- `ElementsPanel.tsx` / `ElementIcon.tsx`: shape creation and element icons.
- `LayersPanel.tsx`: ordering, pointer dragging, selection, lock, and visibility.
- `ShapeProperties.tsx` / `ColorField.tsx`: live shape controls.
- `InlineTextEditor.tsx`: positioned textarea and inline editing lifecycle.
- `Icon.tsx` and `editor.css`: icons and interface styling.
- `src/store/editorStore.ts`: mutations, clipboard, interaction transactions, history.
- `src/types/editor.ts`: shared base and text variant; add future concrete variants to EditorElement when their tools are implemented.
- `src/utils/exportCanvas.ts`: PNG export.
- `tests/editorStore.test.mjs`: presets, editing round-trips, grouped history, cancellation, duplication, deletion, and history limits.

## Current limits

Documents, history, and copied elements live in this tab's memory and reset on refresh. Pasting formatted design elements across tabs or applications is not implemented. Text styling applies to a whole element rather than individual words. Fonts use the operating system's installed families and fallback fonts. There is no backend, remote storage, authentication, images, logical groups, multi-select, templates, or sharing yet. Layer renaming is not exposed yet. Lines/arrows are straight segments, and circles can be resized into ellipses. Layer edge scrolling progresses with pointer movement. The existing Vite bundle-size warning remains non-blocking.

## Suggested Milestone 4

Add local save/load and automatic draft recovery with a versioned JSON document format and validation. This protects work across refreshes before introducing any backend. Layer renaming and alignment/snapping would be useful follow-ups.

## Milestone 3 validation

Build/TypeScript and Oxlint pass. All 13 regression tests pass (the seven text/history tests plus six shapes/layers tests). Browser checks cover shape creation, rectangle/arrow resizing, rotation, lock protection, inline text editing, live layer reorder with one-step undo/redo, and ordering shortcuts. An exported PNG was inspected at 1080 × 1080 with correct stacking and hidden elements/controls excluded.
