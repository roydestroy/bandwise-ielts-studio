import {cpSync,mkdirSync,readFileSync} from 'node:fs';
const source=new URL('../node_modules/pdfjs-dist/',import.meta.url);
const {version}=JSON.parse(readFileSync(new URL('package.json',source),'utf8'));
const target=new URL('../public/pdfjs/'+version+'/',import.meta.url);
mkdirSync(target,{recursive:true});
for(const item of ['cmaps','standard_fonts','wasm'])cpSync(new URL(item,source),new URL(item,target),{recursive:true});
cpSync(new URL('build/pdf.worker.min.mjs',source),new URL('pdf.worker.min.mjs',target));
