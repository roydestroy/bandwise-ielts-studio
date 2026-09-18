import {test} from 'node:test';
import assert from 'node:assert/strict';
import {audioAnalysis,generate,parseJSON,providerRequest} from '../lib/provider-adapters.ts';
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
test('a speaking answer that splits examiner and candidate speech still yields a transcript',async()=>{
  const {transcript,observations}=audioAnalysis({transcript:{examiner:'Can you describe your home town?',candidate:'I live in a small town near the sea.'},observations:'clear but hesitant'});
  assert.equal(transcript,'I live in a small town near the sea.');
  assert.equal(observations,'clear but hesitant');
});
test('a transcript returned as turns is joined with its speakers',async()=>{
  const {transcript}=audioAnalysis({transcript:[{speaker:'Examiner',text:'What do you do?'},{speaker:'Candidate',text:'I am a student.'}],observations:{fluency:'some pausing'}});
  assert.equal(transcript,'Examiner: What do you do?\nCandidate: I am a student.');
});
test('alternative transcript keys and wrapper objects are accepted',async()=>{
  assert.equal(audioAnalysis({response:{candidate_transcript:'Yes, I agree.',analysis:'fine'}}).transcript,'Yes, I agree.');
  assert.equal(audioAnalysis({transcription:'Hello there.'}).transcript,'Hello there.');
});
test('observations scattered across sibling keys are kept as evidence',async()=>{
  const {observations}=audioAnalysis({transcript:'I think so.',fluency:'frequent self-correction',pronunciation:'clear word stress'});
  assert.deepEqual(observations,{fluency:'frequent self-correction',pronunciation:'clear word stress'});
});
test('an over-long transcript is trimmed rather than rejected',async()=>{
  const {transcript}=audioAnalysis({transcript:'word '.repeat(12000),observations:'long recording'});
  assert.equal(transcript.length,40000);
});
test('an audio answer with nothing usable explains itself instead of failing field validation',async()=>{
  assert.throws(()=>audioAnalysis({status:'ok'}),/no transcript or audio observations/);
  assert.throws(()=>audioAnalysis('done'),/no transcript or audio observations/);
});
test('JSON wrapped in prose or fences is still read',async()=>{
  assert.deepEqual(parseJSON('Here is the analysis:\n```json\n{"transcript":"Hi"}\n```\nLet me know.'),{transcript:'Hi'});
});
test('raw newlines and tabs inside a transcript are repaired instead of failing',async()=>{
  const {transcript}=parseJSON('{"transcript":"I live in Athens.\nIt is a big city.","observations":"clear"}');
  assert.equal(transcript,'I live in Athens.\nIt is a big city.');
});
test('an answer that stops mid-sentence is reported as running out of room, not as invalid JSON',async()=>{
  assert.throws(()=>parseJSON('{"transcript":"Well I think that the first thing',true),e=>{
    assert.match(e.message,/ran out of response space/);assert.doesNotMatch(e.message,/invalid JSON/);return true;});
});
test('a genuinely malformed answer is still reported as invalid JSON',async()=>{
  assert.throws(()=>parseJSON('transcript = not json at all'),/incomplete or invalid JSON/);
});
test('an overloaded provider is retried once and its failure explained as theirs',async()=>{
  let calls=0;const flaky=async()=>{calls++;return calls===1?new Response('{"error":{"code":503}}',{status:503}):new Response(JSON.stringify(candidate([{text:'{"transcript":"Hi","observations":"clear"}'}])),{status:200});};
  assert.deepEqual(await generate(gemini,speaking,'guard',true,24000,flaky),{transcript:'Hi',observations:'clear'});
  assert.equal(calls,2,'a fast 503 is worth one more attempt');
  let tried=0;const down=async()=>{tried++;return new Response('{"error":{"code":503}}',{status:503});};
  await assert.rejects(generate(gemini,speaking,'guard',true,24000,down),e=>{
    assert.match(e.message,/temporarily overloaded or unavailable/);assert.doesNotMatch(e.message,/file limits/);return true;});
  assert.equal(tried,2,'the retry is not repeated indefinitely');
});
test('a 5xx after a long wait is not worth sending the audio again',async()=>{
  let calls=0;const slow=async()=>{calls++;return new Response('',{status:503})};let clock=0;const now=()=>{clock+=30000;return clock};
  await assert.rejects(providerRequest('https://example.test',{},{},slow,now),/temporarily overloaded/);
  assert.equal(calls,1);
});
test('a complete answer followed by more output is read from the first JSON value',async()=>{
  assert.deepEqual(parseJSON('{"transcript":"Hi"}\nThat is the transcript.'),{transcript:'Hi'});
  assert.deepEqual(parseJSON('{"transcript":"Hi"}{"observations":"clear"}'),{transcript:'Hi'});
});
test('a speaking request gets the whole output window of a 2.5 model',async()=>{
  const {fetcher,sent}=reply(candidate([{text:'{"transcript":"Hi","observations":"clear"}'}]));
  await generate(gemini,speaking,'guard',true,providers.gemini.audioTokens,fetcher);
  const config=sent().body.generationConfig;
  assert.equal(config.maxOutputTokens,65536,'gemini-2.5-flash allows 65536 output tokens');
  assert.ok(config.thinkingConfig.thinkingBudget<=8192,'thinking stays within the range every 2.5 variant accepts');
  assert.ok(config.maxOutputTokens-config.thinkingConfig.thinkingBudget>40000,'a full-test transcript needs most of the window');
});
test('a model with a smaller window is not asked for more than it allows',async()=>{
  const {fetcher,sent}=reply(candidate([{text:'{"ok":true}'}]));
  await generate({...gemini,audioModel:'gemini-2.0-flash'},speaking,'guard',true,providers.gemini.audioTokens,fetcher);
  assert.equal(sent().body.generationConfig.maxOutputTokens,8192,'asking a 2.0 model for 65536 is rejected outright');
});
