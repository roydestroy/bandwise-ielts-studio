import {getTeacher} from '@/app/access-auth';
import {database} from '@/lib/storage';
import {mailState,saveMail,removeMail,markTested,sendMail} from '@/lib/email-store';
import {mailConfigSchema} from '@/lib/email-settings';
import {buildProgressReport} from '@/lib/progress-report';
import {getBranding} from '@/lib/branding-store';
import {reportBrand} from '@/lib/branding';
import type {Assessment,Student} from '@/lib/ielts';
import {z} from 'zod';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});
// An `assessments` row: the assessment itself is JSON in `data`.
type AssessmentRow={id:string;student_id:string;data:string;version:number;created_at:string};
const parseRow=(row:AssessmentRow):Assessment=>({...JSON.parse(row.data),id:row.id,student_id:row.student_id,version:row.version,created_at:row.created_at});

// `origin` makes the logo URL absolute: the report is read in an email app, not on this site.
async function report(owner:string,teacher:string,body:unknown,origin:string){
  const {id,note}=z.object({id:z.string().uuid(),note:z.string().max(3000).optional()}).parse(body);
  const db=database();
  const student=await db.prepare('SELECT id,name,email,target,min_band,track,created_at FROM students WHERE id = ? AND owner = ?').bind(id,owner).first<Student>();
  if(!student)throw new Error('Student not found.');
  const [rows,branding]=await Promise.all([db.prepare('SELECT * FROM assessments WHERE owner = ? AND student_id = ?').bind(owner,id).all<AssessmentRow>(),getBranding(owner)]);
  return {student,report:buildProgressReport({student,assessments:rows.results.map(parseRow),teacher,note,brand:reportBrand(branding,origin)})};
}

export async function GET(){const user=await getTeacher();if(!user)return json({error:'Sign in to manage email.'},401);try{return json(await mailState(user.userId))}catch{return json({error:'Email settings are temporarily unavailable. Please retry.'},503)}}

export async function POST(req:Request){
  const user=await getTeacher();if(!user)return json({error:'Sign in to manage email.'},401);
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Cross-site request rejected.'},403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON is required.'},415);
  try{
    const text=await req.text();if(text.length>20000)return json({error:'Request is too large.'},413);
    const body=JSON.parse(text);const owner=user.userId;const teacher=user.fullName||user.displayName;
    if(body.action==='save'){
      const config=mailConfigSchema.parse(body);
      const password=z.string().max(500).optional().parse(body.password||undefined);
      await saveMail(owner,config,password);return json({saved:true,message:'Mailbox saved. Send a test email to check it.'});
    }
    if(body.action==='remove'){await removeMail(owner);return json({removed:true,message:'Mailbox disconnected. The saved password was deleted.'});}
    if(body.action==='test'){
      const {config}=await mailState(owner);if(!config)throw new Error('Save your mailbox first.');
      await sendMail(owner,{to:{email:config.fromEmail},subject:'Bandwise test email',text:'Your mailbox is connected. Progress reports will be sent from this address.',html:'<p>Your mailbox is connected. Progress reports will be sent from this address.</p>'});
      await markTested(owner);return json({tested:true,message:'Test email sent to '+config.fromEmail+'. Check that it arrived.'});
    }
    if(body.action==='preview'){const {student,report:r}=await report(owner,teacher,body,new URL(req.url).origin);return json({html:r.html,subject:r.subject,to:student.email,empty:r.empty});}
    if(body.action==='send'){
      const {student,report:r}=await report(owner,teacher,body,new URL(req.url).origin);
      if(!student.email)throw new Error('Add an email address to '+student.name+'’s student record first.');
      await sendMail(owner,{to:{name:student.name,email:student.email},subject:r.subject,html:r.html,text:r.text});
      return json({sent:true,message:'Progress report sent to '+student.email+'.'});
    }
    return json({error:'Unknown email action.'},400);
  }catch(e){if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||'Check your email settings.'},400);return json({error:e instanceof Error?e.message:'Could not complete the request. Please retry.'},400);}
}
