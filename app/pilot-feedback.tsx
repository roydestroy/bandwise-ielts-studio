"use client";
import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {MessageSquareHeart,X} from 'lucide-react';
import {readJson} from '@/lib/read-json';
import type {Feedback} from '@/lib/feedback';

type Saved=Feedback&{updatedAt:string};
async function fetchFeedback(){const r=await fetch('/api/feedback',{cache:'no-store'});const d=await readJson(r) as {feedback?:Saved|null;error?:string};if(!r.ok)throw new Error(d.error);return d.feedback??null;}

const questions=[
  ['tooCheap','At what monthly price would Bandwise be so cheap that you’d doubt its quality?'],
  ['bargain','At what price would it be a bargain: good value for money?'],
  ['expensive','At what price would it start to feel expensive, though you’d still consider it?'],
  ['tooExpensive','At what price would it be too expensive to consider?'],
] as const;
const toNumber=(s:string)=>s.trim()===''?null:Number(s.replace(',','.'));
const toText=(n:number|null|undefined)=>n===null||n===undefined?'':String(n);

// The pilot survey, under Settings → Feedback. Answers can be changed later.
export default function PilotFeedback(){
  const [saved,setSaved]=useState<Saved|null|undefined>(undefined);const [error,setError]=useState('');
  useEffect(()=>{fetchFeedback().then(setSaved).catch(e=>setError((e as Error).message))},[]);
  return <>
    <div className="page-heading"><div><p className="eyebrow">PILOT FEEDBACK</p><h1>Help set Bandwise’s price.</h1><p>Five quick questions. Your answers go only to Bandwise and decide what teachers pay when it launches.</p></div></div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {saved===undefined&&!error?<p>Loading…</p>:saved!==undefined&&<FeedbackForm key={saved?.updatedAt||'new'} saved={saved} onSaved={setSaved}/>}
  </>;
}

function FeedbackForm({saved,onSaved}:{saved:Saved|null;onSaved:(s:Saved)=>void}){
  const [values,setValues]=useState<Record<string,string>>(()=>({tooCheap:toText(saved?.tooCheap),bargain:toText(saved?.bargain),expensive:toText(saved?.expensive),tooExpensive:toText(saved?.tooExpensive),hoursSaved:toText(saved?.hoursSaved)}));
  const [comments,setComments]=useState(saved?.comments||'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const set=(k:string)=>(e:React.ChangeEvent<HTMLInputElement>)=>setValues(v=>({...v,[k]:e.target.value}));
  const submit=async()=>{setBusy(true);setError('');try{
    const body={tooCheap:toNumber(values.tooCheap),bargain:toNumber(values.bargain),expensive:toNumber(values.expensive),tooExpensive:toNumber(values.tooExpensive),hoursSaved:toNumber(values.hoursSaved),comments};
    if(Object.values(body).some(v=>typeof v==='number'&&!Number.isFinite(v)))throw new Error('Use numbers only, for example 12 or 12.50.');
    const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await readJson(r) as {feedback?:Saved;error?:string};if(!r.ok||!d.feedback)throw new Error(d.error);
    toast.success('Thank you! Your answers are saved.');onSaved(d.feedback);
  }catch(e){setError((e as Error).message||'Could not save your answers.')}finally{setBusy(false)}};
  return <section className="panel settings-panel">
    <h2>What would you pay each month?</h2>
    <p className="muted feedback-intro">Think of Bandwise with AI marking included, for all your students. Answer in euros a month; skip any you’re unsure about.</p>
    {saved&&<p className="notice">You answered on {new Date(saved.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long'})}. Change anything and save again.</p>}
    {error&&<div className="notice error" role="alert">{error}</div>}
    <form className="form" onSubmit={e=>{e.preventDefault();void submit()}}>
      {questions.map(([k,q])=><label key={k}>{q}<span className="money-field"><span aria-hidden="true">€</span><input inputMode="decimal" value={values[k]} onChange={set(k)} aria-label={q+' (euros a month)'}/><span className="muted">a month</span></span></label>)}
      <label>Roughly how many hours a week does Bandwise save you?<span className="money-field"><input inputMode="decimal" value={values.hoursSaved} onChange={set('hoursSaved')} placeholder="e.g. 2"/><span className="muted">hours a week</span></span></label>
      <label>Anything else? <span className="field-hint muted">What you’d miss, what’s missing, what annoys you</span><textarea value={comments} onChange={e=>setComments(e.target.value)} maxLength={3000} rows={4}/></label>
      <div className="button-row"><button className="primary" disabled={busy}>{busy?'Saving…':saved?'Save changes':'Send answers'}</button></div>
    </form>
  </section>;
}

// A note on the overview inviting a teacher who has used Bandwise a little to answer the survey. It stays away
// once they've answered, or for good once they close it.
const DISMISSED='bandwise-feedback-dismissed';
export function FeedbackPrompt({assessments,open}:{assessments:number;open:()=>void}){
  const [show,setShow]=useState(false);
  useEffect(()=>{
    if(assessments<3)return;
    try{if(localStorage.getItem(DISMISSED))return}catch{/* storage blocked: still ask */}
    let live=true;fetchFeedback().then(f=>{if(live&&!f)setShow(true)}).catch(()=>{});return()=>{live=false};
  },[assessments]);
  if(!show)return null;
  const close=()=>{setShow(false);try{localStorage.setItem(DISMISSED,'1')}catch{/* nothing to remember it in */}};
  return <div className="notice feedback-prompt" role="note"><MessageSquareHeart size={20}/><div><b>Help set Bandwise’s price.</b> You’ve marked a few assessments now: five quick questions tell us what it’s worth to you. <button onClick={()=>{close();open()}}>Answer now</button></div><button className="icon-button" aria-label="Not now" onClick={close}><X size={16}/></button></div>;
}
