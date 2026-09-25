import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../lib/provider-adapters.ts';
import {validatePdfPages,checkPages,pageKey} from '../lib/pdf-pages.ts';
import {rubricPdf,rubricBase64,RUBRIC_MAX_AGE} from '../lib/rubric-cache.ts';

const conn=(provider,extra={})=>({provider,key:'k',textModel:'m',audioModel:provider==='qwen'?'qwen3-omni-flash':'m',region:'ap-southeast-1',workspace:'ws',...extra});
const capture=(answer)=>{let sent;return {sent:()=>sent,fetcher:async(url,init)=>{sent=JSON.parse(init.body);return new Response(typeof answer==='string'?answer:JSON.stringify(answer),{status:200})}};};
const link='https://acct.r2.cloudflarestorage.com/bucket/t/a/f?X-Amz-Signature=x';
const parts=[{type:'input_text',text:'hi'},{type:'input_file',filename:'official-ielts-band-descriptors.pdf',file_url:link},{type:'input_image',image_url:link}];

test('OpenAI gets file and image links as URLs',async()=>{
  const c=capture({output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]});
  await generate(conn('openai'),parts,'x',false,100,c.fetcher);
  const content=c.sent().input[0].content;
  assert.deepEqual(content[1],{type:'input_file',file_url:link});
  assert.deepEqual(content[2],{type:'input_image',image_url:link});
});
test('Claude gets URL sources for documents and images',async()=>{
  const c=capture({content:[{type:'text',text:'{"ok":true}'}]});
  await generate(conn('claude'),parts,'x',false,100,c.fetcher);
  const content=c.sent().messages[0].content;
  assert.deepEqual(content[1],{type:'document',source:{type:'url',url:link}});
  assert.deepEqual(content[2],{type:'image',source:{type:'url',url:link}});
});
test('Qwen gets image and audio links',async()=>{
  const c=capture('data: {"choices":[{"delta":{"content":"{\\"ok\\":true}"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n');
  await generate(conn('qwen'),[{type:'input_text',text:'hi'},{type:'input_image',image_url:link},{type:'input_audio',url:link,mime:'audio/mpeg'}],'x',true,100,c.fetcher);
  const content=c.sent().messages[1].content;
  assert.deepEqual(content[1],{type:'image_url',image_url:{url:link}});
  assert.deepEqual(content[2],{type:'input_audio',input_audio:{data:link,format:'mp3'}});
});
test('Gemini is never handed a link it cannot fetch',async()=>{
  await assert.rejects(generate(conn('gemini'),parts,'x',false,100,capture({}).fetcher),/needs the file content inline/);
});

const assessment={id:'a',assets:[{key:'t/a/p',type:'application/pdf',role:'prompt',name:'p.pdf',size:1},{key:'t/a/s',type:'application/pdf',role:'submission',name:'s.pdf',size:1}]};
test('page counts become the page images the browser uploaded',()=>{
  assert.deepEqual(validatePdfPages(assessment,'assess','qwen',[{key:'t/a/p',pages:2}]),[{key:'t/a/p',pages:[pageKey('t/a/p',1),pageKey('t/a/p',2)]}]);
  assert.deepEqual(validatePdfPages(assessment,'assess','openai',undefined),[]);
  assert.throws(()=>validatePdfPages(assessment,'assess','qwen',[{key:'t/a/s',pages:1}]),/not ready/);
  assert.throws(()=>validatePdfPages(assessment,'assess','qwen',[{key:'t/a/p',pages:21}]));
});
test('missing or oversized pages are caught before the AI request',async()=>{
  const rendered=[{key:'t/a/p',pages:['p1','p2']}];
  await assert.rejects(checkPages({head:async k=>k==='p1'?{size:1}:null},rendered),/not ready/);
  await assert.rejects(checkPages({head:async()=>({size:7*1024*1024})},rendered),/too large/);
  await checkPages({head:async()=>({size:1000})},rendered);
});

function memoryStore(){const m=new Map();return {m,
  head:async k=>m.has(k)?{size:m.get(k).body.byteLength,customMetadata:m.get(k).meta}:null,
  get:async k=>{const o=m.get(k);return o?{customMetadata:o.meta,text:async()=>new TextDecoder().decode(o.body),arrayBuffer:async()=>o.body.buffer.slice(0)}:null},
  put:async(k,v,opts={})=>{const body=typeof v==='string'?new TextEncoder().encode(v):new Uint8Array(await new Response(v).arrayBuffer());m.set(k,{body,meta:opts.customMetadata})}};}
test('the rubric is downloaded once and reused until it is a week old',async()=>{
  const store=memoryStore();let downloads=0;const fetcher=async()=>{downloads++;return new Response(new Uint8Array([37,80,68,70]))};
  const url='https://ielts.example/writing.pdf',t0=Date.parse('2026-09-01T00:00:00Z');
  const first=await rubricPdf(store,'writing',url,fetcher,t0);
  await rubricPdf(store,'writing',url,fetcher,t0+RUBRIC_MAX_AGE-1);
  assert.equal(downloads,1);
  assert.equal(await rubricBase64(store,first),'JVBERg==');
  const later=await rubricPdf(store,'writing',url,fetcher,t0+RUBRIC_MAX_AGE+1);
  assert.equal(downloads,2);
  assert.notEqual(later.fetchedAt,first.fetchedAt);
  const failing=async()=>new Response('down',{status:503});
  assert.equal((await rubricPdf(store,'writing',url,failing,t0+3*RUBRIC_MAX_AGE)).fetchedAt,later.fetchedAt); // stale copy beats no rubric
  await assert.rejects(rubricPdf(memoryStore(),'speaking',url,failing,t0),/temporarily unavailable/);
});
