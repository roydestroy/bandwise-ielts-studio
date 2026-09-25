import test from 'node:test';
import assert from 'node:assert/strict';
import {reportName} from '../lib/report-name.ts';

test('names the report after the student, book, test and task',()=>{
  assert.equal(reportName('Maria Papadopoulou',{task:'Writing Task 2',book:18,test:2}),'Maria Papadopoulou - Cambridge 18 Test 2 - Writing Task 2');
  assert.equal(reportName('Maria',{task:'Writing Task 1',book:18,test:null}),'Maria - Cambridge 18 - Writing Task 1');
  assert.equal(reportName('Maria',{task:'Writing Task 1',book:null,test:null}),'Maria - Writing Task 1');
});
test('keeps characters that file names cannot hold out of the name',()=>{
  assert.equal(reportName('A/B: "C"',{task:'Writing Task 2'}),'A B C - Writing Task 2');
});
