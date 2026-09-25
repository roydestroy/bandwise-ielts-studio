import type {Assessment} from './ielts';

// IELTS reports skill and overall bands in half bands. An average ending in .25 or .75 rounds up
// (6.25 → 6.5, 6.75 → 7), so halves round up too. The epsilon absorbs floating-point noise.
export const roundBand=(n:number)=>Math.floor(n*2+0.5+1e-9)/2;

export type Skill='Listening'|'Reading'|'Writing'|'Speaking';
export const skills:Skill[]=['Listening','Reading','Writing','Speaking'];
export type Part={task:string;band:number;assessment:Assessment};
export type SkillResult={band:number|null;parts:Part[];missing:string[];pending:string[]};
export type TestResult={key:string;student_id:string;book:number;test:number;track:string;skills:Record<Skill,SkillResult>;overall:number|null;updated:string};

const tasksFor:Record<Skill,string[]>={Listening:['Listening'],Reading:['Reading'],Writing:['Writing Task 1','Writing Task 2'],Speaking:['Speaking — full test']};

// Writing: Task 2 counts twice as much as Task 1.
function skillBand(skill:Skill,parts:Part[]){
  if(skill!=='Writing')return parts[0]?roundBand(parts[0].band):null;
  const t1=parts.find(p=>p.task==='Writing Task 1'),t2=parts.find(p=>p.task==='Writing Task 2');
  return t1&&t2?roundBand((t1.band+2*t2.band)/3):null;
}

// Combine one student's teacher-reviewed results for each Cambridge book and test.
// When a task was done more than once for the same test, the latest reviewed attempt counts.
// bandOf is practiceBand from ./ielts, passed in so this module stays free of runtime imports.
export function testResults(assessments:Assessment[],bandOf:(a:Assessment)=>number|null):TestResult[]{
  const groups=new Map<string,Assessment[]>();
  for(const a of assessments){
    if(!a.book||!a.test)continue;
    const key=a.student_id+':'+a.book+':'+a.test;
    groups.set(key,[...(groups.get(key)||[]),a]);
  }
  return [...groups.entries()].map(([key,items])=>{
    const latest=[...items].sort((x,y)=>y.created_at.localeCompare(x.created_at));
    const result={} as Record<Skill,SkillResult>;
    for(const skill of skills){
      const parts:Part[]=[],missing:string[]=[],pending:string[]=[];
      for(const task of tasksFor[skill]){
        const done=latest.find(a=>a.task===task&&a.status==='Reviewed'&&bandOf(a)!==null);
        if(done)parts.push({task,band:bandOf(done)!,assessment:done});
        else{missing.push(task);if(latest.some(a=>a.task===task))pending.push(task);}
      }
      result[skill]={band:skillBand(skill,parts),parts,missing,pending};
    }
    const bands=skills.map(s=>result[s].band);
    const overall=bands.every(b=>b!==null)?roundBand(bands.reduce((n,b)=>n!+b!,0)!/4):null;
    return {key,student_id:items[0].student_id,book:items[0].book!,test:items[0].test!,track:latest[0].track,skills:result,overall,updated:latest[0].created_at};
  }).sort((x,y)=>y.updated.localeCompare(x.updated));
}
