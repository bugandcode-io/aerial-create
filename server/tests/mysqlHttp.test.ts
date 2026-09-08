import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { RowDataPacket } from 'mysql2/promise';
import argon2 from 'argon2';
import { databasePool, configFromEnv } from '../config';
import { createDocument } from '../../src/services/documentFormat';

test('real MySQL HTTP: registration, Argon2id, ownership, session and projects survive API restart',
  {skip:process.env.MYSQL_INTEGRATION !== '1',timeout:120000},async()=>{
  const config=configFromEnv();const pool=databasePool();
  const emails=[`e2e-a-${randomUUID()}@example.com`,`e2e-b-${randomUUID()}@example.com`];
  const password=`Test-only-${randomUUID()}`;
  let child:ChildProcess | undefined;let base='';
  const stop=async()=>{
    const current=child;if(!current)return;child=undefined;
    if(current.exitCode!==null)return;
    await new Promise<void>((resolve,reject)=>{
      const timeout=setTimeout(()=>{current.kill();reject(new Error('API shutdown timed out'));},10000);
      current.once('exit',()=>{clearTimeout(timeout);resolve();});current.send('stop');
    });
  };
  const start=async()=>{
    child=fork(fileURLToPath(new URL('./mysqlApiChild.ts',import.meta.url)),[],{execArgv:['--import','tsx'],silent:true});
    const current=child;
    const port=await new Promise<number>((resolve,reject)=>{
      const timeout=setTimeout(()=>{current.kill();reject(new Error('API startup timed out'));},20000);
      current.once('error',()=>{clearTimeout(timeout);reject(new Error('API process failed'));});
      current.once('exit',()=>{clearTimeout(timeout);reject(new Error('API exited before startup'));});
      current.once('message',(message:unknown)=>{
        clearTimeout(timeout);
        if(message && typeof message==='object' && 'port' in message && typeof message.port==='number')resolve(message.port);
        else reject(new Error('API could not connect to MySQL.'));
      });
    });
    base=`http://127.0.0.1:${port}`;
  };
  const request=(path:string,method='GET',body?:unknown,cookie='')=>fetch(base+path,{
    method,headers:{Origin:config.origin,'Content-Type':'application/json','X-Aerial-Request':'1',Cookie:cookie},
    body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000),
  });
  try {
    const [tls]=await pool.query<RowDataPacket[]>("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
    if(config.database.ssl)assert.ok(tls[0]?.Value,'Remote connection must use TLS');
    await start();
    const cookies:string[]=[];const ids:string[]=[];
    for(const email of emails) {
      const response=await request('/api/auth/register','POST',{email,password});assert.equal(response.status,201);
      const body=await response.json();assert.deepEqual(Object.keys(body.user).sort(),['email','id']);ids.push(body.user.id);
      const cookie=response.headers.get('set-cookie')!;assert.match(cookie,/HttpOnly/);cookies.push(cookie.split(';')[0]);
      const [rows]=await pool.execute<RowDataPacket[]>('SELECT password_hash FROM users WHERE id=?',[body.user.id]);
      assert.equal(rows.length,1);assert.match(rows[0].password_hash,/^\$argon2id\$/);
      assert.equal(await argon2.verify(rows[0].password_hash,password),true);
      assert.notEqual(rows[0].password_hash,password);
    }
    assert.equal((await request('/api/auth/register','POST',{email:emails[0],password})).status,409);
    assert.equal((await request('/api/auth/login','POST',{email:emails[0],password:'wrong-password-12345'})).status,401);
    assert.equal((await request('/api/projects')).status,401);
    const docs=[createDocument(),createDocument()];
    for(let i=0;i<2;i++) {
      assert.equal((await request('/api/projects','POST',docs[i],cookies[i])).status,201);
      const edited={...docs[i],name:`Verified project ${i}`,background:{type:'solid',color:'#123456'}};
      const result=await request(`/api/projects/${docs[i].id}`,'PUT',edited,cookies[i]);assert.equal(result.status,200);
      docs[i]=await result.json();
      const list=await (await request('/api/projects','GET',undefined,cookies[i])).json();
      assert.deepEqual(list.projects.map((project:{id:string})=>project.id),[docs[i].id]);
    }
    for(let i=0;i<2;i++)for(const method of ['GET','PUT','DELETE']) {
      const foreign=docs[1-i];
      assert.equal((await request(`/api/projects/${foreign.id}`,method,method==='PUT'?foreign:undefined,cookies[i])).status,404);
    }
    assert.equal((await request('/api/projects','POST',{...createDocument(),version:99},cookies[0])).status,400);
    assert.equal((await request('/api/projects/nonexistent','GET',undefined,cookies[0])).status,404);
    await stop();await start();
    for(let i=0;i<2;i++) {
      const me=await request('/api/auth/me','GET',undefined,cookies[i]);assert.equal(me.status,200);
      assert.equal((await me.json()).user.id,ids[i]);
      assert.deepEqual(await (await request(`/api/projects/${docs[i].id}`,'GET',undefined,cookies[i])).json(),docs[i]);
    }
    const login=await request('/api/auth/login','POST',{email:emails[0],password},cookies[0]);assert.equal(login.status,200);
    const previousCookie=cookies[0];cookies[0]=login.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await request('/api/auth/me','GET',undefined,previousCookie)).status,401);
    for(let i=0;i<2;i++) {
      assert.equal((await request(`/api/projects/${docs[i].id}`,'DELETE',undefined,cookies[i])).status,204);
      assert.equal((await request(`/api/projects/${docs[i].id}`,'GET',undefined,cookies[i])).status,404);
      assert.equal((await request('/api/auth/logout','POST',undefined,cookies[i])).status,204);
      assert.equal((await request('/api/auth/me','GET',undefined,cookies[i])).status,401);
    }
  } finally {
    try {await stop();} finally {
      try {await pool.execute('DELETE FROM users WHERE email IN (?,?)',emails);} finally {await pool.end();}
    }
  }
});
