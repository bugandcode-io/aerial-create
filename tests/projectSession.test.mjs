import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { importTs } from './loadTs.mjs';
const { createDocument } = await importTs('../src/services/documentFormat.ts');
const { createDocumentPersistence } = await importTs('../src/services/documentPersistence.ts');
const { createProjectSession } = await importTs('../src/services/projectSession.ts');
const { userDocumentStorage } = await importTs('../src/services/documentStorage.ts');
const { ApiError } = await importTs('../src/services/api.ts');
const { useEditorStore:store } = await importTs('../src/store/editorStore.ts');
const get=store.getState;
beforeEach(()=>get().loadDocument(createDocument()));
function environment() {
  const data=new Map();
  const access=()=>({getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),get length(){return data.size;},key:i=>[...data.keys()][i]??null});
  const storage=userDocumentStorage('alice',access);
  const local=createDocumentPersistence(store,storage);
  const saved=new Map();
  const remote={list:async()=>[...saved.values()],load:async id=>{if(!saved.has(id))throw new ApiError(404,'Missing');return structuredClone(saved.get(id));},
    create:async doc=>{saved.set(doc.id,structuredClone(doc));return doc;},update:async doc=>{saved.set(doc.id,structuredClone(doc));return doc;},remove:async id=>{saved.delete(id);}};
  return {data,access,storage,local,saved,remote,project:createProjectSession(store,local,storage,remote)};
}
test('local recovery keys isolate accounts and preserve legacy data',()=>{
  const e=environment();e.data.set('aerial-create:active-document','legacy');
  get().addText('heading');e.local.flush();
  const alice=e.storage.loadDocument();
  const bob=userDocumentStorage('bob',e.access);assert.equal(bob.loadDocument(),null);assert.equal(bob.listDocuments().documents.length,0);
  bob.saveDocument(createDocument());assert.deepEqual(e.storage.loadDocument(),alice);
  assert.equal(e.data.get('aerial-create:active-document'),'legacy');e.local.dispose();
});
test('remote create/update/open preserves previous edits and resets transient state',async()=>{
  const e=environment();try{
    get().addShape('circle');await e.project.save();const first=get().document.id;
    get().renameDocument('Renamed');await e.project.save();assert.equal(e.saved.get(first).name,'Renamed');
    const target=createDocument();target.name='Remote';e.saved.set(target.id,target);
    get().copySelected();get().beginInteraction();get().updateTransform(get().selectedId,{x:123});
    await e.project.open(target.id);
    assert.equal(e.saved.get(first).elements[0].x,123);assert.equal(get().document.id,target.id);
    assert.equal(get().selectedId,null);assert.equal(get().clipboard,null);assert.equal(get().interactionStart,null);
    assert.deepEqual(get().past,[]);assert.deepEqual(get().future,[]);
    assert.equal(e.storage.loadDocument().id,target.id);
  }finally{e.local.dispose();}
});
test('failed remote save blocks switching and retains recovery',async()=>{
  const e=environment();try{
    get().addText('body');const current=get().getDocument();const target=createDocument();e.saved.set(target.id,target);
    e.remote.create=async()=>{throw new Error('Offline');};
    const project=createProjectSession(store,e.local,e.storage,e.remote);
    await assert.rejects(project.open(target.id),/Offline/);
    assert.equal(get().document.id,current.id);assert.deepEqual(e.storage.loadDocument().elements,current.elements);
  }finally{e.local.dispose();}
});
test('new, import, and delete retain independent IDs and recovery baseline',async()=>{
  const e=environment();try{
    get().addText('body');const original=get().document.id;
    await e.project.newDocument();assert.ok(e.saved.has(original));assert.ok(e.saved.has(get().document.id));
    const imported=createDocument();await e.project.importDocument(JSON.stringify(imported));
    assert.notEqual(get().document.id,imported.id);const id=get().document.id;
    await e.project.remove(id);assert.equal(e.saved.has(id),false);assert.notEqual(get().document.id,id);
    assert.equal(e.storage.loadDocument().id,get().document.id);assert.deepEqual(get().past,[]);
  }finally{e.local.dispose();}
});
