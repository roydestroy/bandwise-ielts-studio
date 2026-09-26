import {env} from 'cloudflare:workers';
import {getTeacher} from '@/app/access-auth';
import {usageSummary} from '@/lib/usage-store';
import {creditStatus} from '@/lib/ai-credits-store';
import {platformAllowed} from '@/lib/platform-ai';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
// The teacher's own usage, plus their Bandwise AI allowance when they can use Bandwise AI.
export async function GET(){const user=await getTeacher();if(!user)return json({error:'Sign in to see AI usage.'},401);try{const [summary,credits]=await Promise.all([usageSummary(user.userId),platformAllowed(env,user.email)?creditStatus(user.userId):null]);return json({...summary,credits})}catch{return json({error:'AI usage is temporarily unavailable. Please retry.'},503)}}
