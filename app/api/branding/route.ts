import {getTeacher} from '@/app/access-auth';
import {getBranding,saveBranding,removeBranding} from '@/lib/branding-store';
import {reportBrand} from '@/lib/branding';
import {z} from 'zod';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'private, no-store'}});

export async function GET(){const user=await getTeacher();if(!user)return json({error:'Sign in to manage branding.'},401);try{return json({branding:reportBrand(await getBranding(user.userId))})}catch{return json({error:'Branding is temporarily unavailable. Please retry.'},503)}}

export async function POST(req:Request){
  const user=await getTeacher();if(!user)return json({error:'Sign in to manage branding.'},401);
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Cross-site request rejected.'},403);
  if(Number(req.headers.get('content-length')||0)>1024*1024)return json({error:'Keep the logo under 500 KB.'},413);
  try{
    const form=await req.formData();
    if(form.get('action')==='remove'){await removeBranding(user.userId);return json({branding:null,message:'Branding removed. Reports use the standard layout.'});}
    const logo=form.get('logo');
    const saved=await saveBranding(user.userId,{name:form.get('name'),color:form.get('color'),contact:form.get('contact')||''},logo instanceof File&&logo.size>0?logo:null,form.get('remove_logo')==='1');
    return json({branding:reportBrand(saved),message:'Branding saved. It appears on printed and emailed reports.'});
  }catch(e){if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||'Check the branding fields.'},400);return json({error:e instanceof Error?e.message:'Could not save branding. Please retry.'},400);}
}
