import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskBand,agreement,accuracyReport} from '../lib/accuracy.ts';

test('a task band is the mean of four criteria to the nearest half',()=>{
  assert.equal(taskBand([6,6,6.5,6.5]),6.5);
  assert.equal(taskBand([6,6,6,6.5]),6);
  assert.equal(taskBand([7,6.5,6.5,6.5]),6.5);
  assert.equal(taskBand([6,null,6,6]),null);
});

test('agreement reports average difference, lean and share within half a band',()=>{
  const a=agreement([[7,6],[6,6],[6.5,6],[5,6]]);
  assert.equal(a.n,4);assert.equal(a.mae,.625);assert.equal(a.bias,.125);assert.equal(a.within,.5);
  assert.deepEqual(agreement([]),{n:0,mae:null,bias:null,within:null});
});

test('the report splits writing and speaking, skips missing bands and groups by model',()=>{
  const r=accuracyReport([
    {task:'Writing Task 1',model:'Gemini',ai:[6,6,6,6],teacher:[6,6.5,6,6]},
    {task:'Writing Task 2',model:'Gemini',ai:[7,7,7,7],teacher:[6,6,6,6]},
    {task:'Speaking — full test',model:null,ai:[6,6,6,null],teacher:[6,6,6,6]},
  ]);
  assert.equal(r.assessments,3);
  assert.deepEqual(r.skills.map(s=>s.skill),['Writing','Speaking']);
  const w=r.skills[0];
  assert.equal(w.overall.n,2);assert.equal(w.overall.mae,.5);   // 6 vs 6 (6.125 rounds to 6), 7 vs 6
  assert.equal(w.criteria[1].agreement.mae,.75);
  const s=r.skills[1];
  assert.equal(s.overall.n,0);assert.equal(s.criteria[3].agreement.n,0);assert.equal(s.criteria[0].agreement.n,1);
  assert.deepEqual(r.models.map(m=>[m.model,m.overall.n]),[['Gemini',2],['Unknown',0]]);
});
