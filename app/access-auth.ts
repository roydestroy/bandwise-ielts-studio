import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {verifyTeacher,type Teacher} from '@/lib/access';

export async function getTeacher():Promise<Teacher|null>{
  // Vite replaces DEV with false in production; this branch is not deployed.
  if(import.meta.env.DEV&&env.LOCAL_DEV_EMAIL){
    return {userId:'local-development',email:env.LOCAL_DEV_EMAIL,displayName:'Local teacher',fullName:null};
  }
  const token=(await headers()).get('cf-access-jwt-assertion');
  if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return null;
  try{return await verifyTeacher(token,env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUD);}catch{return null;}
}

// Access's own logout on this hostname ends the session for every Access app, then shows Cloudflare's signed-out page.
// Hidden when Access isn't configured (local development), where the endpoint doesn't exist.
export function logoutUrl():string|null{
  return env.ACCESS_TEAM_DOMAIN&&env.ACCESS_AUD?'/cdn-cgi/access/logout':null;
}
