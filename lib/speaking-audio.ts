import type {ProviderId} from './providers';

// A speaking recording is sent inline to the provider, so each provider caps how much audio
// it can take. Qwen is the tightest: its adapter refuses audio whose base64 exceeds 9.5 MB,
// which is about 7.1 MB of bytes. These limits leave a margin below the adapter checks.
export const speakingAudioLimits:Record<ProviderId,number>={qwen:7_000_000,gemini:13_000_000,openai:13_000_000,claude:0};
// A recording made for one provider should stay usable after switching provider, so recordings
// with no provider chosen yet are planned against the tightest limit.
export function speakingAudioLimit(provider:ProviderId|'none'){return provider==='none'||provider==='claude'?speakingAudioLimits.qwen:speakingAudioLimits[provider];}

// Mono speech. 24 kHz keeps the sibilants that pronunciation judgments depend on; the 16 kHz
// steps are for long recordings that would otherwise not fit at all.
export const audioQualities=[{kbps:64,sampleRate:24000},{kbps:56,sampleRate:24000},{kbps:48,sampleRate:24000},{kbps:40,sampleRate:16000},{kbps:32,sampleRate:16000},{kbps:24,sampleRate:16000}] as const;
export type AudioQuality=typeof audioQualities[number];
// A full IELTS speaking test runs 11-14 minutes; plan a recording so it still fits well past that.
export const RECORDING_REFERENCE_SECONDS=20*60;

// MP3 frame and tag overhead measured at about 5% over the nominal bitrate on short clips.
export function encodedBytes(seconds:number,kbps:number){return Math.ceil(seconds*kbps*125*1.05)+2048;}
export function encodedSeconds(bytes:number,kbps:number){return Math.max(0,(bytes-2048)/(kbps*125*1.05));}

// The clearest quality whose output still fits, and whether anything fits at all.
export function planAudio(seconds:number,limitBytes:number):{quality:AudioQuality;fits:boolean}{
  const quality=audioQualities.find(q=>encodedBytes(seconds,q.kbps)<=limitBytes);
  return quality?{quality,fits:true}:{quality:audioQualities[audioQualities.length-1],fits:false};
}
// Recording has to choose a quality before the length is known, so plan for a long test.
export function planRecording(limitBytes:number):AudioQuality{return planAudio(RECORDING_REFERENCE_SECONDS,limitBytes).quality;}
export function recordableSeconds(limitBytes:number,quality:AudioQuality){return encodedSeconds(limitBytes,quality.kbps);}

export function describeSize(bytes:number){return bytes<1_000_000?Math.round(bytes/1000)+' KB':(bytes/1_000_000).toFixed(bytes<10_000_000?1:0)+' MB';}
export function describeLength(seconds:number){const s=Math.round(seconds);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

// Compression is the first answer to an oversized recording; when even the lowest quality
// cannot fit, the teacher needs the other one — a provider with more room.
export function oversizeMessage(provider:ProviderId|'none',providerName:string,bytes:number){
  const limit=speakingAudioLimit(provider);
  const roomier=(Object.keys(speakingAudioLimits) as ProviderId[]).filter(id=>speakingAudioLimits[id]>=bytes);
  return 'This recording is '+describeSize(bytes)+' even at the lowest quality, and '+providerName+' accepts about '+describeSize(limit)+'.'
    +(roomier.length?' Record a shorter sample, or switch your speaking provider to '+roomier.map(id=>id==='openai'?'OpenAI':id[0].toUpperCase()+id.slice(1)).join(' or ')+' in AI connection.':' Record a shorter sample.');
}
