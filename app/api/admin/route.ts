import {currentAccount} from '@/app/access-auth';
import {listWorkspaces,setWorkspaceStatus} from '@/lib/workspaces';
import {database} from '@/lib/storage';
import {sendSystemEmail,approvedEmail,systemEmailReady} from '@/lib/system-email';
import {z} from 'zod';
import {setCreditLimit} from '@/lib/ai-credits-store';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});

// Approving and pausing workspaces. Only emails in ADMIN_EMAILS, signed in and approved themselves.
async function admin(){const a=await currentAccount();return a?.status==='active'&&a.admin?a:null;}

export async function GET(){
  if(!await admin())return json({error:'Only admins can see this page.'},403);
  return json({workspaces:await listWorkspaces()});
}

export async function POST(req:Request){
  const me=await admin();if(!me)return json({error:'Only admins can do this.'},403);
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Cross-site request rejected.'},403);
  try{
    const body:unknown=await req.json();
    if((body as {action?:unknown}|null)?.action==='limit'){
      // A workspace's monthly Bandwise AI allowance; null goes back to the default. Admins may set their own.
      const {id,limit}=z.object({id:z.string().min(1).max(100),limit:z.number().int().min(0).max(100000).nullable()}).parse(body);
      await setCreditLimit(id,limit);
      return json({ok:true,message:limit===null?'Back to the default allowance.':'Allowance set to '+limit+' credits a month.'});
    }
    const {id,action}=z.object({id:z.string().min(1).max(100),action:z.enum(['approve','suspend'])}).parse(body);
    if(id===me.teacher.userId)throw new Error('You can’t change your own workspace.');
    await setWorkspaceStatus(id,action==='approve'?'active':'suspended');
    let message=action==='approve'?'Approved.':'Paused. They can no longer open the studio.';
    if(action==='approve'){
      // Tell them, if we know where: best effort, the approval itself already happened.
      const who=await database().prepare('SELECT u.email FROM memberships m JOIN auth_user u ON u.id = m.user_id WHERE m.workspace_id = ? LIMIT 1').bind(id).first<{email:string}>();
      if(who&&systemEmailReady()){
        try{await sendSystemEmail(approvedEmail(who.email,new URL('/login',req.url).toString()));message='Approved, and '+who.email+' has been emailed.';}
        catch{message='Approved, but the email to '+who.email+' could not be sent. Let them know yourself.';}
      }else if(who)message='Approved. Email isn’t set up, so let '+who.email+' know yourself.';
    }
    return json({ok:true,message});
  }catch(e){if(e instanceof z.ZodError)return json({error:'Check the request.'},400);return json({error:e instanceof Error?e.message:'Could not update the workspace.'},400);}
}
