import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';

const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const clean=(s,max=100)=>typeof s==='string'&&s.trim()&&s.trim().length<=max?s.trim():fail('Please enter valid text');
const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000?n:fail('Amount must be whole paise, from 0 to 10 lakh rupees');
export async function createHR(dir){
  await mkdir(dir,{recursive:true});const file=join(dir,'hr.json');
  let state={version:1,employees:[],sessions:[],payouts:[],audit:[]};
  try{state=JSON.parse(await readFile(file,'utf8'));if(state.version!==1||!['employees','sessions','payouts','audit'].every(k=>Array.isArray(state[k])))throw Error('Invalid HR data')}catch(e){if(e.code!=='ENOENT')throw e}
  let queue=Promise.resolve();
  const transaction=fn=>{const next=queue.then(async()=>{const draft=structuredClone(state);const result=fn(draft);await writeFile(file+'.tmp',JSON.stringify(draft),{mode:0o600});await rename(file+'.tmp',file);state=draft;return result});queue=next.catch(()=>{});return next};
  const log=(s,actor,event,id)=>s.audit.push({at:new Date().toISOString(),actor,event,id});
  function location(b){if(b.consent!==true)fail('Location consent is required for this check-in/out');const l=b.location;if(!l||!['latitude','longitude','accuracy','timestamp'].every(k=>typeof l[k]==='number'&&Number.isFinite(l[k]))||Math.abs(l.latitude)>90||Math.abs(l.longitude)>180||l.accuracy<0||l.accuracy>100||Math.abs(Date.now()-l.timestamp)>120000)fail('Fresh location within 100m accuracy required. Try outside or refresh location.');return {latitude:l.latitude,longitude:l.longitude,accuracy:l.accuracy,capturedAt:new Date(l.timestamp).toISOString()}}
  return async function route(req,res,url,{admin,body,json}){
    if(!url.pathname.startsWith('/api/hr/'))return false;
    try{
      const token=(req.headers.authorization||'').replace(/^Bearer /,'');
      const employee=!admin&&token?state.employees.find(e=>e.tokenHash===hash(token)):null;
      if(!admin&&!employee)fail('Invalid access key',401);
      const path=url.pathname,method=req.method;
      if(path==='/api/hr/overview'&&method==='GET'){
        if(!admin)fail('Admin only',403);
        json(res,200,{employees:state.employees.map(({tokenHash,...e})=>e),sessions:state.sessions,payouts:state.payouts,audit:state.audit.slice(-100)});return true;
      }
      if(path==='/api/hr/me'&&method==='GET'){
        if(!employee)fail('Use your employee key',403);
        json(res,200,{employee:{id:employee.id,name:employee.name},sessions:state.sessions.filter(s=>s.employeeId===employee.id)});return true;
      }
      if(method!=='POST')fail('Not found',404);
      const b=await body(req);
      const result=await transaction(s=>{
        if(path==='/api/hr/employees'){
          if(!admin)fail('Admin only',403);const name=clean(b.name),code=clean(b.code,30);
          if(s.employees.some(e=>e.code.toLowerCase()===code.toLowerCase()))fail('Employee code already exists',409);
          const accessKey=randomBytes(32).toString('hex');const e={id:randomUUID(),name,code,tokenHash:hash(accessKey)};s.employees.push(e);log(s,'admin','employee_created',e.id);return {id:e.id,accessKey};
        }
        if(path==='/api/hr/rotate-key'){
          if(!admin)fail('Admin only',403);const e=s.employees.find(e=>e.id===b.employeeId);if(!e)fail('Employee not found',404);const accessKey=randomBytes(32).toString('hex');e.tokenHash=hash(accessKey);log(s,'admin','key_rotated',e.id);return {accessKey};
        }
        if(path==='/api/hr/punch'){
          if(!employee)fail('Use an employee key to mark attendance',403);if(!['in','out'].includes(b.action))fail('Choose check-in or check-out');
          const loc=location(b),open=s.sessions.find(x=>x.employeeId===employee.id&&!x.out);
          if(b.action==='in'){if(open)fail('Already checked in',409);const session={id:randomUUID(),employeeId:employee.id,in:new Date().toISOString(),inLocation:loc,out:null};s.sessions.push(session);log(s,employee.id,'check_in',session.id);return session}
          if(!open)fail('Check in first',409);open.out=new Date().toISOString();open.outLocation=loc;log(s,employee.id,'check_out',open.id);return open;
        }
        if(!admin)fail('Admin only',403);
        if(path==='/api/hr/payouts'){
          if(!s.employees.some(e=>e.id===b.employeeId))fail('Employee not found');if(typeof b.month!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(b.month))fail('Choose a valid payroll month');
          if(s.payouts.some(p=>p.employeeId===b.employeeId&&p.month===b.month))fail('Payout already exists for this employee/month',409);
          const amountPaise=money(b.amountPaise);if(!amountPaise)fail('Amount must be greater than zero');
          const p={id:randomUUID(),employeeId:b.employeeId,month:b.month,amountPaise,note:clean(b.note,500),status:'draft',createdAt:new Date().toISOString()};s.payouts.push(p);log(s,'admin','payout_drafted',p.id);return p;
        }
        if(path==='/api/hr/payout-action'){
          const p=s.payouts.find(p=>p.id===b.id);if(!p)fail('Payout not found',404);
          if(b.action==='approve'&&p.status==='draft'){p.status='approved';p.approvedAt=new Date().toISOString()}
          else if(b.action==='record-paid'&&p.status==='approved'){p.reference=clean(b.reference,120);p.status='paid_recorded';p.paidRecordedAt=new Date().toISOString()}
          else fail('Invalid payout action',409);log(s,'admin',p.status,p.id);return p;
        }
        fail('Not found',404);
      });json(res,200,result);
    }catch(e){json(res,e.status||500,{error:e.status?e.message:'Could not save HR data. No success recorded; retry or contact admin.'})}return true;
  };
}
