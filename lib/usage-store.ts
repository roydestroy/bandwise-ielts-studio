import {database} from './storage';
import {estimateCost,type Usage} from './usage';

export type UsageAction='transcribe'|'assess'|'test';
type Totals={requests:number;inputTokens:number;audioTokens:number;outputTokens:number;cost:number;unpriced:number};
export type UsageSummary={since:string|null;months:(Totals&{month:string})[];skills:{skill:'Writing'|'Speaking';assessments:number;cost:number;unpriced:number}[];models:(Totals&{provider:string;model:string})[]};

// Write one row per provider call. `ok` is whether the whole action succeeded: a call can cost tokens even
// when its answer is then rejected.
export async function recordUsage(owner:string,action:UsageAction,usage:Usage[],ok:boolean,assessment?:{id:string;task:string}){
  if(!usage.length)return;
  const db=database();const at=new Date();
  await db.batch(usage.map(u=>db.prepare('INSERT INTO usage_events (id,owner,assessment_id,task,action,kind,provider,model,input_tokens,audio_tokens,output_tokens,cost_usd,ok,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),owner,assessment?.id??null,assessment?.task??null,action,u.kind,u.provider,u.model,u.inputTokens,u.audioTokens,u.outputTokens,estimateCost(u,at),ok?1:0,at.toISOString())));
}
// Recording is bookkeeping: never let it turn a finished assessment into an error.
export async function tryRecordUsage(...args:Parameters<typeof recordUsage>){
  try{await recordUsage(...args)}catch(e){console.error('Usage recording failed',e instanceof Error?e.message:'Unknown error')}
}

const totals='COUNT(*) AS requests,SUM(input_tokens) AS inputTokens,SUM(audio_tokens) AS audioTokens,SUM(output_tokens) AS outputTokens,COALESCE(SUM(cost_usd),0) AS cost,SUM(cost_usd IS NULL) AS unpriced';
export async function usageSummary(owner:string):Promise<UsageSummary>{
  const db=database();
  const [first,months,skills,models]=await db.batch([
    db.prepare('SELECT MIN(created_at) AS since FROM usage_events WHERE owner = ?').bind(owner),
    db.prepare(`SELECT substr(created_at,1,7) AS month,${totals} FROM usage_events WHERE owner = ? GROUP BY month ORDER BY month DESC LIMIT 12`).bind(owner),
    // Cost per assessment includes its transcription and any retries, which is what a plan has to pay for.
    db.prepare(`SELECT CASE WHEN task LIKE 'Speaking%' THEN 'Speaking' ELSE 'Writing' END AS skill,COUNT(DISTINCT assessment_id) AS assessments,COALESCE(SUM(cost_usd),0) AS cost,SUM(cost_usd IS NULL) AS unpriced FROM usage_events WHERE owner = ? AND assessment_id IS NOT NULL AND action IN ('transcribe','assess') GROUP BY skill ORDER BY skill DESC`).bind(owner),
    db.prepare(`SELECT provider,model,${totals} FROM usage_events WHERE owner = ? GROUP BY provider,model ORDER BY requests DESC`).bind(owner),
  ]);
  return {since:(first.results[0] as {since:string|null}|undefined)?.since??null,months:months.results as UsageSummary['months'],skills:skills.results as UsageSummary['skills'],models:models.results as UsageSummary['models']};
}
