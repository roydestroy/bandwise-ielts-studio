import {z} from 'zod';
import type {Assessment} from './ielts';

export const MAX_PDF_PAGES=20;
export const MAX_PAGE_DATA=3*1024*1024;
export const MAX_PDF_DATA=16*1024*1024;
export const renderedPdfSchema=z.array(z.object({
  key:z.string().min(1).max(600),
  pages:z.array(z.string().max(MAX_PAGE_DATA).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)).min(1).max(MAX_PDF_PAGES)
})).max(5);
export type RenderedPdf=z.infer<typeof renderedPdfSchema>;

export function pdfsForAction(a:Assessment,action:string){
  return a.assets.filter(f=>f.type==='application/pdf'&&f.role===(action==='transcribe'?'submission':'prompt'));
}

export function validatePdfPages(a:Assessment,action:string,provider:string,input:unknown):RenderedPdf{
  if(provider!=='qwen')return [];
  const rendered=renderedPdfSchema.parse(input??[]);
  const expected=pdfsForAction(a,action);
  if(rendered.length!==expected.length||new Set(rendered.map(x=>x.key)).size!==rendered.length||rendered.some(x=>!expected.some(f=>f.key===x.key)))
    throw new Error('The PDF pages are not ready. Refresh and try again.');
  if(rendered.reduce((n,x)=>n+x.pages.length,0)>MAX_PDF_PAGES)
    throw new Error('Use up to 20 PDF pages per AI request. Split the PDF into smaller assessments.');
  if(rendered.reduce((n,x)=>n+x.pages.reduce((m,page)=>m+page.length,0),0)>MAX_PDF_DATA)
    throw new Error('The PDF images are too large. Use a smaller PDF and try again.');
  return rendered;
}
