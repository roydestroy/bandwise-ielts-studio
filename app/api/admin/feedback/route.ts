import {currentAccount} from '@/app/access-auth';
import {database} from '@/lib/storage';
import {summariseFeedback,type FeedbackRow} from '@/lib/feedback';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});

// Every teacher's pilot survey answers, newest first, with the medians. Admins only.
export async function GET(){
  const a=await currentAccount();if(a?.status!=='active'||!a.admin)return json({error:'Only admins can see this page.'},403);
  try{
    const rows=(await database().prepare('SELECT owner,email,too_cheap AS tooCheap,bargain,expensive,too_expensive AS tooExpensive,hours_saved AS hoursSaved,comments,updated_at AS updatedAt FROM pilot_feedback ORDER BY updated_at DESC LIMIT 500').all<FeedbackRow>()).results;
    return json({rows,summary:summariseFeedback(rows)});
  }catch{return json({error:'Feedback is temporarily unavailable. Please retry.'},503)}
}
