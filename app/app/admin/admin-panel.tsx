"use client";
import {useEffect,useState} from 'react';
import {Toaster,toast} from 'sonner';
import {ArrowLeft} from 'lucide-react';
import {Table,TableHeader,TableHead,TableRow,TableBody,TableCell} from '@/components/ui/table';
import {readJson} from '@/lib/read-json';
import type {WorkspaceRow} from '@/lib/workspaces';

const date=(s:string|null)=>s?new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
const label={pending:'Waiting',active:'Approved',suspended:'Paused'} as const;

async function fetchRows(){const r=await fetch('/api/admin',{cache:'no-store'});const d=await readJson(r) as {workspaces?:WorkspaceRow[];error?:string};if(!r.ok)throw new Error(d.error);return d.workspaces||[];}

export default function AdminPanel({me}:{me:string}){
  const [rows,setRows]=useState<WorkspaceRow[]|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState('');
  const load=()=>fetchRows().then(setRows).catch(e=>setError((e as Error).message));
  useEffect(()=>{fetchRows().then(setRows).catch(e=>setError((e as Error).message))},[]);
  const act=async(id:string,action:'approve'|'suspend')=>{setBusy(id);try{const r=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})});const d=await readJson(r) as {message?:string;error?:string};if(!r.ok)throw new Error(d.error);toast.success(d.message||'Updated');await load();}catch(e){toast.error((e as Error).message)}finally{setBusy('')}};
  const waiting=rows?.filter(r=>r.status==='pending').length??0;
  return <main className="main admin-main"><Toaster richColors position="top-right"/>
    <a className="text-button back" href="/app"><ArrowLeft size={16}/> Back to the studio</a>
    <div className="page-heading"><div><p className="eyebrow">ADMIN</p><h1>Accounts</h1><p>{rows?waiting?waiting+' waiting for approval.':'Nobody is waiting for approval.':'Loading…'}</p></div></div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {rows&&<section className="panel"><Table><TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Signed up</TableHead><TableHead>Students</TableHead><TableHead>Status</TableHead><TableHead/></TableRow></TableHeader>
      <TableBody>{rows.map(r=><TableRow key={r.id}>
        <TableCell><b>{r.name||r.email||'Unknown'}</b>{r.name&&r.email&&<small className="muted admin-email">{r.email}</small>}</TableCell>
        <TableCell>{date(r.created_at)}</TableCell><TableCell>{r.students}</TableCell>
        <TableCell><span className={'status '+(r.status==='active'?'reviewed':'')}>{label[r.status]}</span></TableCell>
        <TableCell className="admin-actions">{r.id===me?<span className="muted">You</span>:<>
          {r.status!=='active'&&<button className="primary" disabled={!!busy} onClick={()=>void act(r.id,'approve')}>Approve</button>}
          {r.status==='active'&&<button className="secondary" disabled={!!busy} onClick={()=>void act(r.id,'suspend')}>Pause</button>}
        </>}</TableCell>
      </TableRow>)}</TableBody></Table></section>}
  </main>;
}
