import {currentAccount} from '@/app/access-auth';
import {listWorkspaces} from '@/lib/workspaces';
import {adminUsage} from '@/lib/usage-store';
import type {WorkspaceUsage} from '@/lib/pilot-stats';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});

// Usage across every workspace for one month, for setting plan prices. Admins only.
export async function GET(req:Request){
  const a=await currentAccount();if(a?.status!=='active'||!a.admin)return json({error:'Only admins can see this page.'},403);
  const asked=new URL(req.url).searchParams.get('month')||'';
  const month=/^\d{4}-(0[1-9]|1[0-2])$/.test(asked)?asked:new Date().toISOString().slice(0,7);
  try{
    const [workspaces,u]=await Promise.all([listWorkspaces(),adminUsage(month)]);
    const rows:WorkspaceUsage[]=workspaces.map(w=>{const x=u.usage.get(w.id),s=u.saved.get(w.id);return {
      id:w.id,name:w.name,email:w.email,students:w.students,
      writing:x?.writing??0,speaking:x?.speaking??0,writingCost:x?.writingCost??0,speakingCost:x?.speakingCost??0,saved:s?.saved??0,reviewed:s?.reviewed??0,
      cost:x?.cost??0,platformCost:x?.platformCost??0,unpriced:x?.unpriced??0,requests:x?.requests??0,
    };});
    // Usage from a workspace that isn't listed (deleted, or a legacy owner) still counts towards the totals.
    for(const [owner,x] of u.usage)if(!workspaces.some(w=>w.id===owner))rows.push({id:owner,name:null,email:null,students:0,saved:u.saved.get(owner)?.saved??0,reviewed:u.saved.get(owner)?.reviewed??0,...x});
    const months=u.months.includes(month)?u.months:[month,...u.months].sort().reverse();
    return json({month,months,me:a.teacher.userId,rows,models:u.models});
  }catch{return json({error:'Usage is temporarily unavailable. Please retry.'},503)}
}
