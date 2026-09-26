import {headers} from 'next/headers';
import {auth,authEnabled} from '@/lib/auth';
export const dynamic='force-dynamic';

// End the Bandwise session and return to the home page. POST only, so another site can't sign people out.
export async function POST(req:Request){
  const origin=req.headers.get('origin');
  if(origin&&origin!==new URL(req.url).origin)return new Response('Cross-site request rejected.',{status:403});
  const out=new Headers({Location:'/'});
  if(authEnabled()){
    try{const res=await auth().api.signOut({headers:await headers(),asResponse:true});for(const c of res.headers.getSetCookie())out.append('Set-Cookie',c);}
    catch{/* no session: nothing to end */}
  }
  return new Response(null,{status:303,headers:out});
}
