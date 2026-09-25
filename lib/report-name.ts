// Browsers name a "Save as PDF" file after the page title, so this becomes the report's file name.
export function reportName(student:string,a:{task:string;book?:number|null;test?:number|null}):string{
  const source=[a.book?'Cambridge '+a.book:'',a.test?'Test '+a.test:''].filter(Boolean).join(' ');
  return [student,source,a.task].map(s=>s.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean).join(' - ');
}
