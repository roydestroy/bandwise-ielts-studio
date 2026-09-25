"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {Mic,Square,Pause,Play,RotateCcw,LoaderCircle} from 'lucide-react';
import {describeLength,describeSize,planRecording,recordableSeconds,oversizeMessage} from '@/lib/speaking-audio';
import type {ProviderId} from '@/lib/providers';

type Stage='idle'|'starting'|'recording'|'paused'|'ready';
type Live={context:AudioContext;node:AudioWorkletNode;stream:MediaStream;encoder:{bytes:number;add(samples:Float32Array,rate:number):void;finish():Blob}};

// Record straight into MP3 at a quality the chosen provider can accept, so a full speaking
// test needs no external recorder and no separate conversion step.
export default function AudioRecorder({provider,providerName,limitBytes,disabled,onRecorded}:{provider:ProviderId|'none';providerName:string;limitBytes:number;disabled:boolean;onRecorded:(file:File|null)=>void}){
  const [stage,setStage]=useState<Stage>('idle');
  const [error,setError]=useState('');
  const [warning,setWarning]=useState('');
  const [seconds,setSeconds]=useState(0);
  const [bytes,setBytes]=useState(0);
  const [level,setLevel]=useState(0);
  const [preview,setPreview]=useState('');
  const live=useRef<Live|null>(null);
  const open=useRef(true);
  const captured=useRef({samples:0,rate:1,level:0,paused:false});
  const quality=planRecording(limitBytes);
  const capacity=recordableSeconds(limitBytes,quality);

  const release=useCallback(()=>{
    const current=live.current;
    live.current=null;
    if(!current)return current;
    current.node.port.onmessage=null;
    current.node.disconnect();
    current.stream.getTracks().forEach(track=>track.stop());
    current.context.close().catch(()=>{});
    return current;
  },[]);

  useEffect(()=>{open.current=true;return ()=>{open.current=false;release();};},[release]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  useEffect(()=>{
    if(stage!=='recording'&&stage!=='paused')return;
    const tick=setInterval(()=>{
      const state=captured.current;
      setSeconds(state.samples/state.rate);
      setLevel(state.level);
      setBytes(live.current?.encoder.bytes??0);
    },200);
    return ()=>clearInterval(tick);
  },[stage]);

  async function start(){
    setError('');setWarning('');setSeconds(0);setBytes(0);setLevel(0);
    onRecorded(null);
    if(preview){URL.revokeObjectURL(preview);setPreview('');}
    if(!navigator.mediaDevices?.getUserMedia||typeof AudioWorkletNode==='undefined'){
      setError('This browser cannot record audio. Record with another app and upload the MP3 or WAV file instead.');return;
    }
    setStage('starting');
    let stream:MediaStream|undefined;
    let context:AudioContext|undefined;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      // Capturing at the encoder's own rate avoids resampling; browsers that refuse the rate
      // are handled by resampling each block instead.
      try{context=new AudioContext({sampleRate:quality.sampleRate});}catch{context=new AudioContext();}
      const audio=context;
      await audio.audioWorklet.addModule('/audio/pcm-recorder.worklet.js');
      const {startMp3Encoder}=await import('@/lib/audio-encode.client');
      const encoder=await startMp3Encoder(quality);
      const node=new AudioWorkletNode(audio,'pcm-recorder');
      const silence=audio.createGain();
      silence.gain.value=0;
      captured.current={samples:0,rate:audio.sampleRate,level:0,paused:false};
      node.port.onmessage=event=>{
        const samples=event.data as Float32Array;
        const state=captured.current;
        if(state.paused||!samples.length)return;
        state.samples+=samples.length;
        let peak=0;
        for(let i=0;i<samples.length;i+=8)peak=Math.max(peak,Math.abs(samples[i]));
        state.level=peak;
        encoder.add(samples,audio.sampleRate);
      };
      audio.createMediaStreamSource(stream).connect(node);
      node.connect(silence).connect(audio.destination);
      if(audio.state==='suspended')await audio.resume();
      live.current={context:audio,node,stream,encoder};
      // The dialog can be closed while the microphone is still starting; do not leave it open.
      if(!open.current){release();return;}
      setStage('recording');
    }catch(problem){
      stream?.getTracks().forEach(track=>track.stop());
      if(!live.current)context?.close().catch(()=>{});
      release();
      setStage('idle');
      const name=problem instanceof Error?problem.name:'';
      setError(name==='NotAllowedError'||name==='SecurityError'?'Microphone access was blocked. Allow the microphone for this site in your browser, then try again.'
        :name==='NotFoundError'?'No microphone was found. Connect one and try again.'
        :'Could not start recording. Check that no other app is using the microphone, then try again.');
    }
  }

  function setPaused(paused:boolean){
    if(!live.current)return;
    captured.current.paused=paused;
    captured.current.level=0;
    setLevel(0);
    setStage(paused?'paused':'recording');
  }

  async function stop(){
    const current=live.current;
    if(!current)return;
    captured.current.paused=false;
    // Ask the worklet for the part-filled block first, so the last half second is not lost.
    await new Promise<void>(resolve=>{
      const handler=current.node.port.onmessage;
      const done=setTimeout(resolve,400);
      current.node.port.onmessage=event=>{handler?.call(current.node.port,event);clearTimeout(done);resolve();};
      current.node.port.postMessage('flush');
    });
    release();
    const length=captured.current.samples/captured.current.rate;
    const blob=current.encoder.finish();
    setLevel(0);
    if(length<5){
      setStage('idle');
      setSeconds(0);
      setBytes(0);
      setError('That recording is under five seconds. Record the speaking answers again.');
      return;
    }
    setStage('ready');
    setSeconds(length);
    setBytes(blob.size);
    const stamp=new Date().toISOString().slice(0,16).replace('T','-').replace(':','');
    const file=new File([blob],'speaking-recording-'+stamp+'.mp3',{type:'audio/mpeg',lastModified:Date.now()});
    setPreview(URL.createObjectURL(blob));
    setWarning(blob.size>limitBytes?oversizeMessage(provider,providerName,blob.size):'');
    onRecorded(file);
  }

  const remaining=Math.max(0,capacity-seconds);
  const recording=stage==='recording'||stage==='paused';
  return <div className="recorder">
    <div className="recorder-main">
      <div className={'recorder-dot'+(stage==='recording'?' live':'')} aria-hidden="true"><span style={{transform:'scale('+(1+Math.min(.3,level*.6)).toFixed(2)+')'}}/><Mic size={20}/></div>
      <div className="recorder-readout">
        <strong aria-live="off">{describeLength(seconds)}</strong>
        <span role="status" aria-live="polite">{stage==='recording'?'Recording…':stage==='paused'?'Paused':stage==='starting'?'Starting the microphone…':stage==='ready'?'Recorded '+describeLength(seconds)+' · '+describeSize(bytes):'Record the speaking test here — no other app needed.'}</span>
      </div>
      <div className="recorder-buttons">
        {stage==='idle'&&<button type="button" className="primary" disabled={disabled} onClick={start}><Mic size={17}/> Start recording</button>}
        {stage==='starting'&&<button type="button" className="primary" disabled><LoaderCircle className="spin" size={17}/> Starting…</button>}
        {recording&&<button type="button" className="secondary" disabled={disabled} onClick={()=>setPaused(stage==='recording')}>{stage==='recording'?<><Pause size={17}/> Pause</>:<><Play size={17}/> Resume</>}</button>}
        {recording&&<button type="button" className="primary" disabled={disabled} onClick={stop}><Square size={16}/> Stop</button>}
        {stage==='ready'&&<button type="button" className="secondary" disabled={disabled} onClick={start}><RotateCcw size={16}/> Record again</button>}
      </div>
    </div>
    {recording&&<div className="recorder-meter" aria-hidden="true"><div style={{width:Math.min(100,Math.round(level*140))+'%'}}/></div>}
    {preview&&stage==='ready'&&<audio controls preload="metadata" src={preview} aria-label="Recorded speaking answer"/>}
    {warning&&<p className="notice error" role="alert">{warning}</p>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <p className="muted form-note">Mono MP3 at {quality.kbps} kbps, encoded in your browser and never sent anywhere else. That is {describeLength(capacity)} of recording within the {describeSize(limitBytes)} {providerName} accepts{recording&&remaining<300?', about '+describeLength(remaining)+' left':''}.</p>
  </div>;
}
