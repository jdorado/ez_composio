// Operator-only: never packaged as an agent command. Read secrets through stdin.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {join} from 'node:path';
import {readJSON,endpoint,request} from './io.mjs';
import {digest} from './broker.mjs';
const [configFile,outputDir]=process.argv.slice(2);
if(!configFile||!outputDir)throw Error('Usage: provision.mjs BROKER_CONFIG NEW_OUTPUT_DIR < private request JSON');
const {userId,broker}=await readJSON(process.stdin);
if(typeof userId!=='string'||!userId.length)throw Error('Explicit stable user+agent identity required');
endpoint(broker);
// New directory prevents accidental overwriting; operator merges binding into config.
await mkdir(outputDir,{mode:0o700});
const config=await readJSON([await readFile(configFile)]);
const session=await request('https://backend.composio.dev/api/v3.1/tool_router/session',{'x-api-key':config.apiKey},{user_id:userId,workbench:{enable:false},execute:{enable_multi_execute:false},multi_account:{enable:true,require_explicit_selection:true}});
if(!/^trs_[a-zA-Z0-9_-]+$/.test(session.session_id))throw Error('Provider did not return a session ID');
const token=randomBytes(32).toString('hex');
await writeFile(join(outputDir,'binding.secret.json'),JSON.stringify({[digest(token)]:{session:session.session_id,userId}}),{mode:0o600,flag:'wx'});
await writeFile(join(outputDir,'enrollment.secret.json'),JSON.stringify({broker:endpoint(broker),token}),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({prepared:true,next:'Merge binding into broker agents map; privately import enrollment with plugin init. No accounts connected yet.'}));
