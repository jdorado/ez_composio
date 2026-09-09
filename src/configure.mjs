// Trusted operator only. Never registered in the agent CLI.
import {readFile} from 'node:fs/promises';
import {readJSON,save} from './io.mjs';
try {
  const [command,file]=process.argv.slice(2);
  if(!file||!['key','bind','revoke'].includes(command))throw Error('Usage: configure.mjs key|bind|revoke CONFIG < JSON');
  let config;
  try {config=await readJSON([await readFile(file)]);} catch(e) {if(e.code!=='ENOENT'||command!=='key')throw e;config={receiptsDirectory:'/state/receipts',agents:{}};}
  const input=await readJSON(process.stdin);
  if(command==='key') {
    if(!input||Object.keys(input).join(',')!=='apiKey'||typeof input.apiKey!=='string'||!input.apiKey.length)throw Error('Expected apiKey');
    config.apiKey=input.apiKey;
  } else if(command==='bind') {
    if(!input||Array.isArray(input)||!Object.keys(input).length)throw Error('Expected binding map');
    for(const [hash,binding] of Object.entries(input)) {
      if(!/^[a-f0-9]{64}$/.test(hash)||!binding||Object.keys(binding).some(k=>!['session','userId'].includes(k))||!/^trs_[a-zA-Z0-9_-]+$/.test(binding.session)||typeof binding.userId!=='string'||!binding.userId.length)throw Error('Invalid binding');
      if(config.agents[hash])throw Error('Binding already exists; inspect before replacing');
    }
    Object.assign(config.agents,input);
  } else {
    if(!input||Object.keys(input).join(',')!=='hash'||! /^[a-f0-9]{64}$/.test(input.hash))throw Error('Expected credential hash');
    delete config.agents[input.hash];
  }
  await save(file,config);
  console.log(JSON.stringify({configured:true}));
} catch {console.error(JSON.stringify({error:'Configuration failed; check private input and existing config without printing secrets'}));process.exitCode=1;}
