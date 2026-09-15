import {z} from 'zod';
export const taskTypes=['Writing Task 1','Writing Task 2','Speaking — full test','Speaking — Part 1','Speaking — Part 2','Speaking — Part 3','Listening','Reading'] as const;
export const tracks=['Academic','General Training'] as const;
export const objectiveTasks=['Listening','Reading'] as const;
export const isObjective=(task:string)=>(objectiveTasks as readonly string[]).includes(task);
export const criteriaFor=(task:string)=>task.startsWith('Speaking')?['Fluency and coherence','Lexical resource','Grammatical range and accuracy','Pronunciation']:[task==='Writing Task 1'?'Task achievement':'Task response','Coherence and cohesion','Lexical resource','Grammatical range and accuracy'];
export const bandSchema=z.number().min(0).max(9).multipleOf(.5);
export const criterionSchema=z.object({name:z.string().max(100),band:bandSchema.nullable(),evidence:z.string().max(3000),advice:z.string().max(3000)});
export const resultSchema=z.object({criteria:z.array(criterionSchema).length(4),summary:z.string().max(5000),strengths:z.array(z.string().max(1000)).max(8),priorities:z.array(z.string().max(1000)).max(8),limitations:z.array(z.string().max(1000)).max(8)});
export type AssessmentResult=z.infer<typeof resultSchema>;
export type Student={id:string;name:string;target:number;min_band:number|null;track:string;created_at:string};
export type Asset={key:string;name:string;type:string;size:number;role:'submission'|'prompt'};
export type Assessment={id:string;student_id:string;task:string;track:string;title:string;prompt:string;transcript:string;assets:Asset[];result:AssessmentResult|null;teacher_result:AssessmentResult|null;notes:string;status:string;confirmed:boolean;created_at:string;version:number;model?:string;rubric_date?:string;book?:number|null;test?:number|null;raw_score?:number|null;objective_band?:number|null};
export const average=(r:AssessmentResult|null)=>r&&r.criteria.every(c=>c.band!==null)?r.criteria.reduce((a,c)=>a+(c.band??0),0)/4:null;
export const displayBand=(n:number|null|undefined)=>n==null?'—':(Math.round(n*2)/2).toFixed(1);
export const practiceBand=(a:Assessment)=>isObjective(a.task)?(a.objective_band??null):average(a.teacher_result||a.result);
export const blankResult=(task:string):AssessmentResult=>({criteria:criteriaFor(task).map(name=>({name,band:null,evidence:'',advice:''})),summary:'',strengths:[],priorities:[],limitations:[]});
export const rubricLinks={writing:'https://ielts.org/cdn/ielts-guides/ielts-writing-band-descriptors.pdf',speaking:'https://cdn.ielts.org/ielts-guides/ielts-speaking-band-descriptors.pdf',scoring:'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail'};
export const books=Array.from({length:20},(_,i)=>i+1);
export const testNumbers=[1,2,3,4];
// Approximate, indicative conversion tables (published Cambridge-style raw-score bands).
// Official per-book tables vary by roughly ±1 raw mark; scores below band 3 are extrapolated.
const listeningThresholds:[number,number][]=[[39,9],[37,8.5],[35,8],[32,7.5],[30,7],[26,6.5],[23,6],[18,5.5],[16,5],[13,4.5],[11,4],[8,3.5],[6,3],[4,2.5],[2,2],[0,1]];
const readingAcademicThresholds:[number,number][]=[[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[8,3.5],[6,3],[4,2.5],[2,2],[0,1]];
const readingGeneralThresholds:[number,number][]=[[40,9],[39,8.5],[38,8],[36,7.5],[34,7],[32,6.5],[30,6],[27,5.5],[23,5],[19,4.5],[15,4],[12,3.5],[9,3],[6,2.5],[3,2],[0,1]];
const fromThresholds=(raw:number,thresholds:[number,number][])=>thresholds.find(([min])=>raw>=min)?.[1]??1;
export const objectiveBand=(task:'Listening'|'Reading',track:string,raw:number)=>task==='Listening'?fromThresholds(raw,listeningThresholds):fromThresholds(raw,track==='General Training'?readingGeneralThresholds:readingAcademicThresholds);
