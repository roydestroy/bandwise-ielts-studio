// Mono MP3 encoding for speaking recordings. Kept free of browser and project imports so the
// sizing behaviour these limits depend on can be tested directly.
export type Mp3Stream={encodeBuffer(pcm:Int16Array):Int8Array;flush():Int8Array};
export type Mp3Settings={sampleRate:number;kbps:number};

export function toInt16(input:Float32Array){
  const output=new Int16Array(input.length);
  for(let i=0;i<input.length;i++){const sample=Math.max(-1,Math.min(1,input[i]));output[i]=Math.round(sample*(sample<0?0x8000:0x7fff));}
  return output;
}

// Linear resampling is enough for speech, and keeps this dependency-free when a browser
// captures or decodes at a rate we did not ask for.
export function resample(input:Float32Array,from:number,to:number){
  if(from===to||input.length===0)return input;
  const ratio=from/to,length=Math.max(1,Math.floor(input.length/ratio)),output=new Float32Array(length);
  for(let i=0;i<length;i++){
    const position=i*ratio,index=Math.floor(position),fraction=position-index;
    const next=index+1<input.length?input[index+1]:input[index];
    output[i]=input[index]*(1-fraction)+next*fraction;
  }
  return output;
}

export function createMp3Encoder(settings:Mp3Settings,stream:Mp3Stream){
  const chunks:Int8Array[]=[];
  let bytes=0;
  const push=(data:Int8Array)=>{if(data.length){chunks.push(data);bytes+=data.length;}};
  return {
    get bytes(){return bytes;},
    add(samples:Float32Array,sampleRate:number){
      const pcm=toInt16(resample(samples,sampleRate,settings.sampleRate));
      if(pcm.length)push(stream.encodeBuffer(pcm));
    },
    finish(){push(stream.flush());return new Blob(chunks.map(chunk=>new Uint8Array(chunk)),{type:'audio/mpeg'});}
  };
}
