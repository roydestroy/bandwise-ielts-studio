// Short-lived signed download links (S3 SigV4 query signing) for single R2 objects, so an AI provider can
// fetch a file itself and the Worker never has to read or encode it. Each link opens one object for a few
// minutes; Cloudflare Access still guards the app. Returns null when R2 API credentials are not configured.
export type LinkConfig={accountId:string;bucket:string;accessKeyId:string;secretAccessKey:string};
export const LINK_SECONDS=900;

const enc=new TextEncoder();
const hex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function hmac(key:BufferSource,data:string){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return crypto.subtle.sign('HMAC',k,enc.encode(data));}
// RFC 3986 encoding as SigV4 expects: everything but A-Z a-z 0-9 - _ . ~ is percent-encoded.
const uriEncode=(s:string)=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());

export async function presign({host,path,region,service,accessKeyId,secretAccessKey,expires,now}:{host:string;path:string;region:string;service:string;accessKeyId:string;secretAccessKey:string;expires:number;now:Date}){
  const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),day=stamp.slice(0,8),scope=`${day}/${region}/${service}/aws4_request`;
  const canonicalPath=path.split('/').map(uriEncode).join('/');
  const query=[['X-Amz-Algorithm','AWS4-HMAC-SHA256'],['X-Amz-Credential',`${accessKeyId}/${scope}`],['X-Amz-Date',stamp],['X-Amz-Expires',String(expires)],['X-Amz-SignedHeaders','host']]
    .map(([k,v])=>uriEncode(k)+'='+uriEncode(v)).sort().join('&');
  const request=['GET',canonicalPath,query,'host:'+host+'\n','host','UNSIGNED-PAYLOAD'].join('\n');
  const toSign=['AWS4-HMAC-SHA256',stamp,scope,hex(await crypto.subtle.digest('SHA-256',enc.encode(request)))].join('\n');
  let key:ArrayBuffer=await hmac(enc.encode('AWS4'+secretAccessKey),day);
  for(const part of [region,service,'aws4_request'])key=await hmac(key,part);
  return `https://${host}${canonicalPath}?${query}&X-Amz-Signature=${hex(await hmac(key,toSign))}`;
}

export function linkConfig(env:{R2_ACCOUNT_ID?:string;R2_BUCKET_NAME?:string;R2_ACCESS_KEY_ID?:string;R2_SECRET_ACCESS_KEY?:string}):LinkConfig|null{
  const {R2_ACCOUNT_ID:accountId,R2_BUCKET_NAME:bucket,R2_ACCESS_KEY_ID:accessKeyId,R2_SECRET_ACCESS_KEY:secretAccessKey}=env;
  if(!accountId||!bucket||!accessKeyId||!secretAccessKey||!/^[0-9a-f]{32}$/.test(accountId)||!/^[a-z0-9-]{3,63}$/.test(bucket))return null;
  return {accountId,bucket,accessKeyId,secretAccessKey};
}

export function objectLink(c:LinkConfig,key:string,now=new Date()){
  return presign({host:c.accountId+'.r2.cloudflarestorage.com',path:'/'+c.bucket+'/'+key,region:'auto',service:'s3',accessKeyId:c.accessKeyId,secretAccessKey:c.secretAccessKey,expires:LINK_SECONDS,now});
}
