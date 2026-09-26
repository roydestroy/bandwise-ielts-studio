import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarise,percentile,credits} from '../lib/pilot-stats.ts';

const row=(id,writing,speaking,writingCost=0,speakingCost=0)=>({id,name:null,email:null,students:0,writing,speaking,saved:0,reviewed:0,writingCost,speakingCost,cost:writingCost+speakingCost,platformCost:0,unpriced:0,requests:writing+speaking});

test('percentile uses nearest rank',()=>{
  assert.equal(percentile([],.5),0);
  assert.equal(percentile([5],.8),5);
  assert.equal(percentile([1,2,3,4,5],.5),3);
  assert.equal(percentile([10,1,2,3,4],.8),4);
  assert.equal(percentile([1,2,3,4,5,6,7,8,9,10],.8),8);
});

test('a speaking test counts as three credits',()=>{
  assert.equal(credits({writing:4,speaking:2}),10);
});

test('the summary ignores accounts with no AI marking and splits cost by skill',()=>{
  const s=summarise([row('a',10,0,.5,0),row('b',20,10,1,1.5),row('idle',0,0),row('c',100,40,5,6)]);
  assert.equal(s.active,3);
  assert.equal(s.writing,130);assert.equal(s.speaking,50);
  assert.equal(s.costPerWriting,6.5/130);
  assert.equal(s.costPerSpeaking,7.5/50);
  assert.equal(s.typicalCredits,50);   // credits: 10, 50, 220
  assert.equal(s.heavyCredits,220);
  assert.equal(s.maxCredits,220);
  assert.equal(s.heavyCost,220*(14/280));
  assert.deepEqual(s.plans.map(p=>p.fit),[1,2,3]);
});

test('an empty month has no costs rather than dividing by zero',()=>{
  const s=summarise([row('idle',0,0)]);
  assert.equal(s.active,0);
  assert.equal(s.costPerWriting,null);
  assert.equal(s.heavyCost,null);
  assert.deepEqual(s.plans.map(p=>p.fit),[0,0,0]);
});
