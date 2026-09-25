import {Buffer} from 'node:buffer';

// The official band-descriptor PDFs rarely change. Keep one copy in R2, refreshed weekly, plus the forms each
// provider needs (base64 for inline providers, extracted text for Qwen), so an assessment does not download,
// encode or parse the PDF again. If a refresh fails, the previous copy is used.
export const RUBRIC_MAX_AGE=7*24*60*60*1000;
type Store=Pick<R2Bucket,'get'|'put'|'head'>;
export type Rubric={key:string;fetchedAt:string};

export async function rubricPdf(store:Store,kind:'writing'|'speaking',url:string,fetcher:typeof fetch=fetch,now=Date.now()):Promise<Rubric>{
  const key='rubric/'+kind+'.pdf';
  const cached=await store.head(key);
  const fetchedAt=cached?.customMetadata?.fetchedAt;
  if(cached&&fetchedAt&&cached.customMetadata?.source===url&&now-Date.parse(fetchedAt)<RUBRIC_MAX_AGE)return {key,fetchedAt};
  try{
    const r=await fetcher(url,{signal:AbortSignal.timeout(20000)});
    if(!r.ok||!r.body)throw new Error('HTTP '+r.status);
    const stamp=new Date(now).toISOString();
    // Stream straight into R2: the Worker never holds or encodes the PDF here.
    await store.put(key,r.body,{httpMetadata:{contentType:'application/pdf'},customMetadata:{fetchedAt:stamp,source:url}});
    return {key,fetchedAt:stamp};
  }catch{
    if(cached&&fetchedAt)return {key,fetchedAt};
    throw new Error('The official rubric is temporarily unavailable. Assessment was stopped; please retry later.');
  }
}

// Derived copies record which PDF download they came from, so a refreshed PDF replaces them.
async function derived(store:Store,rubric:Rubric,suffix:'b64'|'txt',make:(pdf:ArrayBuffer)=>Promise<string>){
  const key=rubric.key.replace(/\.pdf$/,'.'+suffix);
  const hit=await store.get(key);
  if(hit&&hit.customMetadata?.fetchedAt===rubric.fetchedAt)return hit.text();
  const pdf=await store.get(rubric.key);
  if(!pdf)throw new Error('The official rubric is temporarily unavailable. Assessment was stopped; please retry later.');
  const value=await make(await pdf.arrayBuffer());
  await store.put(key,value,{customMetadata:{fetchedAt:rubric.fetchedAt}});
  return value;
}
export const rubricBase64=(store:Store,rubric:Rubric)=>derived(store,rubric,'b64',async pdf=>Buffer.from(pdf).toString('base64'));
export const rubricText=(store:Store,rubric:Rubric)=>derived(store,rubric,'txt',async pdf=>{
  const {extractText}=await import('unpdf');
  const {text}=await extractText(new Uint8Array(pdf),{mergePages:true});
  if(text.length<500)throw new Error('The official rubric could not be read. Assessment stopped.');
  return text;
});
