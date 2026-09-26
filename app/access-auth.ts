import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {verifyTeacher,type Teacher} from '@/lib/access';
import {auth,authEnabled} from '@/lib/auth';
import {workspaceForUser,recordAccessIdentity,isAdminEmail,type WorkspaceStatus} from '@/lib/workspaces';

// Who is making this request. `teacher.userId` is the workspace ID: the `owner` on every row they can see.
// Sign-in comes from Bandwise's own session (lib/auth.ts) or, while it is still in front of the studio,
// Cloudflare Access. Both are verified here; a forged header or cookie signs nobody in.
export type Account={teacher:Teacher;status:WorkspaceStatus;admin:boolean;via:'dev'|'session'|'access'};

export async function currentAccount():Promise<Account|null>{
  // Vite replaces DEV with false in production; this branch is not deployed.
  if(import.meta.env.DEV&&env.LOCAL_DEV_EMAIL){
    return {teacher:{userId:'local-development',email:env.LOCAL_DEV_EMAIL,displayName:'Local teacher',fullName:null},status:'active',admin:isAdminEmail(env.LOCAL_DEV_EMAIL),via:'dev'};
  }
  const h=await headers();
  if(authEnabled()){
    try{
      const session=await auth().api.getSession({headers:h});
      if(session){
        const {user}=session;
        const workspace=await workspaceForUser(user);
        return {teacher:{userId:workspace.id,email:user.email,displayName:user.name||user.email,fullName:user.name||null},status:workspace.status,admin:user.emailVerified&&isAdminEmail(user.email),via:'session'};
      }
    }catch(e){console.error('Session check failed',e instanceof Error?e.message:'Unknown error');}
  }
  const token=h.get('cf-access-jwt-assertion');
  if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return null;
  try{
    const teacher=await verifyTeacher(token,env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUD);
    await recordAccessIdentity(teacher.email,teacher.userId).catch(e=>console.error('Access identity not recorded',e instanceof Error?e.message:'Unknown error'));
    return {teacher,status:'active',admin:isAdminEmail(teacher.email),via:'access'};
  }catch{return null;}
}

// The signed-in teacher, only once their workspace is approved. Every API route uses this.
export async function getTeacher():Promise<Teacher|null>{
  const account=await currentAccount();
  return account?.status==='active'?account.teacher:null;
}

// Where "Sign out" goes: Bandwise's own sign-out, or Access's logout page (which ends the session for every
// Access app on this hostname). Hidden in local development, where there is nothing to sign out of.
export function logoutUrl(account:Account|null):string|null{
  if(!account||account.via==='dev')return null;
  return account.via==='session'?'/logout':'/cdn-cgi/access/logout';
}
