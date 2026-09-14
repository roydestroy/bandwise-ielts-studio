import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync('wrangler.json','utf8'));
if(config.d1_databases[0].database_id==='00000000-0000-4000-8000-000000000000'||!config.vars.ACCESS_AUD||!config.vars.ACCESS_TEAM_DOMAIN)
  throw new Error('Configure wrangler.json before deployment. See README.md.');
const key=process.env.PROVIDER_ENCRYPTION_KEY;
if(!key||Buffer.from(key,'base64').length!==32)throw new Error('Set PROVIDER_ENCRYPTION_KEY to a base64-encoded 32-byte key. Keep it stable between deployments.');
function run(args,input){const r=spawnSync(process.execPath,args,{stdio:input?['pipe','inherit','inherit']:'inherit',input});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
const wrangler='node_modules/wrangler/bin/wrangler.js';
run(['scripts/run.mjs','build']);
run([wrangler,'d1','migrations','apply','DB','--remote','--config','wrangler.json']);
// First deployment is still closed to API users until this key is installed.
run([wrangler,'deploy','--config','dist/server/wrangler.json']);
run([wrangler,'secret','put','PROVIDER_ENCRYPTION_KEY','--config','wrangler.json'],key+'\n');
