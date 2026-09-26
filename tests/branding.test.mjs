import {test} from 'node:test';
import assert from 'node:assert/strict';
import {brandingSchema,logoType,reportBrand,contrastWithWhite} from '../lib/branding.ts';
import {buildProgressReport} from '../lib/progress-report.ts';

test('brand colours must be readable on white',()=>{
  assert.equal(brandingSchema.parse({name:' Northside ',color:'#7A2E5C'}).color,'#7a2e5c');
  assert.throws(()=>brandingSchema.parse({name:'N',color:'#ffd700'}),/too light/);
  assert.throws(()=>brandingSchema.parse({name:'N',color:'red'}),/Choose a colour/);
  assert.throws(()=>brandingSchema.parse({name:'  ',color:'#145e50'}),/Enter the name/);
  assert.ok(contrastWithWhite('#000000')>20);
});

test('logos are identified by their bytes, and only PNG and JPEG pass',()=>{
  assert.equal(logoType(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0])),'image/png');
  assert.equal(logoType(new Uint8Array([0xff,0xd8,0xff,0xe0])),'image/jpeg');
  assert.equal(logoType(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),null);
  assert.equal(logoType(new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50])),null);
});

test('report logo URLs are absolute when an origin is given',()=>{
  const b={name:'N',color:'#145e50',contact:'',logoId:'11111111-2222-4333-8444-555555555555'};
  assert.equal(reportBrand(b,'https://bandwise.example').logoUrl,'https://bandwise.example/brand/11111111-2222-4333-8444-555555555555');
  assert.equal(reportBrand({...b,logoId:null}).logoUrl,null);
  assert.equal(reportBrand(null),null);
});

const student={id:'s1',name:'Maria K.',email:'m@example.com',target:7,min_band:null,track:'Academic',created_at:'2026-09-01T00:00:00Z'};
const now=new Date('2026-09-26T00:00:00Z');

test('a branded progress report shows the teacher brand, escaped, and a Made with Bandwise line',()=>{
  const brand={name:'Tom & Jerry <School>',color:'#7a2e5c',contact:'tj.example',logoUrl:'https://bandwise.example/brand/x'};
  const r=buildProgressReport({student,assessments:[],teacher:'Ms Lee',now,brand});
  assert.match(r.html,/Tom &amp; Jerry &lt;School&gt;/);
  assert.doesNotMatch(r.html,/<School>/);
  assert.match(r.html,/<img src="https:\/\/bandwise\.example\/brand\/x"/);
  assert.match(r.html,/border-top:5px solid #7a2e5c/);
  assert.match(r.html,/Made with Bandwise/);
  assert.match(r.text,/^Tom & Jerry <School> · tj\.example/);
});

test('an unbranded progress report keeps the standard layout',()=>{
  const r=buildProgressReport({student,assessments:[],teacher:'Ms Lee',now});
  assert.doesNotMatch(r.html,/Made with Bandwise|<img/);
  assert.match(r.text,/^IELTS progress report for Maria K\./);
});
