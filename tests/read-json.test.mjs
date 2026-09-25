import test from 'node:test';
import assert from 'node:assert/strict';
import {readJson} from '../lib/read-json.ts';

const html='<!DOCTYPE html><html><body>Cloudflare</body></html>';
test('parses JSON answers, including error bodies',async()=>{
  assert.deepEqual(await readJson(new Response('{"ok":true}')),{ok:true});
  assert.deepEqual(await readJson(new Response('{"error":"Nope"}',{status:400})),{error:'Nope'});
});
test('explains HTML pages instead of a JSON parse error',async()=>{
  await assert.rejects(readJson(new Response(html,{status:503})),/error 503/);
  await assert.rejects(readJson(new Response(html,{status:413})),/too large/);
  await assert.rejects(readJson(new Response(html,{status:200})),/sign-in may have expired/);
  await assert.rejects(readJson(new Response(html,{status:401})),/sign-in may have expired/);
});
