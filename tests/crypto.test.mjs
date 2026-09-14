import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {sealKey,unsealKey} from '../lib/provider-crypto.ts';
test('provider keys round-trip only with the right teacher and provider',async()=>{
  const secret=randomBytes(32).toString('base64');
  const ciphertext=await sealKey(secret,'synthetic-test-key','teacher-1:qwen');
  assert.equal(await unsealKey(secret,ciphertext,'teacher-1:qwen'),'synthetic-test-key');
  await assert.rejects(unsealKey(secret,ciphertext,'teacher-2:qwen'));
  await assert.rejects(unsealKey(secret,ciphertext,'teacher-1:openai'));
  await assert.rejects(unsealKey(randomBytes(32).toString('base64'),ciphertext,'teacher-1:qwen'));
});
