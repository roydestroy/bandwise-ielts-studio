import {getTeacher} from '@/app/access-auth';
import {usageSummary} from '@/lib/usage-store';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){const user=await getTeacher();if(!user)return json({error:'Sign in to see AI usage.'},401);try{return json(await usageSummary(user.userId))}catch{return json({error:'AI usage is temporarily unavailable. Please retry.'},503)}}
