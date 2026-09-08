import assert from 'node:assert/strict';
import {test} from 'node:test';
import {importTs} from './loadTs.mjs';
const {resolveRoute,routeDestination}=await importTs('../src/utils/routes.ts');
test('public routes stay public, including with a restored session',()=>{
  for(const path of ['/','/privacy','/terms'])for(const authenticated of [true,false])assert.equal(routeDestination(resolveRoute(path),authenticated),path);
});
test('editor requires login and authenticated auth routes lead to editor',()=>{
  assert.equal(routeDestination('/editor',false),'/login');
  for(const path of ['/login','/register','/editor'])assert.equal(routeDestination(path,true),'/editor');
  assert.equal(routeDestination('/register',false),'/register');
});
test('trailing slashes resolve and unknown routes have a not-found page',()=>{
  assert.equal(resolveRoute('/register/'),'/register');assert.equal(resolveRoute('/missing'),'/not-found');
});
