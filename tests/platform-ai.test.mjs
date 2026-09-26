import {test} from 'node:test';
import assert from 'node:assert/strict';
import {platformAllowed,platformInfo,platformConnection} from '../lib/platform-ai.ts';
import {generate} from '../lib/provider-adapters.ts';

const key={PLATFORM_GEMINI_API_KEY:'k'};

test('without a key nobody gets Bandwise AI, even in live mode',()=>{
  assert.equal(platformAllowed({PLATFORM_AI_MODE:'live',PLATFORM_AI_TEST_USERS:'t@example.com'},'t@example.com'),false);
  assert.throws(()=>platformConnection({}),/not available/);
});

test('test mode is the default and only lists testers get it, matching email case-insensitively',()=>{
  const e={...key,PLATFORM_AI_TEST_USERS:' Teacher@Example.com , other@example.com'};
  assert.equal(platformAllowed(e,'teacher@example.com'),true);
  assert.equal(platformAllowed(e,'OTHER@example.com'),true);
  assert.equal(platformAllowed(e,'someone@example.com'),false);
  assert.equal(platformAllowed(key,'teacher@example.com'),false);
  assert.deepEqual(platformInfo(e,'teacher@example.com'),{available:true,test:true,name:'Bandwise AI (test mode)',model:'gemini-2.5-flash'});
});

test('live mode offers it to every teacher',()=>{
  const e={...key,PLATFORM_AI_MODE:'live',PLATFORM_GEMINI_MODEL:'gemini-3.8-flash'};
  assert.deepEqual(platformInfo(e,'anyone@example.com'),{available:true,test:false,name:'Bandwise AI',model:'gemini-3.8-flash'});
});

test('calls on the platform key are marked in usage',async()=>{
  const usage=[];
  const fetcher=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"ok":true}'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5}}),{status:200});
  await generate(platformConnection(key),[{type:'input_text',text:'hi'}],'x',false,100,fetcher,usage);
  await generate({...platformConnection(key),platform:undefined},[{type:'input_text',text:'hi'}],'x',false,100,fetcher,usage);
  assert.equal(usage[0].platform,true);
  assert.equal('platform' in usage[1],false);
});
