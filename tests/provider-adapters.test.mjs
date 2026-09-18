import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../lib/provider-adapters.ts';
import {providers} from '../lib/providers.ts';
const gemini={provider:'gemini',key:'test-key',textModel:'gemini-2.5-flash',audioModel:'gemini-2.5-flash',region:'ap-southeast-1',workspace:''};
const speaking=[{type:'input_text',text:'Listen to the recording.'},{type:'input_audio',data:'AAAA',mime:'audio/mpeg'}];
const reply=(body)=>{let sent;const fetcher=async(url,init)=>{sent={url,body:JSON.parse(init.body)};return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}})};return {fetcher,sent:()=>sent};};
const candidate=(parts,finishReason='STOP')=>({candidates:[{content:{parts},finishReason}]});
test('a truncated Gemini speaking response is reported as running out of room, not as invalid JSON',async()=>{
  const {fetcher}=reply(candidate([{text:'{"transcript":"Well I think that the first thing'}],'MAX_TOKENS'));
  await assert.rejects(generate(gemini,speaking,'guard',true,24000,fetcher),e=>{
    assert.match(e.message,/ran out of response space/);assert.match(e.message,/shorter recording/);
    assert.doesNotMatch(e.message,/invalid JSON/);return true;});
});
test('Gemini thinking cannot consume the whole speaking answer budget',async()=>{
  const {fetcher,sent}=reply(candidate([{text:'{"transcript":"Hello","observations":"clear"}'}]));
  await generate(gemini,speaking,'guard',true,providers.gemini.audioTokens,fetcher);
  const config=sent().body.generationConfig;
  assert.equal(config.maxOutputTokens,providers.gemini.audioTokens);
  assert.ok(config.thinkingConfig.thinkingBudget<=config.maxOutputTokens/3,'thinking budget must leave room for the transcript');
  assert.ok(providers.gemini.audioTokens>=16000,'a verbatim transcript plus observations needs a large budget');
});
test('a Gemini model without a thinking budget parameter is left untouched',async()=>{
  const {fetcher,sent}=reply(candidate([{text:'{"ok":true}'}]));
  await generate({...gemini,audioModel:'gemini-2.0-flash'},speaking,'guard',true,6500,fetcher);
  assert.equal(sent().body.generationConfig.thinkingConfig,undefined);
});
test('Gemini thought parts are dropped and the answer is parsed',async()=>{
  const {fetcher}=reply(candidate([{text:'planning the answer',thought:true},{text:'{"transcript":"Hi","observations":"brief"}'}]));
  assert.deepEqual(await generate(gemini,speaking,'guard',true,24000,fetcher),{transcript:'Hi',observations:'brief'});
});
test('a blocked or empty Gemini response explains itself',async()=>{
  const blocked=reply({promptFeedback:{blockReason:'SAFETY'},candidates:[]});
  await assert.rejects(generate(gemini,speaking,'guard',true,24000,blocked.fetcher),/safety filters/);
  const empty=reply(candidate([],'STOP'));
  await assert.rejects(generate(gemini,speaking,'guard',true,24000,empty.fetcher),/empty response/);
});
test('other providers also report truncation instead of invalid JSON',async()=>{
  const openai={...gemini,provider:'openai',audioModel:'gpt-audio'};
  const cut=reply({choices:[{finish_reason:'length',message:{content:'{"transcript":"Well'}}]});
  await assert.rejects(generate(openai,speaking,'guard',true,16000,cut.fetcher),/ran out of response space/);
  const claude={...gemini,provider:'claude'};
  const cutText=reply({stop_reason:'max_tokens',content:[{type:'text',text:'{"criteria":['}]});
  await assert.rejects(generate(claude,[{type:'input_text',text:'grade this'}],'guard',false,11000,cutText.fetcher),/ran out of response space/);
});
