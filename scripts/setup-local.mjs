import {writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.dev.vars')){console.log('Keeping your existing .dev.vars.');}
else{writeFileSync('.dev.vars','LOCAL_DEV_EMAIL=teacher@example.test\nPROVIDER_ENCRYPTION_KEY='+randomBytes(32).toString('base64')+'\n',{mode:0o600});console.log('Created ignored local development settings. Run npm run db:local, then npm run dev.');}
