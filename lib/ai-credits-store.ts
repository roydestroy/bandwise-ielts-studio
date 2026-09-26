import {env} from 'cloudflare:workers';
import {database} from './storage';
import {CREDITS} from './pilot-stats.ts';
import {monthlyLimit,monthOf,renewsOn,type CreditStatus} from './ai-credits.ts';

// Bandwise AI credits a workspace has used this month: its AI-marked assessments that ran on the platform key.
export async function creditStatus(owner:string,at=new Date()):Promise<CreditStatus>{
  const db=database();const month=monthOf(at);
  const [ws,used]=await db.batch([
    db.prepare('SELECT ai_credit_limit AS aiCreditLimit FROM workspaces WHERE id = ?').bind(owner),
    db.prepare(`SELECT COUNT(DISTINCT CASE WHEN task LIKE 'Speaking%' THEN assessment_id END) AS speaking,COUNT(DISTINCT CASE WHEN task NOT LIKE 'Speaking%' THEN assessment_id END) AS writing
      FROM usage_events WHERE owner = ? AND platform = 1 AND assessment_id IS NOT NULL AND action IN ('transcribe','assess') AND created_at LIKE ?`).bind(owner,month+'%'),
  ]);
  const override=(ws.results[0] as {aiCreditLimit:number|null}|undefined)?.aiCreditLimit;
  const u=(used.results[0] as {writing:number;speaking:number}|undefined)??{writing:0,speaking:0};
  return {month,used:u.writing*CREDITS.writing+u.speaking*CREDITS.speaking,limit:monthlyLimit(env.PLATFORM_MONTHLY_CREDITS,override),renews:renewsOn(at).toISOString()};
}
// Whether this assessment already used Bandwise AI this month, and so is already paid for.
export async function chargedThisMonth(owner:string,assessmentId:string,at=new Date()){
  return !!await database().prepare("SELECT 1 FROM usage_events WHERE owner = ? AND assessment_id = ? AND platform = 1 AND action IN ('transcribe','assess') AND created_at LIKE ? LIMIT 1").bind(owner,assessmentId,monthOf(at)+'%').first();
}
export async function setCreditLimit(workspace:string,limit:number|null){
  const out=await database().prepare('UPDATE workspaces SET ai_credit_limit = ? WHERE id = ?').bind(limit,workspace).run();
  if(!out.meta.changes)throw new Error('Workspace not found.');
}
