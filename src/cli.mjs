import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {readJSON,save,endpoint,request} from './io.mjs';
export async function main(args, input=process.stdin, profile='/state/connection.json') {
  const [command,...rest]=args;
  if(command==='--version') return {version:'0.1.0'};
  if(!command||command==='--help') return {commands:['init < enrollment JSON on stdin','doctor','search <intent>','connect <toolkit> [alias]','execute <tool_slug> < JSON on stdin','operation <key>'],executionInput:{arguments:{},account:'explicit account ID or alias',key:'stable-operation-key'},notes:'Search returns current schemas. Use exact native arguments. JSON stdout; no automatic retries.'};
  if(command==='init') {
    if(rest.length) throw Error('init accepts only stdin');
    const c=await readJSON(input);
    if(Object.keys(c).sort().join(',')!=='broker,token'||typeof c.token!=='string'||c.token.length<32) throw Error('Expected broker and private agent token');
    await save(profile,{broker:endpoint(c.broker),token:c.token});
    return {configured:true,connected:false};
  }
  let body;
  if(command==='doctor'&&!rest.length) body={};
  else if(command==='operation'&&rest.length===1) body={key:rest[0]};
  else if(command==='search'&&rest.length===1) body={query:rest[0]};
  else if(command==='connect'&&rest.length>=1&&rest.length<=2) body={toolkit:rest[0],...(rest[1]?{alias:rest[1]}:{})};
  else if(command==='execute'&&rest.length===1) body={...await readJSON(input),tool:rest[0]};
  else throw Error('Invalid command; run --help');
  const config=JSON.parse(await readFile(profile,'utf8'));
  return request(endpoint(config.broker)+'/'+command,{authorization:'Bearer '+config.token},body);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {console.log(JSON.stringify(await main(process.argv.slice(2))));}
  catch(e) {console.error(JSON.stringify({error:e.code==='ENOENT'?'Run init with private enrollment JSON first':e.message}));process.exitCode=1;}
}
