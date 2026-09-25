import {z} from 'zod';
import type {Assessment} from './ielts';

export const MAX_PDF_PAGES=20;
// JPEG bytes, about what the earlier base64 limits (3 MB a page, 16 MB in total) allowed.
export const MAX_PAGE_BYTES=2.25*1024*1024;
export const MAX_PDF_BYTES=12*1024*1024;
// Qwen reads PDFs as page images. The browser renders them and uploads each page to R2 (/api/pages), so the AI
// request only says how many pages each PDF has; the Worker never parses megabytes of image data.
export const pageCountsSchema=z.array(z.object({key:z.string().min(1).max(600),pages:z.number().int().min(1).max(MAX_PDF_PAGES)})).max(5);
export type RenderedPdf={key:string;pages:string[]}[];
export const pageKey=(assetKey:string,page:number)=>assetKey+'/page-'+page+'.jpg';

export function pdfsForAction(a:Assessment,action:string){
  return a.assets.filter(f=>f.type==='application/pdf'&&f.role===(action==='transcribe'?'submission':'prompt'));
}

export function validatePdfPages(a:Assessment,action:string,provider:string,input:unknown):RenderedPdf{
  if(provider!=='qwen')return [];
  const counts=pageCountsSchema.parse(input??[]);
  const expected=pdfsForAction(a,action);
  if(counts.length!==expected.length||new Set(counts.map(x=>x.key)).size!==counts.length||counts.some(x=>!expected.some(f=>f.key===x.key)))
    throw new Error('The PDF pages are not ready. Refresh and try again.');
  if(counts.reduce((n,x)=>n+x.pages,0)>MAX_PDF_PAGES)
    throw new Error('Use up to 20 PDF pages per AI request. Split the PDF into smaller assessments.');
  return counts.map(x=>({key:x.key,pages:Array.from({length:x.pages},(_,i)=>pageKey(x.key,i+1))}));
}

// Every page must have been uploaded, and together they must stay within what one request can carry.
export async function checkPages(store:Pick<R2Bucket,'head'>,rendered:RenderedPdf){
  const heads=await Promise.all(rendered.flatMap(x=>x.pages).map(key=>store.head(key)));
  if(heads.some(h=>!h))throw new Error('The PDF pages are not ready. Refresh and try again.');
  if(heads.reduce((n,h)=>n+h!.size,0)>MAX_PDF_BYTES)throw new Error('The PDF images are too large. Use a smaller PDF and try again.');
}
