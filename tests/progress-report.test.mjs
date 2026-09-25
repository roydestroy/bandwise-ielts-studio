import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProgressReport} from '../lib/progress-report.ts';

let n=0;
const criteria=(b,priorities=[])=>({criteria:[0,1,2,3].map(i=>({name:'c'+i,band:b,evidence:'',advice:''})),summary:'',strengths:[],priorities,limitations:[]});
const make=(task,band,o={})=>({id:'a'+(++n),student_id:'s1',task,track:'Academic',title:task+' '+n,prompt:'',transcript:'',assets:[],result:null,notes:'',confirmed:true,version:1,book:18,test:2,status:'Reviewed',created_at:'2026-09-0'+Math.min(9,n)+'T10:00:00Z',
  ...(task==='Listening'||task==='Reading'?{raw_score:30,objective_band:band,teacher_result:null}:{teacher_result:criteria(band)}),...o});
const student={id:'s1',name:'Alex <Morgan>',email:'alex@example.com',target:7,min_band:6.5,track:'Academic',created_at:'2026-09-01T00:00:00Z'};
const now=new Date('2026-09-25T12:00:00Z');

test('reports overall band, per-skill history and next priorities',()=>{
  const items=[make('Listening',7.5),make('Reading',7),make('Writing Task 1',6),make('Writing Task 2',6.5,{teacher_result:criteria(6.5,['Develop each main idea with an example'])}),make('Speaking — full test',6.5)];
  const r=buildProgressReport({student,assessments:items,teacher:'Ms Lee',note:'Well done!',now});
  assert.equal(r.empty,false);
  assert.match(r.subject,/progress report/);
  assert.match(r.html,/Overall band by practice test/);
  assert.match(r.html,/Cambridge 18 Test 2/);
  assert.match(r.html,/Progress in each skill/);
  assert.match(r.html,/Well done!/);
  assert.match(r.text,/Cambridge 18 Test 2: 7\.0/);
  // The latest reviewed criterion-based work is the Speaking test, so its priorities (none) are shown, not Writing's.
  assert.match(r.html,/latest speaking/);
});

test('shows the latest writing priorities when writing is the most recent criterion work',()=>{
  const r=buildProgressReport({student,assessments:[make('Writing Task 2',6,{teacher_result:criteria(6,['Develop each main idea'])})],teacher:'Ms Lee',now});
  assert.match(r.html,/What to focus on next/);
  assert.match(r.text,/- Develop each main idea/);
  assert.doesNotMatch(r.html,/Overall band by practice test/); // no complete test yet
});

test('escapes student and teacher text',()=>{
  const r=buildProgressReport({student,assessments:[],teacher:'<b>T</b>',note:'<script>x</script>',now});
  assert.ok(!r.html.includes('<script>'));
  assert.ok(!r.html.includes('<Morgan>'));
  assert.match(r.html,/Alex &lt;Morgan&gt;/);
});

test('ignores unreviewed work and other students',()=>{
  const r=buildProgressReport({student,assessments:[make('Writing Task 1',8,{status:'Needs review'}),make('Reading',8,{student_id:'s2'})],teacher:'T',now});
  assert.equal(r.empty,true);
  assert.match(r.html,/No reviewed work yet/);
});
