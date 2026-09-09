import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,chmod,unlink} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readJSON,request,save} from './io.mjs';
export const digest=token=>createHash('sha256').update(token).digest('hex');
const fields=(body,allowed)=>{if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!allowed.includes(k)))throw Error('Invalid request fields');};
const str=(v)=>{if(typeof v!=='string'||!v.length||v.length>4000)throw Error('Expected bounded string');return v;};
export function route(command,body) {
  if(command==='doctor') {fields(body,[]);return ['toolkits',undefined];}
  if(command==='toolkits') {
    fields(body,['search','cursor','limit','toolkits','is_connected']);
    const query=new URLSearchParams();
    for(const [key,value] of Object.entries(body)) {
      if(key==='limit') {if(!Number.isInteger(value)||value<1||value>50)throw Error('Invalid limit');}
      else if(key==='is_connected') {if(typeof value!=='boolean')throw Error('Invalid connection filter');}
      else if(key==='toolkits') {if(!Array.isArray(value)||!value.length||value.length>50||value.some(v=>typeof v!=='string'||! /^[a-z0-9_-]+$/.test(v)))throw Error('Invalid toolkit slugs');}
      else str(value);
      query.set(key,Array.isArray(value)?value.join(','):String(value));
    }
    return ['toolkits?'+query,undefined];
  }
  if(command==='schemas') {
    fields(body,['tools']);
    if(!Array.isArray(body.tools)||!body.tools.length||body.tools.length>20||body.tools.some(v=>typeof v!=='string'||! /^[A-Z][A-Z0-9_]+$/.test(v)||v.startsWith('COMPOSIO_')))throw Error('Invalid tool slugs');
    return ['execute_meta',{slug:'COMPOSIO_GET_TOOL_SCHEMAS',arguments:{tool_slugs:body.tools}}];
  }
  if(command==='search') {fields(body,['query']);return ['search',{queries:[{use_case:str(body.query)}],search_strategy:'tool_search'}];}
  if(command==='connect') {fields(body,['toolkit','alias']);if(!/^[a-z0-9_-]+$/.test(str(body.toolkit)))throw Error('Invalid toolkit');return ['link',{toolkit:body.toolkit,...(body.alias?{alias:str(body.alias)}:{})}];}
  if(command==='execute') {
    fields(body,['tool','arguments','account','key']);str(body.key);
    if(!/^[A-Z][A-Z0-9_]+$/.test(str(body.tool))||body.tool.startsWith('COMPOSIO_'))throw Error('Use an app tool discovered by search');
    if(!body.arguments||typeof body.arguments!=='object'||Array.isArray(body.arguments))throw Error('arguments must be an object');
    return ['execute',{tool_slug:body.tool,arguments:body.arguments,account:str(body.account)}];
  }
  throw Error('Unknown command');
}
export function server(load,fetcher=fetch) {
  return createServer(async(req,res)=>{
    res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');
    const send=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
    try {
      if(req.method!=='POST') return send(405,{error:'POST required'});
      const config=await load();
      const token=req.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
      const principal=token&&config.agents[digest(token)];
      if(!principal) return send(401,{error:'Unknown or revoked agent credential'});
      const body=await readJSON(req);let spec;
      const receiptPath=key=>{
        if(!isAbsolute(config.receiptsDirectory||''))throw Error('Private receipts directory required');
        return join(config.receiptsDirectory,digest(token),digest(str(key))+'.json');
      };
      if(req.url==='/operation') {
        fields(body,['key']);
        try {return send(200,JSON.parse(await readFile(receiptPath(body.key),'utf8')));}
        catch(e) {if(e.code==='ENOENT')return send(404,{error:'Unknown operation'});throw e;}
      }
      try {spec=route(req.url.slice(1),body);}catch {return send(400,{error:'Invalid command or fields'});}
      if(!/^trs_[a-zA-Z0-9_-]+$/.test(principal.session))throw Error('Invalid server session binding');
      const [action,payload]=spec;
      const url='https://backend.composio.dev/api/v3.1/tool_router/session/'+principal.session+'/'+action;
      const headers={'x-api-key':config.apiKey};
      let receipt;
      if(action==='execute') {
        const file=receiptPath(body.key);const fingerprint=digest(JSON.stringify(payload));
        await mkdir(join(config.receiptsDirectory,digest(token)),{recursive:true,mode:0o700});
        receipt={file,value:{key:body.key,fingerprint,status:'uncertain',createdAt:new Date().toISOString()}};
        try {await writeFile(file,JSON.stringify(receipt.value),{flag:'wx',mode:0o600});}
        catch(e) {
          if(e.code!=='EEXIST')throw e;
          const previous=JSON.parse(await readFile(file,'utf8'));
          return previous.fingerprint===fingerprint?send(200,previous):send(409,{error:'Operation key already used with different arguments'});
        }
      }
      let data;
      if(payload) data=await request(url,headers,payload,fetcher);
      else {
        const r=await fetcher(url,{headers,redirect:'error',signal:AbortSignal.timeout(30000)});
        if(!r.ok)throw Error('Provider unavailable');data=await readJSON(r.body,8*1024*1024);
      }
      if(receipt) {
        const value={...receipt.value,status:'returned',result:data};
        await save(receipt.file,value);return send(200,value);
      }
      send(200,data);
    } catch {send(502,{error:'Broker/provider unavailable; reconcile any attempted write before retrying'});}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const file=process.argv[2];if(!file)throw Error('Private broker config path required');
  const s=server(async()=>readJSON([await readFile(file)]));
  s.requestTimeout=35000;s.headersTimeout=10000;
  if(process.argv[3]==='--socket') {
    const socket='/ipc/composio.sock';
    await unlink(socket).catch(e=>{if(e.code!=='ENOENT')throw e;});
    s.listen(socket,()=>chmod(socket,0o600).catch(()=>{s.close();process.exitCode=1;}));
  } else s.listen(8080,'0.0.0.0');
}
