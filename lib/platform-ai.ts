import type {ProviderConnection} from './providers';

// "Bandwise AI": assessments run on Bandwise's own Gemini key instead of the teacher's. In test mode (the
// default) only the emails in PLATFORM_AI_TEST_USERS see it, because the key may be a free-tier key whose
// requests Google can use to improve its products. PLATFORM_AI_MODE=live, with a paid key, offers it to
// every teacher. Without PLATFORM_GEMINI_API_KEY nobody sees it.
export type PlatformEnv={PLATFORM_GEMINI_API_KEY?:string;PLATFORM_GEMINI_MODEL?:string;PLATFORM_AI_MODE?:string;PLATFORM_AI_TEST_USERS?:string};
export type PlatformInfo={available:boolean;test:boolean;name:string;model:string};

const DEFAULT_MODEL='gemini-2.5-flash';
const isLive=(e:PlatformEnv)=>e.PLATFORM_AI_MODE==='live';
const model=(e:PlatformEnv)=>e.PLATFORM_GEMINI_MODEL?.trim()||DEFAULT_MODEL;

export function platformAllowed(e:PlatformEnv,email:string){
  if(!e.PLATFORM_GEMINI_API_KEY)return false;
  if(isLive(e))return true;
  const testers=(e.PLATFORM_AI_TEST_USERS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  return testers.includes(email.trim().toLowerCase());
}
export function platformInfo(e:PlatformEnv,email:string):PlatformInfo{
  return {available:platformAllowed(e,email),test:!isLive(e),name:isLive(e)?'Bandwise AI':'Bandwise AI (test mode)',model:model(e)};
}
export function platformConnection(e:PlatformEnv):ProviderConnection{
  if(!e.PLATFORM_GEMINI_API_KEY)throw new Error('Bandwise AI is not available right now. Choose another provider in Settings → AI connection.');
  return {provider:'gemini',textModel:model(e),audioModel:model(e),region:'ap-southeast-1',workspace:'',key:e.PLATFORM_GEMINI_API_KEY,platform:true};
}
