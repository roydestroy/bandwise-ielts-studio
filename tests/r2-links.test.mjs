import test from 'node:test';
import assert from 'node:assert/strict';
import {presign,linkConfig,objectLink} from '../lib/r2-links.ts';

test('matches the AWS SigV4 presigned URL example',async()=>{
  // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
  const url=await presign({host:'examplebucket.s3.amazonaws.com',path:'/test.txt',region:'us-east-1',service:'s3',accessKeyId:'AKIAIOSFODNN7EXAMPLE',secretAccessKey:'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',expires:86400,now:new Date('2013-05-24T00:00:00Z')});
  assert.equal(new URL(url).searchParams.get('X-Amz-Signature'),'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
});
test('links only when every R2 setting is present and well-formed',async()=>{
  const env={R2_ACCOUNT_ID:'0123456789abcdef0123456789abcdef',R2_BUCKET_NAME:'bandwise-uploads',R2_ACCESS_KEY_ID:'id',R2_SECRET_ACCESS_KEY:'secret'};
  assert.equal(linkConfig({...env,R2_SECRET_ACCESS_KEY:''}),null);
  assert.equal(linkConfig({...env,R2_ACCOUNT_ID:'not-an-account'}),null);
  const url=new URL(await objectLink(linkConfig(env),'teacher/a b/file'));
  assert.equal(url.host,'0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com');
  assert.equal(url.pathname,'/bandwise-uploads/teacher/a%20b/file');
  assert.equal(url.searchParams.get('X-Amz-Expires'),'900');
});
