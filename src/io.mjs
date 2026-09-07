import {mkdir, writeFile, rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
export async function readJSON(stream, limit=1024*1024) {
  const chunks=[]; let size=0;
  for await (const chunk of stream) { size+=Buffer.byteLength(chunk); if(size>limit) throw Error('JSON exceeds size limit'); chunks.push(Buffer.from(chunk)); }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export async function save(file, value) {
  await mkdir(dirname(file),{recursive:true,mode:0o700});
  const tmp=file+'.'+randomUUID()+'.tmp';
  await writeFile(tmp,JSON.stringify(value)+'\n',{mode:0o600,flag:'wx'});
  await rename(tmp,file);
}
export function endpoint(value) {
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
