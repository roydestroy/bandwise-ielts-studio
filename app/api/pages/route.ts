import {getTeacher} from '@/app/access-auth';
import {database,bucket} from '@/lib/storage';
import {Assessment} from '@/lib/ielts';
import {MAX_PAGE_BYTES,MAX_PDF_PAGES,pageKey} from '@/lib/pdf-pages';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
// Stores one browser-rendered PDF page (JPEG) for Qwen. The body streams straight into R2.
export async function POST(req:Request){
  const user=await getTeacher();if(!user)return json({error:'Sign in to access your private workspace.'},401);
  const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'This request came from another website.'},403);
  const url=new URL(req.url);const id=url.searchParams.get('id')||'';const key=url.searchParams.get('key')||'';const page=Number(url.searchParams.get('page'));
  if(!Number.isInteger(page)||page<1||page>MAX_PDF_PAGES)return json({error:'Use up to 20 PDF pages per AI request.'},400);
  if(req.headers.get('content-type')!=='image/jpeg')return json({error:'PDF pages must be JPEG images.'},415);
  const size=Number(req.headers.get('content-length'));
  if(!size||!req.body)return json({error:'The page image is empty.'},411);
  if(size>MAX_PAGE_BYTES)return json({error:'A PDF page is too large to send clearly. Use a smaller PDF.'},413);
  const row=await database().prepare('SELECT data FROM assessments WHERE id = ? AND owner = ?').bind(id,user.userId).first<{data:string}>();
  const asset=row&&(JSON.parse(row.data) as Assessment).assets.find(f=>f.key===key&&f.type==='application/pdf');
  if(!asset)return json({error:'Assessment not found.'},404);
  await bucket().put(pageKey(asset.key,page),req.body,{httpMetadata:{contentType:'image/jpeg'}});
  return json({page});
}
