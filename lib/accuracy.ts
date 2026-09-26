// How close the AI's bands are to the teacher's, for every assessment a teacher reviewed. This is the test of
// whether Bandwise is worth paying for: the plan's bar is within about half a band of the teacher.

export type ReviewedPair={task:string;model:string|null;ai:(number|null)[];teacher:(number|null)[]};
export type Agreement={n:number;mae:number|null;bias:number|null;within:number|null};
export type AccuracyReport={
  assessments:number;
  skills:{skill:'Writing'|'Speaking';overall:Agreement;criteria:{name:string;agreement:Agreement}[]}[];
  models:{model:string;overall:Agreement}[];
};

const CRITERIA={
  Writing:['Task achievement / response','Coherence and cohesion','Lexical resource','Grammatical range and accuracy'],
  Speaking:['Fluency and coherence','Lexical resource','Grammatical range and accuracy','Pronunciation'],
} as const;

// A task band is the mean of its four criteria, rounded to the nearest half band.
export function taskBand(bands:(number|null)[]){
  if(bands.length!==4||bands.some(b=>b===null))return null;
  return Math.round((bands as number[]).reduce((a,b)=>a+b,0)/4*2)/2;
}

// Mean absolute difference, mean signed difference (AI minus teacher: positive means the AI marks higher),
// and the share of pairs no more than half a band apart.
export function agreement(pairs:[number,number][]):Agreement{
  if(!pairs.length)return {n:0,mae:null,bias:null,within:null};
  const d=pairs.map(([ai,t])=>ai-t);
  return {n:pairs.length,mae:d.reduce((s,x)=>s+Math.abs(x),0)/d.length,bias:d.reduce((s,x)=>s+x,0)/d.length,within:d.filter(x=>Math.abs(x)<=.5).length/d.length};
}

export function accuracyReport(rows:ReviewedPair[]):AccuracyReport{
  const skillOf=(task:string)=>task.startsWith('Speaking')?'Speaking' as const:'Writing' as const;
  const overall=(rs:ReviewedPair[])=>agreement(rs.flatMap(r=>{const a=taskBand(r.ai),t=taskBand(r.teacher);return a===null||t===null?[]:[[a,t] as [number,number]]}));
  const skills=(['Writing','Speaking'] as const).map(skill=>{
    const rs=rows.filter(r=>skillOf(r.task)===skill);
    return {skill,overall:overall(rs),criteria:CRITERIA[skill].map((name,i)=>({name,agreement:agreement(rs.flatMap(r=>{const a=r.ai[i],t=r.teacher[i];return a==null||t==null?[]:[[a,t] as [number,number]]}))}))};
  }).filter(s=>s.criteria.some(c=>c.agreement.n));
  const models=[...new Set(rows.map(r=>r.model||'Unknown'))].map(model=>({model,overall:overall(rows.filter(r=>(r.model||'Unknown')===model))})).sort((a,b)=>b.overall.n-a.overall.n);
  return {assessments:rows.length,skills,models};
}
