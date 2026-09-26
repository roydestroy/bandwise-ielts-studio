import {auth,authEnabled} from '@/lib/auth';
export const dynamic='force-dynamic';

// Better Auth's endpoints: Google sign-in and its callback, sending and checking email codes, sessions.
async function handle(req:Request){
  if(!authEnabled())return Response.json({error:'Sign-in is not set up yet.'},{status:404});
  return auth().handler(req);
}
export {handle as GET,handle as POST};
