import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app';
import { memoryRepository } from './memoryRepository';
import { createDocument } from '../../src/services/documentFormat';
const origin='http://127.0.0.1:5173';
test('HTTP auth, sessions, validation, and ownership across every project operation',async t=>{
  const repository=memoryRepository();
  const server=createApp(repository,{secret:'test-only-secret-with-more-than-32-characters',origin,production:false}).listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request=async(path:string,method='GET',body?:unknown,cookie='',headers:Record<string,string>={})=>fetch(base+path,{
    method,headers:{Origin:origin,'Content-Type':'application/json','X-Aerial-Request':'1',Cookie:cookie,...headers},body:body===undefined?undefined:JSON.stringify(body),
  });
  const register=async(email:string)=>{
    const response=await request('/api/auth/register','POST',{email,password:'correct horse battery staple'});
    assert.equal(response.status,201);const json=await response.json();
    assert.deepEqual(Object.keys(json.user).sort(),['email','id']);
    const header=response.headers.get('set-cookie')!;
    assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Lax/);
    return {cookie:header.split(';')[0],user:json.user};
  };
  assert.equal((await request('/api/projects')).status,401);
  assert.equal((await request('/api/auth/me')).status,401);
  assert.equal((await request('/api/auth/register','POST',{email:'bad',password:'short'})).status,400);
  assert.equal((await request('/api/auth/register','POST',{},'',{Origin:'https://evil.invalid'})).status,403);
  const alice=await register('Alice@example.com');const bob=await register('bob@example.com');
  assert.equal(alice.user.email,'alice@example.com');
  const stored=await repository.userByEmail('alice@example.com');
  assert.match(stored!.password_hash,/^\$argon2id\$/);assert.notEqual(stored!.password_hash,'correct horse battery staple');
  assert.equal((await request('/api/auth/register','POST',{email:'ALICE@example.com',password:'correct horse battery staple'})).status,409);
  const wrong=await request('/api/auth/login','POST',{email:'alice@example.com',password:'incorrect password'});
  const missing=await request('/api/auth/login','POST',{email:'missing@example.com',password:'incorrect password'});
  assert.equal(wrong.status,401);assert.deepEqual(await wrong.json(),await missing.json());
  assert.equal((await request('/api/auth/me','GET',undefined,alice.cookie)).status,200);
  const login=await request('/api/auth/login','POST',{email:'alice@example.com',password:'correct horse battery staple'},alice.cookie);
  assert.equal(login.status,200);const newCookie=login.headers.get('set-cookie')!.split(';')[0];
  assert.notEqual(newCookie,alice.cookie);assert.equal((await request('/api/auth/me','GET',undefined,alice.cookie)).status,401);
  alice.cookie=newCookie;
  const doc=createDocument();doc.name='Owned project';
  assert.equal((await request('/api/projects','POST',doc)).status,401);
  assert.equal((await request('/api/projects','POST',{...doc,user_id:bob.user.id},alice.cookie)).status,400);
  assert.equal((await request('/api/projects','POST',{...doc,version:99},alice.cookie)).status,400);
  const created=await request('/api/projects','POST',doc,alice.cookie);assert.equal(created.status,201);
  const saved=await created.json();
  assert.equal((await request('/api/projects','POST',doc,alice.cookie)).status,409);
  assert.equal((await (await request('/api/projects','GET',undefined,alice.cookie)).json()).projects.length,1);
  assert.equal((await (await request('/api/projects','GET',undefined,bob.cookie)).json()).projects.length,0);
  assert.deepEqual(await (await request(`/api/projects/${doc.id}`,'GET',undefined,alice.cookie)).json(),saved);
  for(const method of ['GET','PUT','DELETE']) {
    assert.equal((await request(`/api/projects/${doc.id}`,method,method==='PUT'?doc:undefined,bob.cookie)).status,404);
    assert.equal((await request('/api/projects/nonexistent',method,method==='PUT'?{...doc,id:'nonexistent'}:undefined,alice.cookie)).status,404);
  }
  assert.equal((await request('/api/projects','POST',doc,bob.cookie)).status,409);
  assert.equal((await request('/api/projects','GET',undefined,alice.cookie,{'X-Aerial-User':bob.user.id})).status,409);
  assert.equal((await request(`/api/projects/${doc.id}`,'PUT',{...doc,id:'different'},alice.cookie)).status,400);
  assert.equal((await request(`/api/projects/${doc.id}`,'PUT',{...doc,name:'Renamed'},alice.cookie,{'X-Aerial-Request':''})).status,403);
  const updated=await request(`/api/projects/${doc.id}`,'PUT',{...doc,name:'Renamed'},alice.cookie);assert.equal(updated.status,200);
  assert.equal((await updated.json()).name,'Renamed');
  assert.equal((await request(`/api/projects/${doc.id}`,'DELETE',undefined,alice.cookie)).status,204);
  assert.equal((await request(`/api/projects/${doc.id}`,'GET',undefined,alice.cookie)).status,404);
  assert.equal((await request('/api/auth/logout','POST',undefined,alice.cookie)).status,204);
  assert.equal((await request('/api/auth/me','GET',undefined,alice.cookie)).status,401);
});
