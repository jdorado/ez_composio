import {mkdir, writeFile, rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {request as httpRequest} from 'node:http';
export async function readJSON(stream, limit=1024*1024) {
  const chunks=[]; let size=0;
  for await (const chunk of stream) { size+=Buffer.byteLength(chunk); if(size>limit) throw Error('JSON exceeds size limit'); chunks.push(Buffer.from(chunk)); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Error('Invalid JSON'); }
}
export async function save(file, value) {
  await mkdir(dirname(file),{recursive:true,mode:0o700});
  const tmp=file+'.'+randomUUID()+'.tmp';
  await writeFile(tmp,JSON.stringify(value)+'\n',{mode:0o600,flag:'wx'});
  await rename(tmp,file);
}
export function endpoint(value) {
  if(value==='unix:///ipc/composio.sock') return value;
  const u=new URL(value);
  if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||
    (u.protocol!=='https:' && !(u.protocol==='http:' && ['localhost','127.0.0.1'].includes(u.hostname)))) throw Error('Broker must be an HTTPS origin (loopback HTTP allowed for tests)');
  return u.origin;
}
export async function request(url, headers, body, fetcher=fetch) {
  let response;
  try { response=await fetcher(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(30000)}); }
  catch { throw Error('Network failure; outcome uncertain. Do not automatically retry writes.'); }
  if(!response.ok) throw Error('Request failed (HTTP '+response.status+'); inspect provider logs and reconcile writes before retrying');
  return readJSON(response.body,8*1024*1024);
}

export function socketRequest(socketPath, command, headers, body) {
  return new Promise((resolve,reject)=>{
    const req=httpRequest({socketPath,path:'/'+command,method:'POST',headers:{'content-type':'application/json',...headers},signal:AbortSignal.timeout(35000)},async res=>{
      try {
        if(res.statusCode<200||res.statusCode>=300) {res.resume();throw Error('Broker request failed (HTTP '+res.statusCode+'); reconcile attempted writes');}
        resolve(await readJSON(res,8*1024*1024));
      } catch(e) {reject(e);}
    });
    req.on('error',()=>reject(Error('Broker connection failed; reconcile attempted writes before retrying')));
    req.end(JSON.stringify(body));
  });
}
