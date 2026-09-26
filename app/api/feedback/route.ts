import {getTeacher} from '@/app/access-auth';
import {database} from '@/lib/storage';
import {feedbackSchema,type Feedback} from '@/lib/feedback';
import {z} from 'zod';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
const columns='too_cheap AS tooCheap,bargain,expensive,too_expensive AS tooExpensive,hours_saved AS hoursSaved,comments,updated_at AS updatedAt';

// The teacher's pilot survey answers: one set per workspace, which they can change.
export async function GET(){
  const user=await getTeacher();if(!user)return json({error:'Sign in first.'},401);
  const row=await database().prepare(`SELECT ${columns} FROM pilot_feedback WHERE owner = ?`).bind(user.userId).first<Feedback&{updatedAt:string}>();
  return json({feedback:row??null});
}
export async function POST(req:Request){
  const user=await getTeacher();if(!user)return json({error:'Sign in first.'},401);
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Cross-site request rejected.'},403);
  try{
    const f=feedbackSchema.parse(await req.json());const at=new Date().toISOString();
    await database().prepare(`INSERT INTO pilot_feedback (owner,email,too_cheap,bargain,expensive,too_expensive,hours_saved,comments,updated_at) VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(owner) DO UPDATE SET email=excluded.email,too_cheap=excluded.too_cheap,bargain=excluded.bargain,expensive=excluded.expensive,too_expensive=excluded.too_expensive,hours_saved=excluded.hours_saved,comments=excluded.comments,updated_at=excluded.updated_at`)
      .bind(user.userId,user.email,f.tooCheap,f.bargain,f.expensive,f.tooExpensive,f.hoursSaved,f.comments,at).run();
    return json({ok:true,feedback:{...f,updatedAt:at}});
  }catch(e){if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||'Check your answers.'},400);return json({error:'Could not save your answers. Please retry.'},503)}
}
