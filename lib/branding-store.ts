import {database,bucket} from './storage';
import {brandingSchema,logoType,LOGO_MAX_BYTES,type Branding} from './branding';

const logoKey=(id:string)=>'branding/'+id;
type Row={name:string;color:string;contact:string;logo_id:string|null};

export async function getBranding(owner:string):Promise<Branding|null>{
  const row=await database().prepare('SELECT name,color,contact,logo_id FROM branding WHERE owner = ?').bind(owner).first<Row>();
  return row?{name:row.name,color:row.color,contact:row.contact,logoId:row.logo_id}:null;
}

// Save the text settings and, optionally, replace or remove the logo. A new logo gets a new ID, so the
// long browser and email-proxy caching of /brand/<id> never shows a stale image.
export async function saveBranding(owner:string,input:unknown,logo:File|null,removeLogo:boolean):Promise<Branding>{
  const fields=brandingSchema.parse(input);
  const previous=await getBranding(owner);
  let logoId=removeLogo?null:previous?.logoId??null;
  if(logo){
    if(logo.size>LOGO_MAX_BYTES)throw new Error('Keep the logo under 500 KB.');
    const bytes=new Uint8Array(await logo.arrayBuffer());
    const type=logoType(bytes);
    if(!type)throw new Error('Upload the logo as a PNG or JPEG image.');
    logoId=crypto.randomUUID();
    await bucket().put(logoKey(logoId),bytes,{httpMetadata:{contentType:type},customMetadata:{owner}});
  }
  try{
    await database().prepare('INSERT INTO branding (owner,name,color,contact,logo_id,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,color=excluded.color,contact=excluded.contact,logo_id=excluded.logo_id,updated_at=excluded.updated_at')
      .bind(owner,fields.name,fields.color,fields.contact,logoId,new Date().toISOString()).run();
  }catch(e){if(logo&&logoId)await bucket().delete(logoKey(logoId)).catch(()=>{});throw e;}
  if(previous?.logoId&&previous.logoId!==logoId)await bucket().delete(logoKey(previous.logoId)).catch(()=>console.error('Orphan logo cleanup needed'));
  return {...fields,logoId};
}

export async function removeBranding(owner:string){
  const previous=await getBranding(owner);
  await database().prepare('DELETE FROM branding WHERE owner = ?').bind(owner).run();
  if(previous?.logoId)await bucket().delete(logoKey(previous.logoId)).catch(()=>console.error('Orphan logo cleanup needed'));
}

export async function logoObject(id:string){
  if(!/^[0-9a-f-]{36}$/.test(id))return null;
  return bucket().get(logoKey(id));
}
