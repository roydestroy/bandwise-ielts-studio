import type {Assessment} from './ielts';
import {MAX_PDF_PAGES,MAX_PAGE_DATA,MAX_PDF_DATA,pdfsForAction,type RenderedPdf} from './pdf-pages';

// Render locally; neither PDFs nor credentials go to a conversion service.
export async function renderPdfs(a:Assessment,action:string,onProgress:(message:string)=>void):Promise<RenderedPdf>{
  const files=pdfsForAction(a,action);
  if(!files.length)return [];
  const {getDocument,GlobalWorkerOptions,version}=await import('pdfjs-dist');
  const assets='/pdfjs/'+version+'/';
  GlobalWorkerOptions.workerSrc=assets+'pdf.worker.min.mjs';
  const rendered:RenderedPdf=[];
  let pageCount=0,totalData=0;
  for(const file of files){
    onProgress('Opening '+file.name+'…');
    const response=await fetch('/api/assets?id='+encodeURIComponent(a.id)+'&key='+encodeURIComponent(file.key));
    if(!response.ok)throw new Error('Could not open '+file.name+'. Refresh and try again.');
    // An HTML answer here is Cloudflare's sign-in or error page, not the file.
    if(response.headers.get('content-type')?.includes('text/html'))throw new Error('Could not open '+file.name+'. Your sign-in may have expired. Copy any unsaved text, then reload the page.');
    const task=getDocument({data:new Uint8Array(await response.arrayBuffer()),
      cMapUrl:assets+'cmaps/',cMapPacked:true,standardFontDataUrl:assets+'standard_fonts/',wasmUrl:assets+'wasm/'});
    try{
      const pdf=await task.promise;
      pageCount+=pdf.numPages;
      if(pageCount>MAX_PDF_PAGES)throw new Error('Use up to 20 PDF pages per AI request. Split the PDF into smaller assessments.');
      const pages:string[]=[];
      for(let number=1;number<=pdf.numPages;number++){
        onProgress('Preparing '+file.name+' · page '+number+' of '+pdf.numPages+'…');
        const page=await pdf.getPage(number);
        const natural=page.getViewport({scale:1});
        const viewport=page.getViewport({scale:Math.min(3,2400/Math.max(natural.width,natural.height))});
        const canvas=document.createElement('canvas');
        canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        try{
          const context=canvas.getContext('2d');
          if(!context)throw new Error('Your browser could not prepare PDF images. Try another browser.');
          await page.render({canvas,canvasContext:context,viewport,background:'#ffffff'}).promise;
          const image=canvas.toDataURL('image/jpeg',0.9);
          if(!image.startsWith('data:image/jpeg;base64,')||image.length>MAX_PAGE_DATA)
            throw new Error('A page in '+file.name+' is too large to send clearly. Use a smaller PDF.');
          totalData+=image.length;
          if(totalData>MAX_PDF_DATA)throw new Error('The PDF images are too large. Split the PDF into smaller assessments.');
          pages.push(image);
        }finally{canvas.width=0;canvas.height=0;page.cleanup();}
      }
      rendered.push({key:file.key,pages});
    }catch(error){
      if(error instanceof Error&&error.name==='PasswordException')throw new Error(file.name+' is password-protected. Upload an unlocked copy.');
      if(error instanceof Error&&['InvalidPDFException','UnknownErrorException'].includes(error.name))throw new Error('Could not read '+file.name+'. Try exporting a new PDF copy.');
      throw error;
    }finally{await task.destroy();}
  }
  return rendered;
}
