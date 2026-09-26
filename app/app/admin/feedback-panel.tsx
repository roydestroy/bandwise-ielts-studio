"use client";
import {useEffect,useState} from 'react';
import {Table,TableHeader,TableHead,TableRow,TableBody,TableCell} from '@/components/ui/table';
import {readJson} from '@/lib/read-json';
import type {FeedbackRow,FeedbackSummary} from '@/lib/feedback';

type Data={rows:FeedbackRow[];summary:FeedbackSummary};
const eur=(n:number|null)=>n===null?'—':'€'+(Number.isInteger(n)?n:n.toFixed(2));
const date=(s:string)=>new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short'});

// Teachers' answers to the pilot survey (Settings → Feedback in the studio).
export default function FeedbackPanel(){
  const [data,setData]=useState<Data|null>(null);const [error,setError]=useState('');
  useEffect(()=>{fetch('/api/admin/feedback',{cache:'no-store'}).then(async r=>{const d=await readJson(r) as Data&{error?:string};if(!r.ok)throw new Error(d.error);setData(d)}).catch(e=>setError((e as Error).message))},[]);
  if(error)return <div className="notice error" role="alert">{error}</div>;
  if(!data)return <p className="muted">Loading…</p>;
  const s=data.summary;
  return <>
    <div className="page-heading"><div><p className="eyebrow">PILOT FEEDBACK</p><h1>What teachers would pay</h1><p>Answers to the survey under Settings → Feedback. Teachers who have marked three assessments are invited to answer on their overview.</p></div></div>
    {!s.responses?<section className="panel"><p className="muted">No answers yet.</p></section>:<>
      <div className="stats">
        <div className="stat"><span>Responses</span><strong>{s.responses}</strong><small>{s.responses<5?'Too few to rely on yet':'Medians below'}</small></div>
        <div className="stat"><span>Acceptable range</span><strong className="stat-pair">{eur(s.bargain)} <em className="stat-sub">to {eur(s.expensive)}</em></strong><small>median “bargain” to median “expensive”, a month</small></div>
        <div className="stat"><span>Too cheap / too expensive</span><strong className="stat-pair">{eur(s.tooCheap)} <em className="stat-sub">/ {eur(s.tooExpensive)}</em></strong><small>below or above these, teachers walk away</small></div>
        <div className="stat"><span>Time saved</span><strong>{s.hoursSaved===null?'—':s.hoursSaved} <em className="stat-sub">h / week</em></strong><small>median answer</small></div>
      </div>
      <section className="panel usage-table">
        <div className="section-title"><h2>Answers</h2><span>Newest first · euros a month</span></div>
        <Table><TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Too cheap</TableHead><TableHead>Bargain</TableHead><TableHead>Expensive</TableHead><TableHead>Too expensive</TableHead><TableHead>Hours saved</TableHead><TableHead>Comments</TableHead></TableRow></TableHeader>
          <TableBody>{data.rows.map(r=><TableRow key={r.owner}>
            <TableCell><b>{r.email}</b><small className="muted admin-email">{date(r.updatedAt)}</small></TableCell>
            <TableCell>{eur(r.tooCheap)}</TableCell><TableCell>{eur(r.bargain)}</TableCell><TableCell>{eur(r.expensive)}</TableCell><TableCell>{eur(r.tooExpensive)}</TableCell>
            <TableCell>{r.hoursSaved??'—'}</TableCell><TableCell className="feedback-comments">{r.comments||'—'}</TableCell>
          </TableRow>)}</TableBody></Table>
      </section>
    </>}
  </>;
}
