"use client";
import {useEffect,useState} from 'react';
import {Table,TableHeader,TableHead,TableRow,TableBody,TableCell} from '@/components/ui/table';
import {readJson} from '@/lib/read-json';
import type {AccuracyReport,Agreement} from '@/lib/accuracy';

// The plan's bar: at least this many reviewed assessments before judging, and within half a band on average.
const ENOUGH=30,TARGET=.5;
const band=(n:number|null)=>n===null?'—':n.toFixed(2);
const pct=(n:number|null)=>n===null?'—':Math.round(n*100)+'%';
const leans=(a:Agreement)=>a.bias===null?'—':Math.abs(a.bias)<.1?'Even':(a.bias>0?'AI higher by ':'AI lower by ')+Math.abs(a.bias).toFixed(2);

function verdict(a:Agreement){
  if(!a.n)return {tone:'',text:'No reviewed assessments yet.'};
  if(a.n<ENOUGH)return {tone:'',text:`${a.n} of the ${ENOUGH} reviewed assessments needed before this means much.`};
  return a.mae!<=TARGET?{tone:'good',text:'Within half a band of the teacher on average.'}:{tone:'bad',text:'Further from the teacher than half a band on average.'};
}

export default function AccuracyPanel(){
  const [data,setData]=useState<AccuracyReport|null>(null);const [error,setError]=useState('');
  useEffect(()=>{fetch('/api/admin/accuracy',{cache:'no-store'}).then(async r=>{const d=await readJson(r) as AccuracyReport&{error?:string};if(!r.ok)throw new Error(d.error);setData(d)}).catch(e=>setError((e as Error).message))},[]);
  if(error)return <div className="notice error" role="alert">{error}</div>;
  if(!data)return <p className="muted">Loading…</p>;
  return <>
    <div className="page-heading"><div><p className="eyebrow">ACCURACY</p><h1>AI against teacher marks</h1><p>Every assessment where a teacher saved their own bands, across all teachers. The aim is to be within about half a band of the teacher.</p></div></div>
    {!data.skills.length?<section className="panel"><p className="muted">No reviewed assessments yet. When a teacher saves their own bands on an AI-marked assessment, it appears here.</p></section>:<>
      <div className="stats accuracy-stats">
        {data.skills.map(s=>{const v=verdict(s.overall);return <div className="stat" key={s.skill}>
          <span>{s.skill}: average difference</span><strong>{band(s.overall.mae)} <em className="stat-sub">bands</em></strong>
          <small>{pct(s.overall.within)} within half a band · {leans(s.overall)} · {s.overall.n} assessments</small>
          <p className={'accuracy-verdict '+v.tone}>{v.text}</p>
        </div>})}
      </div>
      {data.skills.map(s=><section className="panel usage-table" key={s.skill}>
        <div className="section-title"><h2>{s.skill} by criterion</h2><span>“Leans” shows which way the AI differs from the teacher</span></div>
        <Table><TableHeader><TableRow><TableHead>Criterion</TableHead><TableHead>Pairs</TableHead><TableHead>Average difference</TableHead><TableHead>Within half a band</TableHead><TableHead>Leans</TableHead></TableRow></TableHeader>
          <TableBody>{s.criteria.map(c=><TableRow key={c.name}><TableCell><b>{c.name}</b></TableCell><TableCell>{c.agreement.n}</TableCell><TableCell>{band(c.agreement.mae)}</TableCell><TableCell>{pct(c.agreement.within)}</TableCell><TableCell>{leans(c.agreement)}</TableCell></TableRow>)}</TableBody></Table>
      </section>)}
      <section className="panel usage-table">
        <div className="section-title"><h2>By model</h2><span>Task band (the mean of the four criteria)</span></div>
        <Table><TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Assessments</TableHead><TableHead>Average difference</TableHead><TableHead>Within half a band</TableHead><TableHead>Leans</TableHead></TableRow></TableHeader>
          <TableBody>{data.models.map(m=><TableRow key={m.model}><TableCell>{m.model}</TableCell><TableCell>{m.overall.n}</TableCell><TableCell>{band(m.overall.mae)}</TableCell><TableCell>{pct(m.overall.within)}</TableCell><TableCell>{leans(m.overall)}</TableCell></TableRow>)}</TableBody></Table>
      </section>
    </>}
  </>;
}
