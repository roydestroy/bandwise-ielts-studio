// Turns one month of per-workspace usage into the numbers a price needs: how much a typical and a heavy
// teacher uses, what an assessment costs, and how many teachers fit each draft plan. Pure, so it can be
// tested and recomputed in the browser when the admin leaves a workspace out.

export type WorkspaceUsage={
  id:string;name:string|null;email:string|null;students:number;
  writing:number;speaking:number;       // AI-marked assessments (transcribed or assessed) this month
  saved:number;reviewed:number;         // assessments created this month, and how many have the teacher's marks
  writingCost:number;speakingCost:number; // the cost of those assessments, transcription and retries included
  cost:number;platformCost:number;unpriced:number;requests:number;
  platformCredits:number;creditLimit:number;customLimit:boolean; // Bandwise AI allowance (lib/ai-credits.ts)
};
export type ModelUsage={skill:'Writing'|'Speaking';provider:string;model:string;platform:number;assessments:number;cost:number;unpriced:number;inputTokens:number;audioTokens:number;outputTokens:number};

// The draft credit rule and plans from docs/SUBSCRIPTION_PLAN.md: a writing assessment costs 1 credit and a
// full speaking test 3. Change these with the plan, not separately.
export const CREDITS={writing:1,speaking:3};
export const PLANS=[{name:'Free trial',credits:15},{name:'Tutor',credits:120},{name:'Pro',credits:400}] as const;

export const credits=(w:Pick<WorkspaceUsage,'writing'|'speaking'>)=>w.writing*CREDITS.writing+w.speaking*CREDITS.speaking;

// Nearest-rank percentile: the smallest value with at least p of the values at or below it.
export function percentile(values:number[],p:number){
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1))];
}

export type PilotSummary={
  active:number;writing:number;speaking:number;cost:number;unpriced:number;
  costPerWriting:number|null;costPerSpeaking:number|null;costPerCredit:number|null;
  typicalCredits:number;heavyCredits:number;maxCredits:number;heavyCost:number|null;
  plans:{name:string;credits:number;fit:number}[];
};

// "Active" means at least one AI-marked assessment this month; accounts that only signed up don't pull the
// averages down.
export function summarise(rows:WorkspaceUsage[]):PilotSummary{
  const active=rows.filter(r=>r.writing+r.speaking>0);
  const sum=(f:(r:WorkspaceUsage)=>number)=>active.reduce((s,r)=>s+f(r),0);
  const writing=sum(r=>r.writing),speaking=sum(r=>r.speaking);
  const costPerWriting=writing?sum(r=>r.writingCost)/writing:null,costPerSpeaking=speaking?sum(r=>r.speakingCost)/speaking:null;
  const used=writing*CREDITS.writing+speaking*CREDITS.speaking;
  const cost=sum(r=>r.cost);
  const perTeacher=active.map(credits);
  const heavyCredits=percentile(perTeacher,.8);
  const costPerCredit=used?cost/used:null;
  return {
    active:active.length,writing,speaking,cost,unpriced:sum(r=>r.unpriced),
    costPerWriting,costPerSpeaking,costPerCredit,
    typicalCredits:percentile(perTeacher,.5),heavyCredits,maxCredits:perTeacher.length?Math.max(...perTeacher):0,
    heavyCost:costPerCredit===null?null:heavyCredits*costPerCredit,
    plans:PLANS.map(p=>({...p,fit:perTeacher.filter(c=>c<=p.credits).length})),
  };
}
