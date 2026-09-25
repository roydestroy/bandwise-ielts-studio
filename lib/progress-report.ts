import {type Assessment,type Student,taskTypes,criteriaFor,isObjective,practiceBand,displayBand} from './ielts.ts';
import {testResults,skills} from './band.ts';

// Email-safe progress report. Charts are table-based bars: email clients strip scripts and inline SVG,
// and many block images, but every major client renders table cells with widths and background colours.

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const day=(s:string)=>new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const green='#277960',amber='#b9a258',track='#e2e9e6',ink='#1d2b25',muted='#6b7a73';

export type ReportInput={student:Student;assessments:Assessment[];teacher:string;note?:string;now?:Date};
export type Report={subject:string;html:string;text:string;empty:boolean};
type Row={label:string;band:number;sub?:string};

// One horizontal bar per row, scaled 0–9. Bars at or above target are green, below target amber.
function bars(rows:Row[],target:number){
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows.map(r=>{
    const pct=Math.max(2,Math.round(r.band/9*100));
    return `<tr><td style="padding:5px 10px 5px 0;font-size:13px;color:${ink};width:38%;vertical-align:middle">${esc(r.label)}${r.sub?`<br><span style="font-size:11px;color:${muted}">${esc(r.sub)}</span>`:''}</td>`+
      `<td style="padding:5px 0;vertical-align:middle"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>`+
      `<td width="${pct}%" height="14" style="background:${r.band>=target?green:amber};border-radius:3px;font-size:1px;line-height:1px">&nbsp;</td>`+
      (pct<100?`<td width="${100-pct}%" height="14" style="background:${track};font-size:1px;line-height:1px">&nbsp;</td>`:'')+
      `</tr></table></td><td style="padding:5px 0 5px 10px;font-size:13px;font-weight:bold;color:${ink};width:40px;text-align:right;vertical-align:middle">${displayBand(r.band)}</td></tr>`;
  }).join('')}</table>`;
}
const section=(title:string,body:string)=>`<tr><td style="padding:22px 28px 4px"><h2 style="margin:0 0 10px;font-size:17px;color:${ink}">${esc(title)}</h2>${body}</td></tr>`;
const note=(s:string)=>`<p style="margin:8px 0 0;font-size:12px;color:${muted}">${s}</p>`;
const change=(values:number[])=>values.length>1?values[values.length-1]-values[0]:null;
const signed=(n:number|null,digits=1)=>n===null?'—':(n>=0?'+':'')+n.toFixed(digits);

export function buildProgressReport({student,assessments,teacher,note:teacherNote,now=new Date()}:ReportInput):Report{
  const mine=assessments.filter(a=>a.student_id===student.id);
  const reviewed=mine.filter(a=>a.status==='Reviewed'&&practiceBand(a)!==null).sort((a,b)=>a.created_at.localeCompare(b.created_at));
  const complete=testResults(mine,practiceBand).filter(r=>r.overall!==null).sort((a,b)=>a.updated.localeCompare(b.updated));
  const overall=complete.map(r=>r.overall!);
  const latestOverall=overall.at(-1)??null;
  const text:string[]=[`IELTS progress report for ${student.name} — ${day(now.toISOString())}`,'',`Target band: ${student.target.toFixed(1)}`];
  if(student.min_band!=null)text.push(`University minimum: ${student.min_band.toFixed(1)}`);
  const parts:string[]=[];

  const tiles:[string,string][]=[['Latest overall',displayBand(latestOverall)],['Target band',student.target.toFixed(1)]];
  if(student.min_band!=null)tiles.push(['University minimum',student.min_band.toFixed(1)]);
  tiles.push(['Reviewed pieces',String(reviewed.length)]);
  parts.push(`<tr><td style="padding:18px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tiles.map(([k,v])=>`<td style="padding:4px"><div style="background:#f3f7f5;border-radius:8px;padding:12px 10px;text-align:center"><div style="font-size:11px;color:${muted};text-transform:uppercase;letter-spacing:.04em">${esc(k)}</div><div style="font-size:24px;font-weight:bold;color:${k==='Latest overall'&&latestOverall!==null&&student.min_band!=null&&latestOverall<student.min_band?'#b3261e':ink}">${esc(v)}</div></div></td>`).join('')}</tr></table></td></tr>`);

  if(complete.length){
    parts.push(section('Overall band by practice test',bars(complete.map(r=>({label:`Cambridge ${r.book} Test ${r.test}`,sub:day(r.updated),band:r.overall!})),student.target)+
      note(`Change since your first complete test: <b>${signed(change(overall))}</b>. Each overall band combines Listening, Reading, Writing and Speaking from the same test.`)));
    const last=complete.at(-1)!;
    parts.push(section('Latest test by skill',bars(skills.map(s=>({label:s,band:last.skills[s].band!})),student.target)));
    text.push('','Overall band by practice test:',...complete.map(r=>`  Cambridge ${r.book} Test ${r.test}: ${r.overall!.toFixed(1)}`));
  }

  const perTask:string[]=[];
  for(const task of taskTypes){
    const items=reviewed.filter(a=>a.task===task);
    if(!items.length)continue;
    const values=items.map(a=>practiceBand(a)!);
    const shown=items.slice(-8);
    perTask.push(`<h3 style="margin:16px 0 6px;font-size:14px;color:${ink}">${esc(task)} <span style="font-weight:normal;color:${muted}">· latest ${displayBand(values.at(-1))} · change ${signed(change(values))}</span></h3>`+
      bars(shown.map(a=>({label:a.title,sub:day(a.created_at),band:practiceBand(a)!})),student.target)+
      (items.length>shown.length?note(`Showing the latest ${shown.length} of ${items.length}.`):''));
    text.push('',`${task}: latest ${displayBand(values.at(-1))}, change since first ${signed(change(values))}`);
  }
  if(perTask.length)parts.push(section('Progress in each skill',perTask.join('')+note('Bars are green at or above your target band and amber below it.')));

  const latestCriteria=[...reviewed].reverse().find(a=>!isObjective(a.task)&&a.teacher_result);
  if(latestCriteria){
    const r=latestCriteria.teacher_result!;
    const rows=criteriaFor(latestCriteria.task).map((name,i)=>({label:name,band:r.criteria[i]?.band??0}));
    const priorities=r.priorities.filter(p=>p.trim()).slice(0,4);
    parts.push(section(`Criteria in your latest ${latestCriteria.task.startsWith('Speaking')?'speaking':'writing'} (${latestCriteria.task})`,bars(rows,student.target)+
      (priorities.length?`<p style="margin:14px 0 4px;font-size:13px;font-weight:bold;color:${ink}">What to focus on next</p><ul style="margin:0;padding-left:20px;font-size:13px;color:${ink}">${priorities.map(p=>`<li style="margin:3px 0">${esc(p)}</li>`).join('')}</ul>`:'')));
    text.push('',`Latest ${latestCriteria.task} criteria:`,...rows.map(r=>`  ${r.label}: ${r.band.toFixed(1)}`));
    if(priorities.length)text.push('','What to focus on next:',...priorities.map(p=>'  - '+p));
  }

  if(!reviewed.length)parts.push(section('No reviewed work yet','<p style="margin:0;font-size:13px;color:'+ink+'">Your teacher has not finished reviewing any of your work yet. Your progress will appear here once they do.</p>'));

  const cleanNote=teacherNote?.trim();
  if(cleanNote)text.splice(1,0,'',cleanNote);
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IELTS progress report</title></head>`+
    `<body style="margin:0;padding:0;background:#eef3f1;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f1"><tr><td align="center" style="padding:24px 12px">`+
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px">`+
    `<tr><td style="padding:26px 28px 0"><div style="font-size:11px;letter-spacing:.08em;color:${green};font-weight:bold">IELTS PROGRESS REPORT</div><h1 style="margin:6px 0 2px;font-size:24px;color:${ink}">${esc(student.name)}</h1><div style="font-size:13px;color:${muted}">${esc(student.track)} · ${day(now.toISOString())} · from ${esc(teacher)}</div>`+
    (cleanNote?`<div style="margin-top:16px;padding:12px 14px;background:#f7f4e8;border-left:3px solid ${amber};font-size:14px;color:${ink};white-space:pre-wrap">${esc(cleanNote)}</div>`:'')+`</td></tr>`+
    parts.join('')+
    `<tr><td style="padding:22px 28px 26px">${note('These are practice estimates from teacher-reviewed work, not official IELTS results. Different prompts and test conditions affect how closely results compare.')}</td></tr>`+
    `</table></td></tr></table></body></html>`;
  text.push('','These are practice estimates from teacher-reviewed work, not official IELTS results.');
  return {subject:`Your IELTS progress report — ${student.name}`,html,text:text.join('\n'),empty:!reviewed.length};
}
