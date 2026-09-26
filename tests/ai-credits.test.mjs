import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthlyLimit,checkCredits,creditsFor,renewsOn,OutOfCredits,DEFAULT_MONTHLY_CREDITS} from '../lib/ai-credits.ts';

test('the allowance is the workspace override, else the setting, else the default',()=>{
  assert.equal(monthlyLimit(undefined,null),DEFAULT_MONTHLY_CREDITS);
  assert.equal(monthlyLimit(' 200 ',null),200);
  assert.equal(monthlyLimit('lots',undefined),DEFAULT_MONTHLY_CREDITS);
  assert.equal(monthlyLimit('-5',null),DEFAULT_MONTHLY_CREDITS);
  assert.equal(monthlyLimit('200',0),0);
  assert.equal(monthlyLimit('200',40),40);
});

test('a speaking test costs three credits and writing one',()=>{
  assert.equal(creditsFor('Speaking — full test'),3);
  assert.equal(creditsFor('Writing Task 1'),1);
});

test('the allowance renews on the first of next month, across a year end',()=>{
  assert.equal(renewsOn(new Date('2026-12-31T23:00:00Z')).toISOString(),'2027-01-01T00:00:00.000Z');
});

test('a run is refused only when it would go over, and never for an assessment already paid for',()=>{
  const s={month:'2026-09',used:148,limit:150,renews:'2026-10-01T00:00:00.000Z'};
  assert.doesNotThrow(()=>checkCredits(s,'Writing Task 2',false));
  assert.throws(()=>checkCredits(s,'Speaking — full test',false),e=>e instanceof OutOfCredits&&/148 of your 150/.test(e.message)&&/1 October/.test(e.message));
  assert.doesNotThrow(()=>checkCredits(s,'Speaking — full test',true));
  assert.throws(()=>checkCredits({...s,used:0,limit:0},'Writing Task 1',false),OutOfCredits);
});
