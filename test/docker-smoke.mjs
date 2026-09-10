// Isolated manager QA: packed source, synthetic provider, no real accounts.
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
process.umask(0o077);
const manager=process.env.EZ_COMPOSIO_TEST_MANAGER;
if(!manager)throw Error('Set EZ_COMPOSIO_TEST_MANAGER to a reviewed Ez manager entrypoint');
const source=resolve(process.argv[2]||'.');
const root=await mkdtemp(join(tmpdir(),'ez-composio-docker-'));
await mkdir(join(root,'mind'));await writeFile(join(root,'catalog.json'),'{}');
const invoke=(bin,args,input)=>{const r=spawnSync(bin,args,{encoding:'utf8',input,maxBuffer:8*1024*1024});if(r.status!==0)throw Error('QA command failed: '+r.stderr);return r.stdout;};
const run=(args,input)=>JSON.parse(invoke(process.execPath,[manager,...args],input));
run(['init','--home',join(root,'tools'),'--workspace',join(root,'mind'),'--catalog',join(root,'catalog.json')]);
const ez=(args,input)=>run(['--home',join(root,'tools'),...args],input);
const p=ez(['plugins','inspect','composio','--source',source]);let installed=false,compose;
const dc=(args,input)=>invoke('docker',['compose','-f',compose,...args],input);
const operator=(args,input)=>dc(['exec','-T','broker','node',...args],input);
async function install(){
  ez(['plugins','install','composio','--source',source,'--revision',p.revision]);installed=true;
  compose=ez(['plugins','list']).composio.compose;
  const c=JSON.parse(await readFile(compose,'utf8'));
  assert.equal(c.services.plugin.network_mode,undefined);
  assert.ok(!c.services.plugin.volumes.some(v=>v.source==='broker'));
  // Only test provider injection; no networking changes to the generated deployment.
  c.services.broker.volumes.push({type:'bind',source:resolve('test/fake-provider.mjs'),target:'/fake-provider.mjs',read_only:true});
  c.services.broker.environment={NODE_OPTIONS:'--import=/fake-provider.mjs'};
  await writeFile(compose,JSON.stringify(c));ez(['plugins','start','composio']);
}
try {
  await install();
  assert.equal(ez(['composio','--version']).version,JSON.parse(await readFile(join(source,'package.json'),'utf8')).version);
  operator(['src/configure.mjs','key','/state/broker.secret.json'],JSON.stringify({apiKey:'synthetic'}));
  operator(['src/provision.mjs','/state/broker.secret.json','/state/enrollment'],JSON.stringify({userId:'synthetic',broker:'unix:///ipc/composio.sock'}));
  const binding=dc(['exec','-T','broker','cat','/state/enrollment/binding.secret.json']);
  operator(['src/configure.mjs','bind','/state/broker.secret.json'],binding);
  const enrollment=dc(['exec','-T','broker','cat','/state/enrollment/enrollment.secret.json']);
  ez(['composio','init'],enrollment);
  assert.equal(ez(['composio','doctor']).total_items,0);
  assert.equal(ez(['composio','toolkits'],JSON.stringify({limit:1})).total_items,0);
  assert.equal(ez(['composio','file-upload-request'],JSON.stringify({key:'synthetic-upload',toolkit_slug:'googledrive',tool_slug:'GOOGLEDRIVE_CREATE_FILE',filename:'empty.txt',mimetype:'text/plain',md5:'d41d8cd98f00b204e9800998ecf8427e'})).result.key,'synthetic-object');
  assert.ok(ez(['composio','search','calendar']).results);
  assert.ok(ez(['composio','schemas','GMAIL_FETCH_EMAILS']).data);
  ez(['plugins','stop','composio']);ez(['plugins','start','composio']);assert.equal(ez(['composio','doctor']).total_items,0);
  await install();assert.equal(ez(['composio','doctor']).total_items,0);
  operator(['src/configure.mjs','revoke','/state/broker.secret.json'],JSON.stringify({hash:Object.keys(JSON.parse(binding))[0]}));
  assert.throws(()=>ez(['composio','doctor']),/401/);
  console.log(JSON.stringify({verified:true,root,revision:p.revision,checks:['packed-install','private-ipc','key-isolation','discovery','restart','reinstall','atomic-revocation']}));
} finally {if(installed)ez(['plugins','uninstall','composio']);}
// Manager intentionally retains synthetic volumes for inspection.
