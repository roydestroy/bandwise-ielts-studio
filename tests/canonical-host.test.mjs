import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalRedirect} from '../lib/canonical-host.ts';

const go=(url,method='GET',canonical='bandwiseapp.com')=>canonicalRedirect(new URL(url),method,canonical);

test('other hostnames go to the canonical address with the same path and query',()=>{
  const r=go('https://bandwise.eurognosi-remote.com/brand/abc?x=1');
  assert.equal(r.status,301);
  assert.equal(r.headers.get('Location'),'https://bandwiseapp.com/brand/abc?x=1');
  assert.equal(go('https://www.bandwiseapp.com/').headers.get('Location'),'https://bandwiseapp.com/');
});

test('non-GET requests keep their method',()=>{
  assert.equal(go('https://www.bandwiseapp.com/auth/sign-in/social','POST').status,308);
  assert.equal(go('https://www.bandwiseapp.com/','HEAD').status,301);
});

test('the canonical host, local development and an unset canonical host are served as they are',()=>{
  assert.equal(go('https://bandwiseapp.com/app'),null);
  assert.equal(go('http://localhost:5173/app'),null);
  assert.equal(go('http://127.0.0.1:8788/'),null);
  assert.equal(canonicalRedirect(new URL('https://bandwise.eurognosi-remote.com/'),'GET',undefined),null);
});
