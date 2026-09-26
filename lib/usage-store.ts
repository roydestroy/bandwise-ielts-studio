import {database} from './storage';
import {estimateCost,type Usage} from './usage';
import type {ModelUsage} from './pilot-stats';

export type UsageAction='transcribe'|'assess'|'test';
type Totals={requests:number;inputTokens:number;audioTokens:number;outputTokens:number;cost:number;unpriced:number};
export type UsageSummary={since:string|null;months:(Totals&{month:string})[];skills:{skill:'Writing'|'Speaking';assessments:number;cost:number;unpriced:number}[];models:(Totals&{provider:string;model:string;platform:number})[]};

// Write one row per provider call. `ok` is whether the whole action succeeded: a call can cost tokens even
// when its answer is then rejected.
export async function recordUsage(owner:string,action:UsageAction,usage:Usage[],ok:boolean,assessment?:{id:string;task:string}){
  if(!usage.length)return;
  const db=database();const at=new Date();
  await db.batch(usage.map(u=>db.prepare('INSERT INTO usage_events (id,owner,assessment_id,task,action,kind,provider,model,input_tokens,audio_tokens,output_tokens,cost_usd,ok,platform,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),owner,assessment?.id??null,assessment?.task??null,action,u.kind,u.provider,u.model,u.inputTokens,u.audioTokens,u.outputTokens,estimateCost(u,at),ok?1:0,u.platform?1:0,at.toISOString())));
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
    db.prepare(`SELECT provider,model,platform,${totals} FROM usage_events WHERE owner = ? GROUP BY provider,model,platform ORDER BY requests DESC`).bind(owner),
  ]);
  return {since:(first.results[0] as {since:string|null}|undefined)?.since??null,months:months.results as UsageSummary['months'],skills:skills.results as UsageSummary['skills'],models:models.results as UsageSummary['models']};
}

// Every workspace's usage for one month (YYYY-MM, UTC), for the admin's pilot view. Workspaces with no
// activity that month are included so the table also shows who signed up and hasn't started.
const skillOf="CASE WHEN task LIKE 'Speaking%' THEN 'Speaking' ELSE 'Writing' END";
export async function adminUsage(month:string){
  const db=database();const like=month+'%';
  const [months,usage,saved,models]=await db.batch([
    db.prepare('SELECT DISTINCT substr(created_at,1,7) AS month FROM usage_events ORDER BY month DESC LIMIT 24'),
    db.prepare(`SELECT owner,
        COUNT(DISTINCT CASE WHEN assessment_id IS NOT NULL AND action IN ('transcribe','assess') AND ${skillOf}='Writing' THEN assessment_id END) AS writing,
        COUNT(DISTINCT CASE WHEN assessment_id IS NOT NULL AND action IN ('transcribe','assess') AND ${skillOf}='Speaking' THEN assessment_id END) AS speaking,
        COUNT(DISTINCT CASE WHEN platform = 1 AND assessment_id IS NOT NULL AND action IN ('transcribe','assess') AND ${skillOf}='Writing' THEN assessment_id END) AS platformWriting,
        COUNT(DISTINCT CASE WHEN platform = 1 AND assessment_id IS NOT NULL AND action IN ('transcribe','assess') AND ${skillOf}='Speaking' THEN assessment_id END) AS platformSpeaking,
        COALESCE(SUM(CASE WHEN assessment_id IS NOT NULL AND action IN ('transcribe','assess') AND ${skillOf}='Writing' THEN cost_usd END),0) AS writingCost,
        COALESCE(SUM(CASE WHEN assessment_id IS NOT NULL AND action IN ('transcribe','assess') AND ${skillOf}='Speaking' THEN cost_usd END),0) AS speakingCost,
        COALESCE(SUM(cost_usd),0) AS cost,COALESCE(SUM(CASE WHEN platform = 1 THEN cost_usd END),0) AS platformCost,SUM(cost_usd IS NULL) AS unpriced,COUNT(*) AS requests
      FROM usage_events WHERE created_at LIKE ? GROUP BY owner`).bind(like),
    db.prepare(`SELECT owner,COUNT(*) AS saved,SUM(json_extract(data,'$.teacher_result') IS NOT NULL) AS reviewed FROM assessments WHERE created_at LIKE ? GROUP BY owner`).bind(like),
    db.prepare(`SELECT ${skillOf} AS skill,provider,model,platform,COUNT(DISTINCT assessment_id) AS assessments,COALESCE(SUM(cost_usd),0) AS cost,SUM(cost_usd IS NULL) AS unpriced,
        SUM(input_tokens) AS inputTokens,SUM(audio_tokens) AS audioTokens,SUM(output_tokens) AS outputTokens
      FROM usage_events WHERE created_at LIKE ? AND assessment_id IS NOT NULL AND action IN ('transcribe','assess') GROUP BY skill,provider,model,platform ORDER BY skill DESC,assessments DESC`).bind(like),
  ]);
  type U={owner:string;writing:number;speaking:number;platformWriting:number;platformSpeaking:number;writingCost:number;speakingCost:number;cost:number;platformCost:number;unpriced:number;requests:number};
  type S={owner:string;saved:number;reviewed:number};
  return {
    months:(months.results as {month:string}[]).map(m=>m.month),
    usage:new Map((usage.results as U[]).map(u=>[u.owner,u])),
    saved:new Map((saved.results as S[]).map(s=>[s.owner,s])),
    models:models.results as ModelUsage[],
  };
}
