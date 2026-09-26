import {readFileSync,writeFileSync} from 'node:fs';
const required=['CLOUDFLARE_D1_DATABASE_ID','CLOUDFLARE_R2_BUCKET_NAME','ACCESS_TEAM_DOMAIN','ACCESS_AUD'];
for(const key of required)if(!process.env[key])throw new Error('Missing '+key+'. See README.md.');
if(!/^[0-9a-f-]{36}$/i.test(process.env.CLOUDFLARE_D1_DATABASE_ID))throw new Error('Invalid D1 database ID.');
const team=process.env.ACCESS_TEAM_DOMAIN.replace(/^https:\/\//,'').replace(/\/$/,'');
if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team))throw new Error('Invalid Access team domain.');
const config=JSON.parse(readFileSync('wrangler.json','utf8'));
config.name=process.env.CLOUDFLARE_WORKER_NAME||config.name;
config.d1_databases[0].database_id=process.env.CLOUDFLARE_D1_DATABASE_ID;
config.r2_buckets[0].bucket_name=process.env.CLOUDFLARE_R2_BUCKET_NAME;
config.vars={ACCESS_TEAM_DOMAIN:team,ACCESS_AUD:process.env.ACCESS_AUD};
// Where signed R2 download links point. The R2 API keys themselves are Worker secrets (scripts/deploy.mjs).
if(/^[0-9a-f]{32}$/.test(process.env.CLOUDFLARE_ACCOUNT_ID||''))Object.assign(config.vars,{R2_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,R2_BUCKET_NAME:process.env.CLOUDFLARE_R2_BUCKET_NAME});
// Optional Bandwise AI settings (lib/platform-ai.ts). The key itself is a Worker secret (scripts/deploy.mjs).
const mode=process.env.PLATFORM_AI_MODE||'test';
if(!['test','live'].includes(mode))throw new Error('PLATFORM_AI_MODE must be test or live.');
config.vars.PLATFORM_AI_MODE=mode;
for(const name of ['PLATFORM_AI_TEST_USERS','PLATFORM_GEMINI_MODEL','PLATFORM_MONTHLY_CREDITS'])if(process.env[name])config.vars[name]=process.env[name].trim();
// Bandwise sign-in (lib/auth.ts, docs/SIGN_IN_SETUP.md). Secrets are installed by scripts/deploy.mjs.
const site=process.env.BETTER_AUTH_URL||(config.routes?.[0]?.custom_domain?'https://'+config.routes[0].pattern:'');
if(site)config.vars.BETTER_AUTH_URL=site.replace(/\/$/,'');
// The first route is the site's address; the Worker redirects every other hostname to it (lib/canonical-host.ts).
if(config.routes?.[0]?.custom_domain)config.vars.CANONICAL_HOST=config.routes[0].pattern;
for(const name of ['GOOGLE_CLIENT_ID','ADMIN_EMAILS','EMAIL_FROM'])if(process.env[name])config.vars[name]=process.env[name].trim();
// Cloudflare Email Service. Only bound once a sender is configured: the binding needs the domain onboarded first.
if(process.env.EMAIL_FROM)config.send_email=[{name:'EMAIL'}];else delete config.send_email;
// Say which optional settings reached this deploy (names only, never values), so a setting saved in the
// wrong place shows up here instead of as a missing feature on the site.
const has=name=>process.env[name]?'set':'missing';
console.log('Optional settings: '+['BETTER_AUTH_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','ADMIN_EMAILS','EMAIL_FROM','PLATFORM_GEMINI_API_KEY','PLATFORM_AI_TEST_USERS','PLATFORM_MONTHLY_CREDITS'].map(n=>n+' '+has(n)).join(', '));
if(!!process.env.GOOGLE_CLIENT_ID!==!!process.env.GOOGLE_CLIENT_SECRET)console.warn('Warning: Google sign-in needs both GOOGLE_CLIENT_ID (a variable) and GOOGLE_CLIENT_SECRET (a secret). It stays off until both are set.');
writeFileSync('wrangler.json',JSON.stringify(config,null,2)+'\n');
console.log('Cloudflare resource bindings configured. No secrets were written to the config.');
