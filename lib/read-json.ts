// When the Access sign-in has ended or the Worker itself fails, Cloudflare answers with an HTML page instead of the app's JSON.
export async function readJson(r:Response):Promise<any>{
  const text=await r.text();
  try{return JSON.parse(text);}catch{}
  if(r.status===413)throw new Error('This request is too large. Use smaller files and try again.');
  if(r.status>=500)throw new Error(`The server couldn’t finish this request (error ${r.status}). Try again. If it keeps happening, check the Worker’s logs in Cloudflare.`);
  throw new Error('Your sign-in may have expired. Copy any unsaved text, then reload the page to sign in again.');
}
