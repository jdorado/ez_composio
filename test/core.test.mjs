import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {Readable} from 'node:stream';
import {mkdtemp,stat,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {server,digest,route} from '../src/broker.mjs';
import {main} from '../src/cli.mjs';
import {endpoint} from '../src/io.mjs';
const input=x=>Readable.from([JSON.stringify(x)]);
test('CLI through broker preserves native arguments, pins tenant and keeps key server-side',async t=>{
  const calls=[];const token='a'.repeat(64); const second='b'.repeat(64);
  const config={apiKey:'synthetic-project-secret',agents:{[digest(token)]:{session:'trs_agentA'},[digest(second)]:{session:'trs_agentB'}}};
  const s=server(async()=>config,async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({data:{id:'native-id'}}));});
  s.listen(0,'127.0.0.1');await once(s,'listening');t.after(()=>s.close());
  const origin='http://127.0.0.1:'+s.address().port;
  const dir=await mkdtemp(join(tmpdir(),'ez-composio-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const profile=join(dir,'profile.json');
  config.receiptsDirectory=join(dir,'receipts');
  assert.deepEqual(await main(['init'],input({broker:origin,token}),profile),{configured:true,connected:false});
  assert.equal((await stat(profile)).mode&0o777,0o600);
  assert.ok(!(await readFile(profile,'utf8')).includes(config.apiKey));
  await main(['search','Find my HubSpot contacts'],input({}),profile);
  assert.ok(calls[0].url.endsWith('/trs_agentA/search'));
  assert.equal(JSON.parse(calls[0].options.body).search_strategy,'tool_search');
  await main(['connect','hubspot','work'],input({}),profile);
  assert.deepEqual(JSON.parse(calls[1].options.body),{toolkit:'hubspot',alias:'work'});
  const execution={arguments:{nested:{literal:'$(touch BAD); --user-id another'}},account:'work',key:'one'};
  await main(['execute','HUBSPOT_EXAMPLE'],input(execution),profile);
  assert.equal(JSON.parse(calls[2].options.body).arguments.nested.literal,'$(touch BAD); --user-id another');
  assert.equal(calls[2].options.headers['x-api-key'],config.apiKey);
  assert.equal((await main(['execute','HUBSPOT_EXAMPLE'],input(execution),profile)).status,'returned');
  assert.equal(calls.length,3);
  assert.equal((await main(['operation','one'],input({}),profile)).status,'returned');
  await assert.rejects(main(['execute','HUBSPOT_EXAMPLE'],input({...execution,arguments:{changed:true}}),profile),/409/);
  const r=await fetch(origin+'/search',{method:'POST',headers:{authorization:'Bearer '+second},body:JSON.stringify({query:'calendar'})});
  assert.equal(r.status,200);assert.ok(calls[3].url.includes('/trs_agentB/'));
  const before=calls.length;
  for(const body of [{query:'hi',session:'trs_agentB'},{query:'hi',user_id:'other'}]) {
    const x=await fetch(origin+'/search',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)});assert.equal(x.status,400);
  }
  delete config.agents[digest(token)];
  await assert.rejects(main(['doctor'],input({}),profile),/401/);
  assert.equal(calls.length,before);
});
test('paths and helper execution cannot escape session; explicit account is required',()=>{
  for(const tool of ['../sessions','COMPOSIO_MULTI_EXECUTE_TOOL','COMPOSIO_REMOTE_WORKBENCH']) assert.throws(()=>route('execute',{tool,arguments:{},account:'work',key:'negative'}));
  assert.throws(()=>route('execute',{tool:'GMAIL_SEARCH',arguments:{}}));
  assert.throws(()=>route('connect',{toolkit:'../gmail'}));
  for(const url of ['http://example.com','https://user:secret@example.com','https://example.com/path','https://example.com?token=secret'])assert.throws(()=>endpoint(url));
});
test('provider failure is not retried or exposed in errors',async t=>{
  let calls=0;const token='c'.repeat(64);
  const dir=await mkdtemp(join(tmpdir(),'ez-composio-failure-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const s=server(async()=>({apiKey:'SECRET',receiptsDirectory:dir,agents:{[digest(token)]:{session:'trs_one'}}}),async()=>{calls++;throw Error('SECRET raw provider failure');});
  s.listen(0,'127.0.0.1');await once(s,'listening');t.after(()=>s.close());
  const url='http://127.0.0.1:'+s.address().port+'/execute';
  const options={method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({tool:'GMAIL_SEND',arguments:{},account:'work',key:'timeout'})};
  const r=await fetch(url,options);
  assert.equal(r.status,502);assert.equal(calls,1);assert.ok(!(await r.text()).includes('SECRET'));
  const retry=await fetch(url,options);assert.equal((await retry.json()).status,'uncertain');assert.equal(calls,1);
});

test('native upload requests keep credentials and receipts scoped, preserve metadata, and never replay uncertain requests',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'ez-composio-upload-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const a='d'.repeat(64),b='e'.repeat(64);let calls=0,fail=false;
  const config={apiKey:'PRIVATE_KEY',receiptsDirectory:dir,agents:{[digest(a)]:{session:'trs_a'},[digest(b)]:{session:'trs_b'}}};
  const metadata={key:'upload',toolkit_slug:'googledrive',tool_slug:'GOOGLEDRIVE_CREATE_FILE',filename:'empty.pdf',mimetype:'application/pdf',md5:'d41d8cd98f00b204e9800998ecf8427e'};
  const s=server(async()=>config,async(url,options)=>{
    calls++;assert.equal(url,'https://backend.composio.dev/api/v3.1/files/upload/request');
    assert.equal(options.headers['x-api-key'],'PRIVATE_KEY');
    const {key,...native}=metadata;assert.deepEqual(JSON.parse(options.body),native);
    if(fail)throw Error('PRIVATE_KEY');
    return new Response(JSON.stringify({key:'native-object',type:'new',new_presigned_url:'https://synthetic.example/upload'}));
  });s.listen(0,'127.0.0.1');await once(s,'listening');t.after(()=>s.close());
  const origin='http://127.0.0.1:'+s.address().port;
  const invoke=(token,command,body)=>fetch(origin+'/'+command,{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)});
  let r=await invoke(a,'file-upload-request',metadata);assert.equal(r.status,200);let receipt=await r.json();assert.equal(receipt.status,'returned');assert.equal(receipt.result.key,'native-object');assert.ok(!JSON.stringify(receipt).includes('PRIVATE_KEY'));
  await invoke(a,'file-upload-request',metadata);assert.equal(calls,1);
  assert.equal((await invoke(b,'operation',{key:'upload'})).status,404);
  assert.equal((await invoke(a,'file-upload-request',{...metadata,filename:'different.pdf'})).status,409);
  for(const change of [{filename:'../escape'},{md5:'bad'},{toolkit_slug:'../other'},{session:'trs_b'},{url:'https://evil.example'}])assert.equal((await invoke(a,'file-upload-request',{...metadata,...change})).status,400);
  fail=true;assert.equal((await invoke(b,'file-upload-request',metadata)).status,502);
  assert.equal((await (await invoke(b,'file-upload-request',metadata)).json()).status,'uncertain');assert.equal(calls,2);
});
