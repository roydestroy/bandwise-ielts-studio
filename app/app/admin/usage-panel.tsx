"use client";
import {useEffect,useMemo,useState} from 'react';
import {Table,TableHeader,TableHead,TableRow,TableBody,TableCell} from '@/components/ui/table';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {Checkbox} from '@/components/ui/checkbox';
import {readJson} from '@/lib/read-json';
import {summarise,credits,CREDITS,type WorkspaceUsage,type ModelUsage} from '@/lib/pilot-stats';

type Data={month:string;months:string[];me:string;rows:WorkspaceUsage[];models:ModelUsage[]};
const usd=(n:number|null)=>n===null?'—':'$'+(n>0&&n<1?n.toFixed(3):n.toFixed(2));
const monthName=(m:string)=>new Date(m+'-01T00:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
const avg=(total:number,n:number)=>n?Math.round(total/n).toLocaleString('en-GB'):'—';

async function fetchUsage(month:string){const r=await fetch('/api/admin/usage'+(month?'?month='+month:''),{cache:'no-store'});const d=await readJson(r) as Data&{error?:string};if(!r.ok)throw new Error(d.error);return d;}

// What teachers used in a month and what it cost, for setting plan prices during the pilot.
export default function UsagePanel(){
  const [month,setMonth]=useState('');const [data,setData]=useState<Data|null>(null);const [error,setError]=useState('');
  // Your own sample runs would skew the pilot's numbers, so they're left out unless you ask.
  const [withMe,setWithMe]=useState(false);
  useEffect(()=>{let live=true;fetchUsage(month).then(d=>{if(live){setData(d);setError('')}}).catch(e=>{if(live)setError((e as Error).message)});return()=>{live=false}},[month]);
  const rows=useMemo(()=>data?data.rows.filter(r=>withMe||r.id!==data.me):[],[data,withMe]);
  const s=useMemo(()=>summarise(rows),[rows]);
  const shown=[...rows].sort((a,b)=>credits(b)-credits(a)||b.saved-a.saved);
  if(error)return <div className="notice error" role="alert">{error}</div>;
  if(!data)return <p className="muted">Loading…</p>;
  return <>
    <div className="page-heading"><div><p className="eyebrow">PILOT USAGE</p><h1>Usage and pricing</h1><p>What teachers used in {monthName(data.month)}, priced at Google’s paid rates.</p></div>
      <div className="usage-controls">
        <NativeSelect aria-label="Month" value={data.month} onChange={e=>setMonth(e.target.value)}>{data.months.map(m=><NativeSelectOption key={m} value={m}>{monthName(m)}</NativeSelectOption>)}</NativeSelect>
        <label className="check-label"><Checkbox checked={withMe} onCheckedChange={v=>setWithMe(v===true)}/> Include my workspace</label>
      </div>
    </div>
    <div className="stats">
      <div className="stat"><span>Active teachers</span><strong>{s.active}</strong><small>of {rows.length} accounts used AI marking</small></div>
      <div className="stat"><span>AI-marked assessments</span><strong>{s.writing+s.speaking}</strong><small>{s.writing} writing · {s.speaking} speaking</small></div>
      <div className="stat"><span>Credits per teacher</span><strong>{s.typicalCredits} <em className="stat-sub">/ {s.heavyCredits}</em></strong><small>typical / heavy (80th percentile)</small></div>
      <div className="stat"><span>Cost per assessment</span><strong className="stat-pair">{usd(s.costPerWriting)} <em className="stat-sub">/ {usd(s.costPerSpeaking)}</em></strong><small>writing / speaking test</small></div>
    </div>
    <section className="panel usage-plans">
      <div className="section-title"><h2>Against the draft plans</h2><span>{CREDITS.writing} credit per writing, {CREDITS.speaking} per speaking test</span></div>
      {s.active?<ul>
        {s.plans.map(p=><li key={p.name}><b>{p.name}</b> ({p.credits} credits): {p.fit} of {s.active} active {s.active===1?'teacher fits':'teachers fit'}.</li>)}
        <li>A heavy teacher costs about <b>{usd(s.heavyCost)}</b> a month in AI, and the busiest used {s.maxCredits} credits. Total AI cost this month: <b>{usd(s.cost)}</b>.</li>
      </ul>:<p className="muted">No AI marking this month yet.</p>}
      {s.unpriced>0&&<p className="muted">{s.unpriced} AI {s.unpriced===1?'call has':'calls have'} no price (a model without a checked price), so costs are a little low.</p>}
      {s.active>0&&s.active<5&&<p className="muted">With fewer than 5 active teachers, treat these as anecdotes rather than averages.</p>}
    </section>
    <section className="panel usage-table">
      <div className="section-title"><h2>Teachers</h2><span>Busiest first</span></div>
      <Table><TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Students</TableHead><TableHead>Writing</TableHead><TableHead>Speaking</TableHead><TableHead>Credits</TableHead><TableHead title="Assessments created this month that have the teacher’s own marks">Reviewed</TableHead><TableHead>AI cost</TableHead><TableHead title="Share of the cost on Bandwise AI rather than the teacher’s own key">On Bandwise AI</TableHead></TableRow></TableHeader>
        <TableBody>{shown.map(r=><TableRow key={r.id}>
          <TableCell><b>{r.name||r.email||'Unknown'}</b>{r.name&&r.email&&<small className="muted admin-email">{r.email}</small>}</TableCell>
          <TableCell>{r.students}</TableCell><TableCell>{r.writing}</TableCell><TableCell>{r.speaking}</TableCell><TableCell><b>{credits(r)}</b></TableCell>
          <TableCell>{r.saved?r.reviewed+' of '+r.saved:'—'}</TableCell><TableCell>{r.requests?usd(r.cost):'—'}</TableCell>
          <TableCell>{r.cost>0?Math.round(r.platformCost/r.cost*100)+'%':'—'}</TableCell>
        </TableRow>)}</TableBody></Table>
    </section>
    <section className="panel usage-table">
      <div className="section-title"><h2>By model</h2><span>All teachers, including you</span></div>
      {data.models.length?<Table><TableHeader><TableRow><TableHead>Skill</TableHead><TableHead>Model</TableHead><TableHead>Assessments</TableHead><TableHead>Cost each</TableHead><TableHead>Avg input tokens</TableHead><TableHead>Avg output tokens</TableHead></TableRow></TableHeader>
        <TableBody>{data.models.map(m=><TableRow key={m.skill+m.provider+m.model+m.platform}>
          <TableCell>{m.skill}</TableCell><TableCell>{m.model}{m.platform?<small className="muted admin-email">Bandwise AI</small>:null}</TableCell><TableCell>{m.assessments}</TableCell>
          <TableCell>{m.unpriced&&!m.cost?'No price':usd(m.cost/m.assessments)}</TableCell><TableCell>{avg(m.inputTokens+m.audioTokens,m.assessments)}</TableCell><TableCell>{avg(m.outputTokens,m.assessments)}</TableCell>
        </TableRow>)}</TableBody></Table>:<p className="muted">No AI marking this month yet.</p>}
    </section>
  </>;
}
