// Bandwise answers on one address (CANONICAL_HOST, e.g. bandwiseapp.com). Any other hostname routed to the
// Worker, such as www or the old bandwise.eurognosi-remote.com, is sent there with the same path and query, so
// old links and the logos in reports already emailed keep working. Local development is left alone.
export function canonicalRedirect(url:URL,method:string,canonical:string|undefined):Response|null{
  if(!canonical)return null;
  const host=url.hostname;
  if(host===canonical||host==='localhost'||host==='127.0.0.1'||host.endsWith('.localhost'))return null;
  // 301 for page loads; 308 keeps the method and body of anything else.
  return new Response(null,{status:method==='GET'||method==='HEAD'?301:308,headers:{Location:'https://'+canonical+url.pathname+url.search,'Cache-Control':'public, max-age=3600'}});
}
