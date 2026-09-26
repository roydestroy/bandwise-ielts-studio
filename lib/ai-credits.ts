import {CREDITS} from './pilot-stats.ts';

// A monthly allowance on Bandwise AI, so one workspace can't run up the platform key's bill. Credits follow
// the draft plan: a writing assessment is 1 and a speaking test 3, charged once per assessment per month
// however many times it is transcribed or re-assessed. Calls on a teacher's own key are never limited.
export const DEFAULT_MONTHLY_CREDITS=150;

export const creditsFor=(task:string)=>task.startsWith('Speaking')?CREDITS.speaking:CREDITS.writing;
export const monthOf=(at:Date)=>at.toISOString().slice(0,7);
// The first day of next month (UTC), when the allowance renews.
export const renewsOn=(at:Date)=>new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth()+1,1));

// The workspace's own limit when an admin set one, else PLATFORM_MONTHLY_CREDITS, else the default.
export function monthlyLimit(setting:string|undefined,override:number|null|undefined){
  if(override!==null&&override!==undefined)return override;
  const n=Number(setting?.trim());
  return setting?.trim()&&Number.isInteger(n)&&n>=0?n:DEFAULT_MONTHLY_CREDITS;
}

export type CreditStatus={month:string;used:number;limit:number;renews:string};

export class OutOfCredits extends Error{}

// Whether one more AI run on this assessment fits. An assessment already charged this month runs free.
export function checkCredits(s:CreditStatus,task:string,alreadyCharged:boolean){
  if(alreadyCharged)return;
  const need=creditsFor(task);
  if(s.used+need<=s.limit)return;
  const renews=new Date(s.renews).toLocaleDateString('en-GB',{day:'numeric',month:'long',timeZone:'UTC'});
  throw new OutOfCredits(`This ${need===1?'assessment needs 1 Bandwise AI credit':'speaking test needs '+need+' Bandwise AI credits'}, and you have used ${s.used} of your ${s.limit} for this month. They renew on ${renews}. To keep going now, add your own AI key in Settings → AI connection, or ask Bandwise to raise your limit.`);
}
