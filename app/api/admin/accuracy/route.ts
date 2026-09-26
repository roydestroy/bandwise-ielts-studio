import {currentAccount} from '@/app/access-auth';
import {database} from '@/lib/storage';
import {accuracyReport,type ReviewedPair} from '@/lib/accuracy';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});

const bands=(r:'result'|'teacher_result')=>[0,1,2,3].map(i=>`json_extract(data,'$.${r}.criteria[${i}].band') AS ${r}${i}`).join(',');
type Row={task:string;model:string|null}&Record<string,number|null>;

// AI bands against the teacher's own, across every workspace. Admins only. Sample assessments are left out.
export async function GET(){
  const a=await currentAccount();if(a?.status!=='active'||!a.admin)return json({error:'Only admins can see this page.'},403);
  try{
    const rows=await database().prepare(`SELECT json_extract(data,'$.task') AS task,json_extract(data,'$.model') AS model,${bands('result')},${bands('teacher_result')} FROM assessments
      WHERE json_extract(data,'$.result') IS NOT NULL AND json_extract(data,'$.teacher_result') IS NOT NULL AND COALESCE(json_extract(data,'$.sample'),0) = 0`).all<Row>();
    const pairs:ReviewedPair[]=rows.results.map(r=>({task:r.task,model:r.model,ai:[0,1,2,3].map(i=>r['result'+i]),teacher:[0,1,2,3].map(i=>r['teacher_result'+i])}));
    return json(accuracyReport(pairs));
  }catch{return json({error:'The accuracy report is temporarily unavailable. Please retry.'},503)}
}
