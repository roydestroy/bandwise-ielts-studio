import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../lib/provider-adapters.ts';
import {estimateCost,priceFor,geminiUsage,openaiUsage} from '../lib/usage.ts';

const conn=(provider,model)=>({provider,key:'k',textModel:model,audioModel:model,region:'ap-southeast-1',workspace:'ws'});
const answer=(body)=>async()=>new Response(typeof body==='string'?body:JSON.stringify(body),{status:200});
const stream=(...chunks)=>chunks.map(c=>'data: '+JSON.stringify(c)).join('\n')+'\ndata: [DONE]\n';

test('Gemini usage separates audio input and bills thinking as output',async()=>{
  const usage=[];
  await generate(conn('gemini','gemini-2.5-flash'),[{type:'input_text',text:'hi'},{type:'input_audio',data:'AAAA',mime:'audio/mpeg'}],'x',true,24000,answer({
    candidates:[{content:{parts:[{text:'{"transcript":"Hi","observations":"ok"}'}]},finishReason:'STOP'}],
    usageMetadata:{promptTokenCount:12000,candidatesTokenCount:900,thoughtsTokenCount:1100,promptTokensDetails:[{modality:'TEXT',tokenCount:2000},{modality:'AUDIO',tokenCount:10000}]},
  }),usage);
  assert.deepEqual(usage,[{provider:'gemini',model:'gemini-2.5-flash',kind:'audio',inputTokens:2000,audioTokens:10000,outputTokens:2000}]);
  // 2k text at $0.30 + 10k audio at $1.00 + 2k output at $2.50, per million.
  assert.equal(estimateCost(usage[0]).toFixed(4),'0.0156');
});

test('usage is recorded even when the answer is then rejected',async()=>{
  const usage=[];
  await assert.rejects(generate(conn('claude','claude-sonnet-5'),[{type:'input_text',text:'grade'}],'x',false,11000,answer({stop_reason:'max_tokens',content:[],usage:{input_tokens:5000,output_tokens:11000}}),usage),/ran out/);
  assert.equal(usage[0].outputTokens,11000);
  assert.equal(estimateCost(usage[0]),0.12);
});

test('OpenAI usage from the Responses API and from audio chat completions',()=>{
  assert.deepEqual(openaiUsage({usage:{input_tokens:3000,output_tokens:800}},'gpt-4.1',false),{provider:'openai',model:'gpt-4.1',kind:'text',inputTokens:3000,audioTokens:0,outputTokens:800});
  const audio=openaiUsage({usage:{prompt_tokens:9000,completion_tokens:700,prompt_tokens_details:{audio_tokens:8000}}},'gpt-audio',true);
  assert.equal(audio.inputTokens,1000);assert.equal(audio.audioTokens,8000);
  // gpt-audio's audio-input price isn't verified, so a call with audio has no cost rather than a wrong one.
  assert.equal(estimateCost(audio),null);
  assert.equal(openaiUsage({},'gpt-4.1',false),null);
});

test('Qwen asks for usage in its stream and reports it',async()=>{
  const usage=[];let sent;
  const fetcher=async(url,init)=>{sent=JSON.parse(init.body);return new Response(stream({choices:[{delta:{content:'{"ok":true}'},finish_reason:'stop'}]},{choices:[],usage:{prompt_tokens:400,completion_tokens:20,prompt_tokens_details:{audio_tokens:300}}}),{status:200})};
  await generate(conn('qwen','qwen3.5-omni-plus'),[{type:'input_text',text:'hi'}],'x',true,6500,fetcher,usage);
  assert.deepEqual(sent.stream_options,{include_usage:true});
  assert.deepEqual(usage,[{provider:'qwen',model:'qwen3.5-omni-plus',kind:'audio',inputTokens:100,audioTokens:300,outputTokens:20}]);
  assert.equal(estimateCost(usage[0]),null);
});

test('prices match the exact model family, not a shorter namesake',()=>{
  assert.equal(priceFor('gemini-2.5-flash-lite'),null);
  assert.equal(priceFor('gemini-2.5-flash-preview-09-2025').input,.3);
  assert.equal(priceFor('gpt-4.1-mini'),null);
  assert.equal(priceFor('claude-sonnet-5').output,10);
  assert.equal(priceFor('unknown-model'),null);
});

test('Gemini 3.7 and 3.8 Flash introductory prices end with 2026',()=>{
  assert.equal(priceFor('gemini-3.8-flash',new Date('2026-12-31T23:00:00Z')).input,.75);
  assert.equal(priceFor('gemini-3.8-flash',new Date('2027-01-01T00:00:00Z')).input,1.5);
});

test('missing usage metadata records nothing',()=>{
  assert.equal(geminiUsage({candidates:[]},'gemini-2.5-flash',false),null);
});
