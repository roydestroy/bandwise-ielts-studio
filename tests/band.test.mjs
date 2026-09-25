import test from 'node:test';
import assert from 'node:assert/strict';
import {roundBand,testResults as group,combine} from '../lib/band.ts';
import {practiceBand} from '../lib/ielts.ts';
const testResults=items=>group(items,practiceBand);

test('rounds averages to half bands the way IELTS does',()=>{
  assert.equal(roundBand(6.125),6);
  assert.equal(roundBand(6.25),6.5);
  assert.equal(roundBand(6.375),6.5);
  assert.equal(roundBand(6.625),6.5);
  assert.equal(roundBand(6.75),7);
  assert.equal(roundBand(6.875),7);
});

let n=0;
const criteria=b=>({criteria:[0,1,2,3].map(i=>({name:'c'+i,band:b,evidence:'',advice:''})),summary:'',strengths:[],priorities:[],limitations:[]});
const make=(task,band,o={})=>({id:'a'+(++n),student_id:'s1',task,track:'Academic',title:task,prompt:'',transcript:'',assets:[],result:null,notes:'',confirmed:true,version:1,book:18,test:2,status:'Reviewed',created_at:'2026-09-0'+Math.min(9,n)+'T10:00:00Z',
  ...(task==='Listening'||task==='Reading'?{raw_score:30,objective_band:band,teacher_result:null}:{teacher_result:criteria(band)}),...o});

test('combines a full test into an overall band',()=>{
  const [r]=testResults([make('Listening',7.5),make('Reading',7),make('Writing Task 1',6),make('Writing Task 2',6.5),make('Speaking — full test',6.5)]);
  assert.equal(r.skills.Writing.band,6.5); // (6 + 2×6.5) ÷ 3 = 6.33 → 6.5
  assert.equal(r.overall,7); // (7.5 + 7 + 6.5 + 6.5) ÷ 4 = 6.875 → 7
});

test('waits for every skill and ignores unreviewed or undated work',()=>{
  const [r,...rest]=testResults([make('Listening',7),make('Writing Task 2',6,{status:'Needs review'}),make('Reading',6,{book:null}),make('Reading',6,{test:3})]);
  assert.equal(rest.length,1); // book 18 test 3 is its own test; the undated Reading is skipped
  const t2=[r,...rest].find(x=>x.test===2);
  assert.equal(t2.overall,null);
  assert.deepEqual(t2.skills.Writing.missing,['Writing Task 1','Writing Task 2']);
  assert.deepEqual(t2.skills.Writing.pending,['Writing Task 2']);
});

test('uses the latest reviewed attempt when a task was repeated',()=>{
  const [r]=testResults([make('Listening',5,{created_at:'2026-09-01T10:00:00Z'}),make('Listening',7,{created_at:'2026-09-05T10:00:00Z'})]);
  assert.equal(r.skills.Listening.band,7);
});

test('combines hand-picked assessments from different tests',()=>{
  const picks={'Listening':make('Listening',8,{book:15,test:1}),'Reading':make('Reading',7,{book:null,test:null}),'Writing Task 1':make('Writing Task 1',6),'Writing Task 2':make('Writing Task 2',7,{book:17}),'Speaking — full test':make('Speaking — full test',7)};
  const r=combine(picks,practiceBand);
  assert.equal(r.skills.Writing.band,6.5); // (6 + 14) ÷ 3 = 6.67 → 6.5
  assert.equal(r.overall,7); // (8 + 7 + 6.5 + 7) ÷ 4 = 7.125 → 7
  assert.equal(combine({...picks,'Writing Task 1':undefined},practiceBand).overall,null);
});
