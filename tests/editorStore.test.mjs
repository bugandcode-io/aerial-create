import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { importTs } from './loadTs.mjs';
const { useEditorStore: store } = await importTs('../src/store/editorStore.ts');
const get = store.getState;
beforeEach(() => store.setState(store.getInitialState(), true));
const add = () => { get().addText('heading'); return get().selectedId; };

test('presets are centered and selected with distinct IDs', () => {
  for (const [preset, size] of [['heading', 64], ['subheading', 36], ['body', 22]]) {
    get().addText(preset);
    const element = get().elements.at(-1);
    assert.equal(element.fontSize, size);
    assert.equal(element.id, get().selectedId);
    assert.ok(element.y > 480 && element.y < 600);
  }
  assert.equal(new Set(get().elements.map((e) => e.id)).size, 3);
});

test('every supported edit round-trips through undo and redo', () => {
  const id = add();
  for (const patch of [
    { x: 211, y: 310 }, { scaleX: 1.8, scaleY: 1.3, width: 700 },
    { rotation: 32 }, { text: 'Two\nlines' }, { fontFamily: 'Georgia' },
    { fontSize: 45 }, { fontStyle: 'bold italic' }, { fill: '#abcdef' },
    { opacity: 0.3 }, { align: 'right' },
  ]) {
    const before = get().elements;
    get().updateText(id, patch);
    const after = get().elements;
    get().undo(); assert.deepEqual(get().elements, before);
    get().redo(); assert.deepEqual(get().elements, after);
  }
});

test('many live updates form one undo step on commit', () => {
  const id = add();
  get().beginInteraction();
  for (let value = 0; value <= 100; value++) get().updateText(id, { opacity: value / 200 });
  assert.equal(get().past.length, 1);
  assert.equal(get().elements[0].opacity, 0.5);
  get().commitInteraction(); assert.equal(get().past.length, 2);
  get().undo(); assert.equal(get().elements[0].opacity, 1);
  get().redo(); assert.equal(get().elements[0].opacity, 0.5);
});

test('cancel restores text and preserves existing redo history', () => {
  const id = add();
  get().updateText(id, { text: 'Future' }); get().undo();
  get().beginInteraction(); get().updateText(id, { text: 'Cancelled' }); get().cancelInteraction();
  assert.equal(get().elements[0].text, 'Add a heading');
  assert.equal(get().future.length, 1);
  get().redo(); assert.equal(get().elements[0].text, 'Future');
});

test('no-op interactions preserve redo; changed interactions clear it', () => {
  const id = add();
  get().updateText(id, { x: 240 }); get().undo();
  get().beginInteraction(); get().updateText(id, { x: 180 }); get().updateText(id, { x: 140 }); get().commitInteraction();
  assert.equal(get().future.length, 1);
  get().beginInteraction(); get().updateText(id, { x: 300 }); get().commitInteraction();
  assert.equal(get().future.length, 0);
});

test('duplicate and paste retain styles, offset, and select unique copies', () => {
  const id = add();
  get().updateText(id, { opacity: 0.4, rotation: 25, fontStyle: 'bold italic' });
  get().copySelected(); get().duplicateSelected();
  const duplicate = get().elements[1];
  assert.notEqual(duplicate.id, id); assert.equal(duplicate.id, get().selectedId);
  assert.equal(duplicate.x, 164); assert.equal(duplicate.opacity, 0.4);
  get().paste(); get().paste();
  assert.equal(get().elements.at(-1).x, 188);
  assert.equal(new Set(get().elements.map((e) => e.id)).size, 4);
  get().deleteSelected(); assert.equal(get().elements.length, 3);
  get().undo(); assert.equal(get().elements.length, 4);
});

test('undo commits pending edits and history is bounded', () => {
  const id = add();
  get().beginInteraction(); get().updateText(id, { text: 'Pending' }); get().undo();
  assert.equal(get().elements[0].text, 'Add a heading');
  assert.equal(get().interactionStart, null);
  for (let x = 0; x < 110; x++) get().updateText(id, { x });
  assert.equal(get().past.length, 100);
});

test('all shape variants have usable defaults and unique readable names', () => {
  for (const type of ['rectangle', 'circle', 'line', 'triangle', 'arrow']) {
    get().addShape(type);
    const element = get().elements.at(-1);
    assert.equal(element.type, type);
    assert.equal(element.name, type[0].toUpperCase() + type.slice(1));
    assert.equal(element.id, get().selectedId);
    assert.equal(element.visible, true);
    assert.equal(element.locked, false);
    assert.equal(element.width, 300);
    assert.equal(element.opacity, 1);
    if (type === 'arrow') assert.equal(element.pointerLength, 24);
  }
  get().addShape('rectangle');
  assert.equal(get().elements.at(-1).name, 'Rectangle 2');
  assert.equal(new Set(get().elements.map((element) => element.id)).size, 6);
});

