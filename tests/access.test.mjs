import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {verifyTeacher,accessIssuer} from '../lib/access.ts';
const {privateKey,publicKey}=await generateKeyPair('RS256');
const team='bandwise-test.cloudflareaccess.com',issuer='https://'+team,aud='test-audience';
const sign=(overrides={})=>new SignJWT({email:'teacher@example.test',...overrides})
  .setProtectedHeader({alg:'RS256'}).setSubject('teacher-1').setIssuer(issuer).setAudience(aud).setIssuedAt().setExpirationTime('5m').sign(privateKey);
test('accepts a signed teacher identity',async()=>{
  const teacher=await verifyTeacher(await sign(),team,aud,async()=>publicKey);
  assert.equal(teacher.userId,'teacher-1');assert.equal(teacher.email,'teacher@example.test');
});
test('rejects a token for another Access application',async()=>{
  await assert.rejects(verifyTeacher(await sign(),team,'another-app',async()=>publicKey));
});
test('rejects untrusted issuer, unsigned identity and invalid signature',async()=>{
  await assert.rejects(verifyTeacher(await sign(),'another.cloudflareaccess.com',aud,async()=>publicKey));
  await assert.rejects(verifyTeacher('teacher@example.test',team,aud,async()=>publicKey));
  const other=await generateKeyPair('RS256');
  await assert.rejects(verifyTeacher(await sign(),team,aud,async()=>other.publicKey));
});
test('rejects expired and non-person identities',async()=>{
  const expired=await new SignJWT({email:'teacher@example.test'}).setProtectedHeader({alg:'RS256'}).setSubject('teacher-1').setIssuer(issuer).setAudience(aud).setIssuedAt().setExpirationTime(1).sign(privateKey);
  await assert.rejects(verifyTeacher(expired,team,aud,async()=>publicKey));
  await assert.rejects(verifyTeacher(await sign({email:null}),team,aud,async()=>publicKey));
});
test('only fetches keys from configured Cloudflare Access team domains',()=>{
  assert.equal(accessIssuer('https://'+team+'/'),issuer);
  for(const input of ['https://example.com','evil.cloudflareaccess.com.attacker.com','team.cloudflareaccess.com/path','team.cloudflareaccess.com@evil.test'])assert.throws(()=>accessIssuer(input));
});
