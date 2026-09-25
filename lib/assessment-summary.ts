import type {Assessment,AssessmentResult} from './ielts';

// The workspace lists only need titles, statuses and bands. D1 pulls those fields out of each assessment's JSON,
// so the Worker neither parses nor re-sends transcripts, feedback and file lists (that is D1's work, not the
// Worker's CPU). The full assessment is loaded when the teacher opens it (GET /api/studio?id=).
const fields=['task','track','title','status','book','test','raw_score','objective_band','confirmed'] as const;
const bands=(result:'teacher_result'|'result',prefix:string)=>[0,1,2,3].map(i=>`json_extract(data,'$.${result}.criteria[${i}].band') AS ${prefix}${i}`).join(',');
export const summarySql='SELECT id,student_id,version,created_at,'+fields.map(f=>`json_extract(data,'$.${f}') AS ${f}`).join(',')
  +`,json_type(data,'$.teacher_result') AS has_t,${bands('teacher_result','t')},json_type(data,'$.result') AS has_r,${bands('result','r')}`
  +' FROM assessments WHERE owner = ? ORDER BY created_at DESC';

// Only criterion bands are filled in; names come from criteriaFor(task) wherever they are shown.
const result=(row:Record<string,unknown>,has:string,prefix:string):AssessmentResult|null=>row[has]==='object'
  ?{criteria:[0,1,2,3].map(i=>({name:'',band:(row[prefix+i] as number|null)??null,evidence:'',advice:''})),summary:'',strengths:[],priorities:[],limitations:[]}:null;

export function summaryFromRow(row:Record<string,unknown>):Assessment&{partial:true}{
  return {id:row.id as string,student_id:row.student_id as string,version:row.version as number,created_at:row.created_at as string,
    task:row.task as string,track:row.track as string,title:row.title as string,status:row.status as string,
    book:(row.book as number|null)??null,test:(row.test as number|null)??null,raw_score:(row.raw_score as number|null)??null,objective_band:(row.objective_band as number|null)??null,
    confirmed:!!row.confirmed,prompt:'',transcript:'',notes:'',assets:[],
    teacher_result:result(row,'has_t','t'),result:result(row,'has_r','r'),partial:true};
}
