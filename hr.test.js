import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHR} from './hr.js';
test('HR permissions, attendance, payouts and durable records',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'trustdesk-hr-'));let route=await createHR(dir);
 async function call(path,{admin=false,key='',method='POST',data={}}={}){let response;await route({method,headers:{authorization:'Bearer '+key}},{},new URL('http://local/api/hr/'+path),{admin,body:async()=>data,json:(_,status,value)=>response={status,value}});return response}
 assert.equal((await call('overview',{method:'GET'})).status,401);
 const a=await call('employees',{admin:true,data:{name:'Test A',code:'A'}});assert.equal(a.status,200);const key=a.value.accessKey,id=a.value.id;
 assert.equal((await call('employees',{admin:true,data:{name:'Duplicate',code:'a'}})).status,409);
 assert.equal((await call('overview',{key,method:'GET'})).status,403);
 assert.equal((await call('punch',{key,data:{action:'in'}})).status,400);
 const data={action:'in',consent:true,location:{latitude:28.7,longitude:77.1,accuracy:20,timestamp:Date.now()}};
 const results=await Promise.all([call('punch',{key,data}),call('punch',{key,data})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal((await call('punch',{key,data:{...data,action:'out'}})).status,200);
 assert.equal((await call('punch',{key,data:{...data,action:'out'}})).status,409);
 assert.equal((await call('payouts',{key,data:{}})).status,403);
 const p=await call('payouts',{admin:true,data:{employeeId:id,month:'2026-11',amountPaise:10000,note:'Reviewed'}});assert.equal(p.status,200);
 assert.equal((await call('payout-action',{admin:true,data:{id:p.value.id,action:'record-paid',reference:'x'}})).status,409);
 assert.equal((await call('payout-action',{admin:true,data:{id:p.value.id,action:'approve'}})).status,200);
 assert.equal((await call('payout-action',{admin:true,data:{id:p.value.id,action:'record-paid',reference:'TEST-ONLY'}})).status,200);
 route=await createHR(dir);const overview=await call('overview',{admin:true,method:'GET'});assert.equal(overview.value.sessions.length,1);assert.equal(overview.value.payouts[0].status,'paid_recorded');assert.equal(JSON.stringify(overview).includes('tokenHash'),false);
 assert.equal((await readFile(join(dir,'hr.json'),'utf8')).includes(key),false);
 await call('rotate-key',{admin:true,data:{employeeId:id}});assert.equal((await call('me',{key,method:'GET'})).status,401);
});