test('all four order actions operate on document stacking order and no-op at boundaries', () => {
  get().addShape('rectangle'); get().addShape('circle'); get().addShape('triangle');
  const [a,b,c] = get().elements.map((element) => element.id);
  const ids = () => get().elements.map((element) => element.id);
  get().select(b); get().moveSelected('front'); assert.deepEqual(ids(), [a,c,b]);
  get().moveSelected('back'); assert.deepEqual(ids(), [b,a,c]);
  get().moveSelected('forward'); assert.deepEqual(ids(), [a,b,c]);
  get().moveSelected('backward'); assert.deepEqual(ids(), [b,a,c]);
  const count = get().past.length;
  get().moveSelected('backward'); assert.equal(get().past.length, count);
  get().undo(); assert.deepEqual(ids(), [a,b,c]);
  get().redo(); assert.deepEqual(ids(), [b,a,c]);
});

test('drag reorder previews immediately and commits one reversible history step', () => {
  for (const type of ['rectangle','circle','triangle','arrow']) get().addShape(type);
  const original = get().elements;
  const id = original[0].id;
  get().beginInteraction(); get().reorder(id, 1); get().reorder(id, 2); get().reorder(id, 3);
  assert.equal(get().elements.at(-1).id, id);
  assert.equal(get().past.length, 4);
  get().commitInteraction(); assert.equal(get().past.length, 5);
  const reordered = get().elements;
  get().undo(); assert.deepEqual(get().elements, original);
  get().redo(); assert.deepEqual(get().elements, reordered);
  get().beginInteraction(); get().reorder(id,0); get().cancelInteraction();
  assert.deepEqual(get().elements, reordered);
});

test('visibility stays in layers and undo/redo restores visibility', () => {
  get().addShape('circle'); const id = get().selectedId;
  get().toggleVisible(id);
  assert.equal(get().elements.length, 1);
  assert.equal(get().elements[0].visible, false);
  get().undo(); assert.equal(get().elements[0].visible, true);
  get().redo(); assert.equal(get().elements[0].visible, false);
  get().toggleVisible(id); assert.equal(get().elements[0].visible, true);
});

test('locks protect text and shapes from transforms, property edits, and deletion', () => {
  for (const type of ['text','rectangle','arrow']) {
    if (type === 'text') get().addText('heading'); else get().addShape(type);
    const id = get().selectedId;
    get().toggleLocked(id);
    const original = get().elements;
    const count = get().past.length;
    get().updateText(id, { text:'Blocked' }); get().updateShape(id, { width:999 });
    get().updateArrow(id, { pointerWidth:77 });
    get().updateTransform(id, { x:999, rotation:90, scaleX:2, opacity:0.1 });
    get().deleteSelected();
    assert.deepEqual(get().elements, original);
    assert.equal(get().past.length, count);
    get().select(id); assert.equal(get().selectedId, id);
    get().undo(); assert.equal(get().elements.at(-1).locked, false);
    get().redo(); assert.equal(get().elements.at(-1).locked, true);
    get().toggleLocked(id); get().select(id); get().deleteSelected();
    assert.equal(get().elements.some((element) => element.id === id), false);
  }
});

test('shape styles, geometry, arrow options, duplication and paste round-trip', () => {
  get().addShape('arrow'); const id = get().selectedId;
  get().beginInteraction();
  get().updateShape(id, { width:450, stroke:'#123456', strokeWidth:8 });
  get().updateTransform(id, { x:123, y:456, rotation:45, opacity:0.7 });
  get().updateArrow(id, { pointerWidth:40, pointerLength:30 });
  get().commitInteraction();
  const styled = get().elements[0];
  get().copySelected(); get().duplicateSelected();
  assert.equal(get().elements.at(-1).name, 'Arrow 2');
  assert.equal(get().elements.at(-1).pointerWidth, 40);
  get().paste(); const copy = get().elements.at(-1);
  assert.equal(copy.name, 'Arrow 3'); assert.equal(copy.x, styled.x + 24);
  get().undo(); assert.equal(get().elements.length, 2);
  get().redo(); assert.deepEqual(get().elements.at(-1), copy);
  get().toggleVisible(copy.id); get().toggleLocked(copy.id); get().select(copy.id); get().copySelected(); get().paste();
  assert.equal(get().elements.at(-1).visible, false);
  assert.equal(get().elements.at(-1).locked, true);
});


