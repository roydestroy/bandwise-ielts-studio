import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedbackSchema,summariseFeedback} from '../lib/feedback.ts';

const blank={tooCheap:null,bargain:null,expensive:null,tooExpensive:null,hoursSaved:null,comments:''};

test('prices must rise from too cheap to too expensive, skipping blanks',()=>{
  assert.equal(feedbackSchema.safeParse({...blank,tooCheap:5,bargain:10,expensive:20,tooExpensive:30}).success,true);
  assert.equal(feedbackSchema.safeParse({...blank,tooCheap:5,tooExpensive:30}).success,true);
  const bad=feedbackSchema.safeParse({...blank,bargain:20,expensive:10});
  assert.equal(bad.success,false);assert.match(bad.error.issues[0].message,/at least the one before/);
  assert.equal(feedbackSchema.safeParse({...blank,hoursSaved:-1}).success,false);
});

test('the summary takes medians and ignores skipped answers',()=>{
  const s=summariseFeedback([{...blank,bargain:10,hoursSaved:2},{...blank,bargain:15},{...blank,bargain:40,hoursSaved:4}]);
  assert.deepEqual(s,{responses:3,tooCheap:null,bargain:15,expensive:null,tooExpensive:null,hoursSaved:2});
});
