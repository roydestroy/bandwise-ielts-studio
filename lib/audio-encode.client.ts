import {AudioQuality,planAudio} from './speaking-audio';
import {createMp3Encoder,resample,type Mp3Stream} from './mp3-encoder';

// Encode locally; recordings never go to a conversion service, only to the chosen AI provider.
type Lame={Mp3Encoder:new(channels:number,sampleRate:number,kbps:number)=>Mp3Stream};
const lame=async()=>(await import('@breezystack/lamejs')) as unknown as Lame;

export async function startMp3Encoder(quality:AudioQuality){
  const {Mp3Encoder}=await lame();
  return createMp3Encoder(quality,new Mp3Encoder(1,quality.sampleRate,quality.kbps));
}

export function mp3File(blob:Blob,name:string){return new File([blob],name,{type:'audio/mpeg',lastModified:Date.now()});}

async function decodeMono(data:ArrayBuffer,sampleRate:number){
  const Offline=window.OfflineAudioContext||(window as unknown as {webkitOfflineAudioContext?:typeof OfflineAudioContext}).webkitOfflineAudioContext;
  if(!Offline)throw new Error('This browser cannot read audio files. Upload a smaller recording, or try another browser.');
  const decoded=await new Offline(1,1,sampleRate).decodeAudioData(data);
  const channels=Array.from({length:decoded.numberOfChannels},(_,index)=>decoded.getChannelData(index));
  if(channels.length===1)return {samples:channels[0],sampleRate:decoded.sampleRate,seconds:decoded.duration};
  const mono=new Float32Array(decoded.length);
  for(let i=0;i<decoded.length;i++){let sum=0;for(const channel of channels)sum+=channel[i];mono[i]=sum/channels.length;}
  return {samples:mono,sampleRate:decoded.sampleRate,seconds:decoded.duration};
}

// Re-encode an existing recording so the chosen provider can accept it, reporting what it cost
// so the teacher can be told what happened to their audio.
export async function compressSpeakingAudio(file:File,limitBytes:number,onProgress:(message:string)=>void){
  onProgress('Reading '+file.name+'…');
  let decoded;
  try{decoded=await decodeMono(await file.arrayBuffer(),24000);}
  catch(error){
    if(error instanceof Error&&error.message.startsWith('This browser'))throw error;
    throw new Error('Could not read '+file.name+'. Upload an MP3 or WAV recording.');
  }
  const {quality,fits}=planAudio(decoded.seconds,limitBytes);
  const {Mp3Encoder}=await lame();
  const encoder=createMp3Encoder(quality,new Mp3Encoder(1,quality.sampleRate,quality.kbps));
  const samples=resample(decoded.samples,decoded.sampleRate,quality.sampleRate);
  const block=quality.sampleRate*5;
  for(let offset=0;offset<samples.length;offset+=block){
    encoder.add(samples.subarray(offset,Math.min(offset+block,samples.length)),quality.sampleRate);
    onProgress('Compressing the recording… '+Math.min(99,Math.round((offset+block)/samples.length*100))+'%');
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  const blob=encoder.finish();
  return {file:mp3File(blob,file.name.replace(/\.[^.]+$/,'')+'.mp3'),seconds:decoded.seconds,quality,fits:fits&&blob.size<=limitBytes};
}
