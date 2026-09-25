import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {summarySql,summaryFromRow} from '../lib/assessment-summary.ts';
import {practiceBand} from '../lib/ielts.ts';

const crit=b=>({criteria:[b,b,b+1,null].map((band,i)=>({name:'c'+i,band,evidence:'long evidence',advice:'advice'})),summary:'s',strengths:[],priorities:['p'],limitations:[]});
test('summaries carry what the lists need and none of the heavy content',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE assessments (id TEXT, owner TEXT, student_id TEXT, data TEXT, version INTEGER, created_at TEXT)');
  const writing={task:'Writing Task 2',track:'Academic',title:'Essay',status:'Reviewed',book:18,test:2,prompt:'P'.repeat(5000),transcript:'T'.repeat(20000),notes:'n',assets:[{key:'k'}],confirmed:true,result:crit(5),teacher_result:{...crit(6),criteria:crit(6).criteria.map(c=>({...c,band:6.5}))}};
  const listening={task:'Listening',track:'Academic',title:'L',status:'Reviewed',book:null,test:null,raw_score:33,objective_band:7.5,prompt:'',transcript:'',notes:'',assets:[],confirmed:true,result:null,teacher_result:null};
  const insert=db.prepare('INSERT INTO assessments VALUES (?,?,?,?,?,?)');
  insert.run('a1','me','s1',JSON.stringify(writing),3,'2026-09-02');
  insert.run('a2','me','s1',JSON.stringify(listening),1,'2026-09-01');
  insert.run('a3','someone-else','s9',JSON.stringify(listening),1,'2026-09-03');
  const [w,l,...rest]=db.prepare(summarySql).all('me').map(summaryFromRow);
  assert.equal(rest.length,0);
  assert.deepEqual({id:w.id,version:w.version,task:w.task,status:w.status,book:w.book,test:w.test,confirmed:w.confirmed},{id:'a1',version:3,task:'Writing Task 2',status:'Reviewed',book:18,test:2,confirmed:true});
  assert.equal(practiceBand(w),6.5);
  assert.deepEqual(w.result.criteria.map(c=>c.band),[5,5,6,null]);
  assert.equal(w.transcript+w.prompt+w.notes,'');
  assert.deepEqual(w.assets,[]);
  assert.equal(practiceBand(l),7.5);
  assert.equal(l.teacher_result,null);
  assert.ok(JSON.stringify(w).length<JSON.stringify(writing).length/20); // ~0.7 KB instead of ~25 KB
});
