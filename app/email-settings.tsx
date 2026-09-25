"use client";
import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {LoaderCircle,Mail,Send} from 'lucide-react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {readJson} from '@/lib/read-json';
import {mailPresets,mailPorts,type MailState} from '@/lib/email-settings';
import type {Student} from '@/lib/ielts';

async function call(body:object){const r=await fetch('/api/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d:any=await readJson(r);if(!r.ok)throw new Error(d.error||'Could not complete the request.');return d;}
async function loadState():Promise<MailState>{const r=await fetch('/api/email',{cache:'no-store'});const d:any=await readJson(r);if(!r.ok)throw new Error(d.error);return d;}
function Choice({value,change,items,label}:{value:string;change:(v:string)=>void;items:{id:string;name:string}[];label:string}){return <Select value={value} onValueChange={change}><SelectTrigger aria-label={label} className="picker"><SelectValue/></SelectTrigger><SelectContent>{items.map(x=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select>}

export default function EmailSettings(){
  const [state,setState]=useState<MailState|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const refresh=()=>loadState().then(setState).catch(e=>setError(e.message));
  useEffect(()=>{void refresh()},[]);
  const act=async(body:object)=>{setBusy(true);setError('');try{const d=await call(body);await refresh();toast.success(d.message||'Email settings updated');return true}catch(e){setError((e as Error).message);return false}finally{setBusy(false)}};
  return <>
    <div className="page-heading"><div><p className="eyebrow">EMAIL REPORTS</p><h1>Send progress from your own inbox.</h1><p>Connect the mailbox you already use, then email students their progress reports with charts.</p></div></div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {!state?<p>Loading email settings…</p>:<>{!state.vaultReady&&<div className="notice error">Secure key storage is temporarily unavailable. Please retry later.</div>}<MailboxForm key={JSON.stringify(state)} state={state} busy={busy||!state.vaultReady} act={act}/></>}
    <section className="panel settings-panel"><h2>How it works</h2><p>Reports are sent through your mailbox’s outgoing (SMTP) server — the sending half of the IMAP settings your email app uses — so they come from your address and replies reach you. Sent reports appear in your mail provider’s Sent folder only if the provider saves SMTP messages there (Gmail does).</p><p>Your password is encrypted before it is stored and is never shown again. Most providers require an app password rather than your normal sign-in password.</p><p>To send a report, open <b>Progress</b> or <b>Students</b> and choose <b>Email report</b>. You see a preview first. Only teacher-reviewed work is included.</p></section>
  </>;
}

function MailboxForm({state,busy,act}:{state:MailState;busy:boolean;act:(b:object)=>Promise<boolean>}){
  const c=state.config;
  const initialPreset=c?(mailPresets.find(p=>p.host===c.host)?.id||'custom'):'gmail';
  const [preset,setPreset]=useState<string>(initialPreset);
  const [host,setHost]=useState(c?.host||'smtp.gmail.com');const [port,setPort]=useState(String(c?.port||465));
  const [username,setUsername]=useState(c?.username||'');const [fromEmail,setFromEmail]=useState(c?.fromEmail||'');const [fromName,setFromName]=useState(c?.fromName||'');const [password,setPassword]=useState('');
  const info=mailPresets.find(p=>p.id===preset)!;
  const changed=!c||host!==c.host||port!==String(c.port)||username!==c.username||fromEmail!==c.fromEmail||fromName!==c.fromName||!!password;
  const choose=(id:string)=>{setPreset(id);const p=mailPresets.find(x=>x.id===id)!;if(p.host){setHost(p.host);setPort(String(p.port))}};
  return <section className="panel settings-panel">
    <div className="section-title"><h2>Your mailbox</h2><span className={'status '+(state.testedAt?'reviewed':'')}>{state.testedAt?'Test email sent':c?'Saved · untested':'Not connected'}</span></div>
    <form className="form" onSubmit={async e=>{e.preventDefault();if(await act({action:'save',host,port:Number(port),username,fromEmail:fromEmail||username,fromName,password}))setPassword('')}}>
      <label>Email provider<Choice label="Email provider" value={preset} change={choose} items={mailPresets.map(p=>({id:p.id,name:p.name}))}/></label>
      <p className="form-note muted">{info.hint}</p>
      <div className="form-grid">
        <label>SMTP server<input value={host} onChange={e=>setHost(e.target.value)} required maxLength={253} placeholder="smtp.example.com" autoComplete="off"/></label>
        <label>Port<Choice label="Port" value={port} change={setPort} items={mailPorts.map(p=>({id:String(p),name:p===465?'465 · SSL/TLS':p+' · STARTTLS'}))}/></label>
        <label>Username<input value={username} onChange={e=>{setUsername(e.target.value);if(!fromEmail||fromEmail===username)setFromEmail(e.target.value)}} required maxLength={254} placeholder="you@example.com" autoComplete="off"/></label>
        <label>Password or app password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} maxLength={500} required={!c} autoComplete="new-password" placeholder={c?'Saved securely · leave blank to keep':'App password'}/></label>
        <label>Sender address<input type="email" value={fromEmail} onChange={e=>setFromEmail(e.target.value)} required maxLength={254} placeholder="you@example.com"/></label>
        <label>Sender name (optional)<input value={fromName} onChange={e=>setFromName(e.target.value)} maxLength={100} placeholder="e.g. Ms Morgan · IELTS"/></label>
      </div>
      <div className="button-row"><button className="primary" disabled={busy}>Save mailbox</button><button type="button" className="secondary" disabled={busy||!c||changed} onClick={()=>void act({action:'test'})}>{busy?<LoaderCircle className="spin" size={16}/>:<Send size={16}/>} Send test email to myself</button>{c&&<button type="button" className="text-button" disabled={busy} onClick={()=>{if(window.confirm('Disconnect this mailbox and delete the saved password?'))void act({action:'remove'})}}>Disconnect</button>}</div>
      {changed&&c&&<small className="muted">Save changes before testing.</small>}
    </form>
  </section>;
}

// Preview a student's report and send it. The preview is the exact HTML that will be emailed.
export function ReportDialog({student,onClose,openSettings}:{student:Student|null;onClose:()=>void;openSettings:()=>void}){
  const [mail,setMail]=useState<MailState|null>(null);const [note,setNote]=useState('');const [preview,setPreview]=useState<{html:string;subject:string;empty:boolean}|null>(null);const [busy,setBusy]=useState('');const [error,setError]=useState('');
  const id=student?.id;
  // Keyed by student in the parent, so state starts fresh for each student.
  useEffect(()=>{if(!id)return;let live=true;
    Promise.all([loadState(),call({action:'preview',id})]).then(([m,p])=>{if(live){setMail(m);setPreview(p)}}).catch(e=>{if(live)setError(e.message)});
    return()=>{live=false}},[id]);
  const refresh=async()=>{if(!id)return;setBusy('preview');setError('');try{setPreview(await call({action:'preview',id,note}))}catch(e){setError((e as Error).message)}finally{setBusy('')}};
  const send=async()=>{if(!id)return;setBusy('send');setError('');try{const d=await call({action:'send',id,note});toast.success(d.message);onClose()}catch(e){setError((e as Error).message)}finally{setBusy('')}};
  const ready=!!mail?.config&&!!student?.email;
  return <Dialog open={!!student} onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="upload-dialog report-dialog">
    <DialogHeader><DialogTitle>Email progress report</DialogTitle><DialogDescription>{student?.email?<>To <b>{student.name}</b> &lt;{student.email}&gt;{mail?.config&&<> · from {mail.config.fromEmail}</>}</>:<>{student?.name} has no email address yet. Add one by editing the student.</>}</DialogDescription></DialogHeader>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {mail&&!mail.config&&<div className="notice"><Mail size={18}/><div>Connect your mailbox before sending. <button className="text-button" onClick={()=>{onClose();openSettings()}}>Open email settings</button></div></div>}
    <div className="form"><label>Personal note (optional)<textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={3000} placeholder="e.g. Great improvement in coherence this month — keep planning each paragraph."/></label></div>
    <div className="button-row"><button className="secondary" disabled={!!busy} onClick={refresh}>{busy==='preview'?<LoaderCircle className="spin" size={16}/>:null} Update preview</button><button className="primary" disabled={!ready||!!busy||!preview} onClick={send}>{busy==='send'?<LoaderCircle className="spin" size={16}/>:<Send size={16}/>} Send report</button></div>
    {preview?.empty&&<p className="form-note muted">This student has no teacher-reviewed work yet, so the report will say progress is still to come.</p>}
    {preview?<iframe className="report-preview" title="Report preview" sandbox="" srcDoc={preview.html}/>:!error&&<p className="muted"><LoaderCircle className="spin" size={16}/> Building preview…</p>}
  </DialogContent></Dialog>;
}
