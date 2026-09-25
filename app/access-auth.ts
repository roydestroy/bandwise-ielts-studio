import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {verifyTeacher,accessIssuer,type Teacher} from '@/lib/access';

export async function getTeacher():Promise<Teacher|null>{
  // Vite replaces DEV with false in production; this branch is not deployed.
  if(import.meta.env.DEV&&env.LOCAL_DEV_EMAIL){
    return {userId:'local-development',email:env.LOCAL_DEV_EMAIL,displayName:'Local teacher',fullName:null};
  }
  const token=(await headers()).get('cf-access-jwt-assertion');
  if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return null;
  try{return await verifyTeacher(token,env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUD);}catch{return null;}
}

// Signing out of the team domain ends the Access session for every app, so the next visit asks for sign-in again.
export function logoutUrl():string|null{
  if(!env.ACCESS_TEAM_DOMAIN)return null;
  try{return accessIssuer(env.ACCESS_TEAM_DOMAIN)+'/cdn-cgi/access/logout';}catch{return null;}
}
