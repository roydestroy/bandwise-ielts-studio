import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Mp3Encoder} from '@breezystack/lamejs';
import {createMp3Encoder,resample} from '../lib/mp3-encoder.ts';
import {audioQualities,encodedBytes,planAudio,planRecording,speakingAudioLimits,RECORDING_REFERENCE_SECONDS} from '../lib/speaking-audio.ts';

// Voice-like input: a moving fundamental with harmonics, so the encoder is not fed pure silence.
function speech(seconds,sampleRate){
  const samples=new Float32Array(Math.round(seconds*sampleRate));
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate,f=110+40*Math.sin(t*1.7);
    samples[i]=0.4*Math.sin(2*Math.PI*f*t)+0.2*Math.sin(4*Math.PI*f*t)+0.05*(Math.random()*2-1);
  }
  return samples;
}
async function encode(seconds,quality){
  const encoder=createMp3Encoder(quality,new Mp3Encoder(1,quality.sampleRate,quality.kbps));
  const samples=speech(seconds,quality.sampleRate);
  for(let offset=0;offset<samples.length;offset+=quality.sampleRate)
    encoder.add(samples.subarray(offset,Math.min(offset+quality.sampleRate,samples.length)),quality.sampleRate);
  return encoder.finish();
}

test('the size estimate is never optimistic, at every quality step',async()=>{
  for(const quality of audioQualities){
    const blob=await encode(30,quality);
    const estimate=encodedBytes(30,quality.kbps);
    assert.ok(blob.size<=estimate,`${quality.kbps} kbps: encoded ${blob.size} exceeds the ${estimate} estimate`);
    assert.ok(blob.size>estimate*0.8,`${quality.kbps} kbps: estimate ${estimate} is far above the real ${blob.size}`);
  }
});
test('a planned recording really fits the provider it was planned for',async()=>{
  for(const [provider,limit] of Object.entries(speakingAudioLimits)){
    if(!limit)continue;
    const quality=planRecording(limit);
    const blob=await encode(60,quality);
    const full=blob.size/60*RECORDING_REFERENCE_SECONDS;
    assert.ok(full<=limit,`${provider}: a ${RECORDING_REFERENCE_SECONDS/60}-minute recording would be ${Math.round(full)}, over the ${limit} limit`);
  }
});
test('compressing a long recording brings it under the Qwen limit',async()=>{
  const limit=speakingAudioLimits.qwen;
  const {quality,fits}=planAudio(35*60,limit);
  assert.ok(fits);
  const blob=await encode(60,quality);
  assert.ok(blob.size/60*35*60<=limit,'35 minutes at the planned quality must fit Qwen');
});
test('the output is a real MP3 stream',async()=>{
  const bytes=new Uint8Array(await (await encode(2,audioQualities[0])).arrayBuffer());
  assert.equal(bytes[0],0xff);
  assert.equal(bytes[1]&0xe0,0xe0,'first frame must start with an MP3 sync word');
  assert.ok(bytes.length>2000);
});
test('resampling keeps the signal length and shape',()=>{
  const input=speech(1,48000);
  const output=resample(input,48000,16000);
  assert.equal(output.length,16000);
  assert.equal(resample(input,16000,16000),input,'a no-op resample returns the same buffer');
  const peak=Math.max(...Array.from(output,Math.abs));
  assert.ok(peak>0.3&&peak<=1,'amplitude is preserved, not clipped or flattened');
});
