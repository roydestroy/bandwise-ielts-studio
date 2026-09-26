import {logoObject} from '@/lib/branding-store';
export const dynamic='force-dynamic';

// A teacher's report logo. Public on purpose (outside /app and /api, so Cloudflare Access doesn't cover it):
// emailed reports load it from students' inboxes. The ID is random and changes whenever the logo does, so it
// can be cached for good. Only PNG and JPEG are ever stored (lib/branding.ts).
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const logo=await logoObject(id).catch(()=>null);
  if(!logo)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
  return new Response(logo.body,{headers:{
    'Content-Type':logo.httpMetadata?.contentType||'application/octet-stream',
    'Cache-Control':'public, max-age=31536000, immutable',
    'X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'",
  }});
}
