import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { databasePool } from '../config';
import { mysqlRepository } from '../mysqlRepository';
import { createDocument } from '../../src/services/documentFormat';

test('MySQL integration: ownership, JSON round-trip, duplicate email, sessions, update and delete',
  {skip:process.env.MYSQL_INTEGRATION !== '1'},async()=>{
  const pool=databasePool();const repository=mysqlRepository(pool);
  const user={id:randomUUID(),email:`integration-${randomUUID()}@example.com`,password_hash:'test-only'};
  const other={id:randomUUID(),email:`integration-${randomUUID()}@example.com`,password_hash:'test-only'};
  try {
    assert.equal(await repository.createUser(user),true);assert.equal(await repository.createUser(other),true);
    assert.equal(await repository.createUser({...user,id:randomUUID()}),false);
    const doc=createDocument();await repository.createProject(user.id,doc);
    assert.deepEqual(await repository.getProject(user.id,doc.id),doc);
    assert.equal(await repository.getProject(other.id,doc.id),null);
    assert.deepEqual(await repository.listProjects(other.id),[]);
    assert.equal((await repository.listProjects(user.id)).length,1);
    assert.equal(await repository.updateProject(other.id,{...doc,name:'Attack'}),false);
    assert.equal(await repository.deleteProject(other.id,doc.id),false);
    assert.equal(await repository.updateProject(user.id,{...doc,name:'Renamed'}),true);
    assert.equal((await repository.getProject(user.id,doc.id))!.name,'Renamed');
    const token=randomUUID().replaceAll('-','').padEnd(64,'0');
    await repository.createSession(token,user.id,new Date(Date.now()+60000));
    assert.equal((await repository.userBySession(token))!.id,user.id);
    await repository.deleteSession(token);assert.equal(await repository.userBySession(token),null);
    assert.equal(await repository.deleteProject(user.id,doc.id),true);
  } finally {
    await pool.execute('DELETE FROM users WHERE id IN (?,?)',[user.id,other.id]);await pool.end();
  }
});
