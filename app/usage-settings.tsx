"use client";
import {useEffect,useState} from 'react';
import {Table,TableHeader,TableHead,TableRow,TableBody,TableCell} from '@/components/ui/table';
import {readJson} from '@/lib/read-json';
import type {UsageSummary} from '@/lib/usage-store';
import type {CreditStatus} from '@/lib/ai-credits';

type Data=UsageSummary&{credits:CreditStatus|null};

const tokens=(n:number)=>n>=1_000_000?(n/1_000_000).toFixed(1)+'M':n>=1000?Math.round(n/1000)+'k':String(n);
const dollars=(n:number)=>'$'+(n<0.1&&n>0?n.toFixed(3):n.toFixed(2));
const month=(m:string)=>new Date(m+'-01T00:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
// A cost that leaves out unpriced requests is a lower bound; say so rather than show it as exact.
const cost=(value:number,unpriced:number,requests:number)=>unpriced>=requests?'—':dollars(value)+(unpriced?' +':'');

export default function UsageSettings(){
  const [data,setData]=useState<Data|null>(null);const [error,setError]=useState('');
  useEffect(()=>{fetch('/api/usage',{cache:'no-store'}).then(async r=>{const d=await readJson(r) as Data&{error?:string};if(!r.ok)throw new Error(d.error);setData(d)}).catch(e=>setError(e.message))},[]);
  const unpriced=!!data?.models.some(m=>m.unpriced);
  return <>
    <div className="page-heading"><div><p className="eyebrow">AI USAGE</p><h1>What your AI requests use.</h1><p>Tokens and estimated cost for every transcription, assessment and connection test.</p></div></div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {data?.credits&&<Allowance c={data.credits}/>}
    {!data&&!error?<p>Loading AI usage…</p>:data&&!data.since?<section className="panel settings-panel"><h2>Nothing recorded yet</h2><p>Usage is recorded from now on. Run a transcription or assessment and it will appear here.</p></section>:data&&<>
      <div className="stats usage-stats">
        {(['Writing','Speaking'] as const).map(skill=>{const s=data.skills.find(x=>x.skill===skill);return <div className="stat" key={skill}>
          <span>Average per {skill.toLowerCase()} assessment</span>
          <strong>{s&&s.assessments&&s.unpriced===0?dollars(s.cost/s.assessments):s&&s.assessments?'—':'No data'}</strong>
          <small>{s?s.assessments+' assessment'+(s.assessments===1?'':'s')+', including transcription and retries':'No '+skill.toLowerCase()+' assessments yet'}{s?.unpriced?' · some requests have no known price':''}</small>
        </div>})}
      </div>
      <section className="panel settings-panel">
        <h2>By month</h2>
        <Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Requests</TableHead><TableHead>Input</TableHead><TableHead>Audio</TableHead><TableHead>Output</TableHead><TableHead>Est. cost</TableHead></TableRow></TableHeader>
          <TableBody>{data.months.map(m=><TableRow key={m.month}><TableCell>{month(m.month)}</TableCell><TableCell>{m.requests}</TableCell><TableCell>{tokens(m.inputTokens)}</TableCell><TableCell>{tokens(m.audioTokens)}</TableCell><TableCell>{tokens(m.outputTokens)}</TableCell><TableCell>{cost(m.cost,m.unpriced,m.requests)}</TableCell></TableRow>)}</TableBody></Table>
      </section>
      <section className="panel settings-panel">
        <h2>By model</h2>
        <Table><TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Requests</TableHead><TableHead>Input</TableHead><TableHead>Audio</TableHead><TableHead>Output</TableHead><TableHead>Est. cost</TableHead></TableRow></TableHeader>
          <TableBody>{data.models.map(m=><TableRow key={m.provider+m.model+m.platform}><TableCell>{m.model}{m.platform?<small className="muted"> · Bandwise AI</small>:null}</TableCell><TableCell>{m.requests}</TableCell><TableCell>{tokens(m.inputTokens)}</TableCell><TableCell>{tokens(m.audioTokens)}</TableCell><TableCell>{tokens(m.outputTokens)}</TableCell><TableCell>{cost(m.cost,m.unpriced,m.requests)}</TableCell></TableRow>)}</TableBody></Table>
      </section>
      <section className="panel settings-panel"><h2>About these numbers</h2><p>Token counts come from each AI provider’s own response. Costs are estimates from published list prices; your provider’s bill is the final word.{unpriced?' A dash or a “+” means some requests used a model whose price Bandwise doesn’t know yet, so they are counted in tokens but not in cost.':''} Recording started on {new Date(data.since!).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}.</p></section>
    </>}
  </>;
}

// Bandwise AI's monthly allowance: a writing assessment is 1 credit and a speaking test 3.
function Allowance({c}:{c:CreditStatus}){
  const left=Math.max(0,c.limit-c.used);const renews=new Date(c.renews).toLocaleDateString('en-GB',{day:'numeric',month:'long',timeZone:'UTC'});
  return <section className="panel settings-panel allowance">
    <div className="section-title"><h2>Bandwise AI this month</h2><span>Renews on {renews}</span></div>
    <div className="allowance-bar" role="meter" aria-label="Bandwise AI credits used" aria-valuemin={0} aria-valuemax={c.limit} aria-valuenow={Math.min(c.used,c.limit)}><span style={{width:(c.limit?Math.min(100,c.used/c.limit*100):100)+'%'}} data-low={left<c.limit*.1||undefined}/></div>
    <p><b>{c.used} of {c.limit} credits used</b>, {left} left. A writing assessment uses 1 credit and a speaking test 3, however many times you re-run it. Your own AI keys don’t use credits.</p>
  </section>;
}
