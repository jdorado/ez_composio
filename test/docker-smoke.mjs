// Explicit synthetic Docker test. Creates its own temporary registry and data.
import {mkdtemp,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const manager=resolve('../ezenciel_agents/bin/ezenciel-agents-tools.mjs');
const root=await mkdtemp(join(tmpdir(),'ez-composio-docker-'));
await mkdir(join(root,'mind'));
const run=(args,input)=>{const r=spawnSync(process.execPath,[manager,...args],{encoding:'utf8',input});if(r.status!==0)throw Error(r.stderr||r.stdout);return JSON.parse(r.stdout);};
const init=run(['init','--home',join(root,'tools'),'--workspace',join(root,'mind')]);
const ez=(...args)=>run(['--home',join(root,'tools'),...args]);
const p=ez('plugins','inspect','composio','--source',process.cwd());
let installed=false;
try {
  ez('plugins','install','composio','--source',process.cwd(),'--revision',p.revision);installed=true;
  ez('plugins','start','composio');
  assert.equal(ez('composio','--version').version,'0.1.0');
  assert.ok(ez('composio','--help').commands.includes('search <intent>'));
  const r=run(['--home',join(root,'tools'),'composio','init'],JSON.stringify({broker:'https://example.com',token:'synthetic-'.repeat(8)}));
  assert.equal(r.configured,true);
  ez('plugins','stop','composio');ez('plugins','start','composio');
  console.log(JSON.stringify({verified:true,root,init,revision:p.revision}));
} finally {if(installed)ez('plugins','uninstall','composio');}
// Manager deliberately retains private volume and registry for inspection.
