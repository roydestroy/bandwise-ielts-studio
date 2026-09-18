import {test} from 'node:test';
import assert from 'node:assert/strict';
import {speakingAudioLimit,speakingAudioLimits,planAudio,planRecording,recordableSeconds,encodedBytes,oversizeMessage,describeSize,describeLength,RECORDING_REFERENCE_SECONDS} from '../lib/speaking-audio.ts';
const FULL_TEST=14*60;
test('the Qwen limit stays below what its adapter accepts',()=>{
  const base64OfLimit=Math.ceil(speakingAudioLimits.qwen/3)*4;
  assert.ok(base64OfLimit<9.5*1024*1024,'a file at the limit must survive the adapter base64 check');
  assert.ok(speakingAudioLimits.qwen<speakingAudioLimits.gemini,'Qwen is the tightest provider');
});
test('an unset or audio-incapable provider is planned against the tightest limit',()=>{
  assert.equal(speakingAudioLimit('none'),speakingAudioLimits.qwen);
  assert.equal(speakingAudioLimit('claude'),speakingAudioLimits.qwen);
  assert.equal(speakingAudioLimit('gemini'),speakingAudioLimits.gemini);
});
test('a full speaking test fits every provider at a quality that keeps sibilants',()=>{
  for(const provider of ['qwen','gemini','openai']){
    const {quality,fits}=planAudio(FULL_TEST,speakingAudioLimit(provider));
    assert.ok(fits,provider+' must fit a full test');
    assert.ok(encodedBytes(FULL_TEST,quality.kbps)<=speakingAudioLimit(provider));
    assert.ok(quality.sampleRate>=16000&&quality.kbps>=40,provider+' should not drop to the lowest steps for a normal test');
  }
  assert.equal(planAudio(FULL_TEST,speakingAudioLimits.gemini).quality.sampleRate,24000);
});
test('recording quality is chosen so a long test still fits, before the length is known',()=>{
  for(const provider of ['qwen','gemini','openai']){
    const limit=speakingAudioLimit(provider);
    const quality=planRecording(limit);
    assert.ok(encodedBytes(RECORDING_REFERENCE_SECONDS,quality.kbps)<=limit,provider+' must fit the planning reference');
    assert.ok(recordableSeconds(limit,quality)>FULL_TEST+120,provider+' needs headroom past a full test');
  }
  assert.ok(planRecording(speakingAudioLimits.gemini).kbps>planRecording(speakingAudioLimits.qwen).kbps,'a roomier provider should record at higher quality');
});
test('quality drops step by step as the recording gets longer',()=>{
  const limit=speakingAudioLimits.qwen;
  const ladder=[10,20,30,40].map(minutes=>planAudio(minutes*60,limit).quality.kbps);
  assert.deepEqual(ladder,[...ladder].sort((a,b)=>b-a),'longer recordings never get a higher bitrate');
  assert.ok(ladder[0]>ladder[ladder.length-1],'a much longer recording must be compressed harder');
});
test('an impossible recording is reported rather than silently truncated',()=>{
  const {fits,quality}=planAudio(120*60,speakingAudioLimits.qwen);
  assert.equal(fits,false);
  assert.equal(quality.kbps,24,'falls back to the lowest step for the size estimate');
  const message=oversizeMessage('qwen','Qwen',9_000_000);
  assert.match(message,/Qwen accepts about 7.0 MB/);
  assert.match(message,/Gemini or OpenAI/,'names the providers with room for it');
  assert.match(message,/shorter sample/);
  assert.match(oversizeMessage('gemini','Gemini',40_000_000),/Record a shorter sample\.$/,'no provider is offered when none can take it');
});
test('sizes and lengths read the way a teacher expects',()=>{
  assert.equal(describeSize(4_200_000),'4.2 MB');
  assert.equal(describeSize(38_880),'39 KB','a short recording is not rounded away to 0.0 MB');
  assert.equal(describeSize(13_000_000),'13 MB');
  assert.equal(describeLength(754),'12:34');
  assert.equal(describeLength(9),'0:09');
});
