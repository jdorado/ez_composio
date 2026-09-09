import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {server,digest,route} from '../src/broker.mjs';
import {readJSON,save,socketRequest} from '../src/io.mjs';

test('invalid secret JSON is never reflected by CLI or provisioning',async()=>{
  for(const args of [['src/cli.mjs','init'],['src/provision.mjs','/unused','/unused']]) {
    const r=spawnSync(process.execPath,args,{encoding:'utf8',input:'synthetic-private-key-not-json'});
    assert.notEqual(r.status,0);assert.ok(!r.stderr.includes('synthetic'));assert.ok(!r.stdout.includes('synthetic'));
  }
  await assert.rejects(readJSON(['{private-unparseable']),/Invalid JSON/);
});
test('toolkit navigation encodes filters and schema lookup cannot become arbitrary meta execution',()=>{
  const [url,body]=route('toolkits',{search:'a&session=other',cursor:'next/+=',limit:50,toolkits:['calendar'],is_connected:true});
  assert.equal(body,undefined);const q=new URL('https://example.com/'+url).searchParams;
  assert.equal(q.get('search'),'a&session=other');assert.equal(q.get('session'),null);assert.equal(q.get('cursor'),'next/+=');
  assert.deepEqual(route('schemas',{tools:['GMAIL_FETCH_EMAILS']}),['execute_meta',{slug:'COMPOSIO_GET_TOOL_SCHEMAS',arguments:{tool_slugs:['GMAIL_FETCH_EMAILS']}}]);
  for(const body of [{limit:51},{limit:0},{session:'trs_other'},{toolkits:['../other']},{is_connected:'true'}])assert.throws(()=>route('toolkits',body));
  for(const body of [{tools:['COMPOSIO_REMOTE_BASH_TOOL']},{tools:['../execute']},{tools:['GMAIL_FETCH_EMAILS'],slug:'COMPOSIO_REMOTE_BASH_TOOL'}])assert.throws(()=>route('schemas',body));
});
test('socket transport sees atomic revocation, tenant receipts stay private and concurrent keys execute once',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'ezc-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const configFile=join(dir,'broker.json');const token='a'.repeat(64),other='b'.repeat(64);
  const config={apiKey:'synthetic',receiptsDirectory:join(dir,'receipts'),agents:{[digest(token)]:{session:'trs_one'},[digest(other)]:{session:'trs_two'}}};
  await save(configFile,config);let calls=0;
  const s=server(async()=>readJSON([await readFile(configFile)]),async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,20));return new Response(JSON.stringify({ok:true}));});
  const socket=join(dir,'b.sock');s.listen(socket);await once(s,'listening');t.after(()=>s.close());
  const call=(credential,command,body)=>socketRequest(socket,command,{authorization:'Bearer '+credential},body);
  const body={tool:'GMAIL_FETCH_EMAILS',arguments:{},account:'explicit',key:'concurrent'};
  const results=await Promise.all([call(token,'execute',body),call(token,'execute',body)]);
  assert.equal(calls,1);assert.ok(results.some(x=>x.status==='returned'));
  await assert.rejects(call(other,'operation',{key:body.key}),/404/);
  delete config.agents[digest(token)];await save(configFile,config);
  await assert.rejects(call(token,'doctor',{}),/401/);assert.equal(calls,1);
});
