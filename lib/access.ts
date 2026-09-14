import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';

export type Teacher={userId:string;displayName:string;email:string;fullName:string|null};
export function accessIssuer(teamDomain:string):string{
  const host=teamDomain.replace(/^https:\/\//,'').replace(/\/$/,'');
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(host))throw new Error('Configure your Cloudflare Access team domain.');
  return 'https://'+host;
}
const keys=new Map<string,ReturnType<typeof createRemoteJWKSet>>();
export async function verifyTeacher(token:string,teamDomain:string,audience:string,keyResolver?:JWTVerifyGetKey):Promise<Teacher>{
  if(!audience)throw new Error('Configure the Cloudflare Access application audience.');
  const issuer=accessIssuer(teamDomain);
  if(!keyResolver){
    if(!keys.has(issuer))keys.set(issuer,createRemoteJWKSet(new URL(issuer+'/cdn-cgi/access/certs')));
    keyResolver=keys.get(issuer)!;
  }
  const {payload}=await jwtVerify(token,keyResolver,{issuer,audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
  if(typeof payload.sub!=='string'||!payload.sub||typeof payload.email!=='string'||!payload.email.includes('@'))throw new Error('A teacher email identity is required.');
  const name=typeof payload.name==='string'?payload.name:null;
  return {userId:payload.sub,email:payload.email,displayName:name||payload.email,fullName:name};
}
