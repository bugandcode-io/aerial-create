import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { importTs } from './loadTs.mjs';
const { createDocument, serializeDocument, deserializeDocument } = await importTs('../src/services/documentFormat.ts');
const { createLocalDocumentStorage, ACTIVE_DOCUMENT_KEY, documentKey } = await importTs('../src/services/documentStorage.ts');
const { createDocumentPersistence } = await importTs('../src/services/documentPersistence.ts');
const { useEditorStore: store } = await importTs('../src/store/editorStore.ts');
const get = store.getState;
beforeEach(() => { store.setState(store.getInitialState(), true); get().loadDocument(createDocument()); });
function memoryStorage() {
  const data = new Map(); let writes = 0;
  const storage = createLocalDocumentStorage(() => ({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); writes++; },
    removeItem: (key) => data.delete(key),
  }));
  return { data, storage, writes: () => writes };
}
function populated() {
  get().addText('heading'); get().addShape('rectangle'); get().addShape('circle'); get().addShape('line'); get().addShape('triangle'); get().addShape('arrow');
  const ids = get().elements.map((element) => element.id);
  get().toggleLocked(ids[1]); get().toggleVisible(ids[2]); get().reorder(ids[0], 5);
  get().renameDocument('Recovered design');
  return get().getDocument();
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('version 1 serialization round-trips every element without UI state', () => {
  const document = populated();
  const json = serializeDocument({ ...document, selectedId:'excluded', past:[document.elements], clipboard:document.elements[0] });
  assert.deepEqual(deserializeDocument(json), document);
  for (const key of ['selectedId','past','future','clipboard','interactionStart','zoom']) assert.equal(Object.hasOwn(JSON.parse(json), key), false);
});

test('version and structural validation reject malformed input without coercion', () => {
  const document = populated();
  for (const input of ['{bad', 'null', '[]', '{}', JSON.stringify({ ...document, version:2 }), JSON.stringify({ ...document, version:'1' })]) assert.throws(() => deserializeDocument(input));
  for (const patch of [{name:null},{width:0},{height:1.2},{background:{type:'solid',color:'invalid'}},{createdAt:'yesterday'},{elements:[document.elements[0],document.elements[0]]}]) {
    assert.throws(() => deserializeDocument(JSON.stringify({ ...document, ...patch })));
  }
  const text = document.elements.find((element) => element.type === 'text');
  for (const patch of [{fontStyle:['bold']},{visible:'false'},{scaleX:0},{type:'image'},{opacity:2},{fontSize:null},{align:['left']}]) {
    assert.throws(() => deserializeDocument(JSON.stringify({ ...document, elements:[{ ...text, ...patch }] })));
  }
});

test('local save/load and clear use the document ID', () => {
  const { storage, data } = memoryStorage(); const document = populated();
  storage.saveDocument(document); assert.equal(data.get(ACTIVE_DOCUMENT_KEY),document.id);
  assert.deepEqual(storage.loadDocument(),document);
  storage.clearDocument(); assert.equal(storage.loadDocument(),null);
  assert.equal(data.has(documentKey(document.id)),false);
});

test('corrupted and unsupported local drafts recover blank without overwriting their records', () => {
  for (const raw of ['{bad', JSON.stringify({version:99}), JSON.stringify({version:1})]) {
    const { storage,data } = memoryStorage();
    data.set(ACTIVE_DOCUMENT_KEY,'broken'); data.set(documentKey('broken'),raw);
    const warnings = [];
    const session = createDocumentPersistence(store,storage,{onWarning:(message)=>warnings.push(message)});
    assert.equal(get().elements.length,0); assert.equal(get().document.width,1080);
    assert.equal(get().document.name,'Untitled Design'); assert.equal(warnings.length,1);
    session.flush(); assert.equal(data.get(documentKey('broken')),raw); session.dispose();
  }
});

test('reload recovery preserves dimensions, name, order, visibility and locks with clean UI state', () => {
  const { storage } = memoryStorage(); const document = populated();
  document.width=1200; document.height=700; document.background.color='#f0f0f0';
  storage.saveDocument(document); get().copySelected();
  const session = createDocumentPersistence(store,storage);
  assert.deepEqual(get().getDocument(),document);
  assert.equal(get().selectedId,null); assert.equal(get().clipboard,null);
  assert.deepEqual(get().past,[]); assert.deepEqual(get().future,[]);
  assert.equal(get().interactionStart,null); session.dispose();
});

test('rename autosaves and transient selection/copy do not write', async () => {
  const { storage,writes } = memoryStorage(); const states=[];
  const session = createDocumentPersistence(store,storage,{debounceMs:10,onStatus:(value)=>states.push(value)});
  session.flush(); const count=writes();
  get().select(null); get().copySelected(); await wait(25); assert.equal(writes(),count);
  const createdAt=get().document.createdAt;
  get().renameDocument('Renamed'); await wait(25);
  assert.equal(storage.loadDocument().name,'Renamed'); assert.equal(get().document.createdAt,createdAt);
  assert.ok(states.includes('Saving...')); assert.equal(states.at(-1),'Saved');
  assert.equal(get().document.updatedAt,storage.loadDocument().updatedAt); session.dispose();
});

test('continuous edits defer writes until commit and debounce multiple changes', async () => {
  const {storage,writes}=memoryStorage(); const session=createDocumentPersistence(store,storage,{debounceMs:10});
  get().addShape('rectangle'); session.flush(); const count=writes();
  const id=get().selectedId;
  get().beginInteraction();
  for(let x=0;x<50;x++)get().updateTransform(id,{x});
  await wait(25); assert.equal(writes(),count);
  get().commitInteraction(); await wait(25); assert.equal(writes(),count+2);
  assert.equal(storage.loadDocument().elements[0].x,49); session.dispose();
});

test('page-exit flush saves pending live edits without serializing their transaction', () => {
  const {storage}=memoryStorage(); const session=createDocumentPersistence(store,storage);
  get().addText('body'); get().beginInteraction(); get().updateText(get().selectedId,{text:'Last keystroke'});
  assert.equal(session.flush(),true); assert.equal(storage.loadDocument().elements[0].text,'Last keystroke');
  assert.equal(Object.hasOwn(storage.loadDocument(),'interactionStart'),false); session.dispose();
});

test('New saves the latest old design and opens a unique blank document', () => {
  const {storage,data}=memoryStorage(); const session=createDocumentPersistence(store,storage);
  const previous=populated(); session.newDocument(); const current=get().getDocument();
  assert.notEqual(current.id,previous.id); assert.equal(current.name,'Untitled Design');
  assert.equal(current.width,1080); assert.deepEqual(current.elements,[]); assert.deepEqual(get().past,[]);
  assert.deepEqual(deserializeDocument(data.get(documentKey(previous.id))).elements,previous.elements);
  assert.equal(storage.loadDocument().id,current.id); session.dispose();
});

test('valid imports load exactly; invalid imports preserve the open design and storage', () => {
  const {storage}=memoryStorage(); const session=createDocumentPersistence(store,storage);
  const document=populated(); document.id=createDocument().id;
  document.width=900; document.height=600;
  session.importDocument(serializeDocument(document)); assert.deepEqual(get().getDocument(),document);
  assert.deepEqual(get().past,[]);
  const before=storage.loadDocument();
  assert.throws(()=>session.importDocument('{nope')); assert.deepEqual(get().getDocument(),document);
  assert.deepEqual(storage.loadDocument(),before); session.dispose();
});

test('failed storage writes leave changes unsaved and block New/Import from clearing the editor', () => {
  const states=[];
  const storage={loadDocument:()=>null,saveDocument:()=>{throw new Error('Quota exceeded');},clearDocument:()=>{}};
  const session=createDocumentPersistence(store,storage,{onStatus:(value)=>states.push(value)});
  const document=populated(); assert.equal(session.flush(),false); assert.equal(states.at(-1),'Unsaved changes');
  assert.throws(()=>session.newDocument()); assert.deepEqual(get().getDocument(),document);
  assert.throws(()=>session.importDocument(serializeDocument(createDocument()))); assert.deepEqual(get().getDocument(),document);
  session.dispose();
});
