"use client";
import {useState} from 'react';
import {createAuthClient} from 'better-auth/react';
import {emailOTPClient} from 'better-auth/client/plugins';
import {LoaderCircle,Mail,ArrowLeft} from 'lucide-react';

const client=createAuthClient({basePath:'/auth',plugins:[emailOTPClient()]});
// Better Auth reports "too many requests" with status 429; say what that means here.
const message=(e:{status?:number;message?:string}|null|undefined,fallback:string)=>e?.status===429?'Too many attempts. Please wait a few minutes and try again.':e?.message||fallback;

export default function LoginForm({google,email:emailEnabled}:{google:boolean;email:boolean}){
  const [email,setEmail]=useState('');const [code,setCode]=useState('');const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState<''|'google'|'send'|'verify'>('');const [error,setError]=useState('');
  const withGoogle=async()=>{setBusy('google');setError('');const {error}=await client.signIn.social({provider:'google',callbackURL:'/app',errorCallbackURL:'/login?error=google'});if(error){setError(message(error,'Google sign-in failed. Please try again.'));setBusy('')}};
  const send=async(e:React.FormEvent)=>{e.preventDefault();setBusy('send');setError('');const {error}=await client.emailOtp.sendVerificationOtp({email:email.trim(),type:'sign-in'});setBusy('');if(error)setError(message(error,'We couldn’t send a code. Check the address and try again.'));else{setSent(true);setCode('');}};
  const verify=async(e:React.FormEvent)=>{e.preventDefault();setBusy('verify');setError('');const {error}=await client.signIn.emailOtp({email:email.trim(),otp:code.trim()});if(error){setBusy('');setError(message(error,'That code didn’t work. Check it, or send a new one.'));}else window.location.assign('/app');};
  return <div className="auth-form">
    {error&&<div className="notice error" role="alert">{error}</div>}
    {google&&!sent&&<button type="button" className="secondary auth-wide google-button" onClick={withGoogle} disabled={!!busy}>{busy==='google'?<LoaderCircle className="spin" size={17}/>:<GoogleMark/>} Continue with Google</button>}
    {google&&emailEnabled&&!sent&&<div className="auth-divider"><span>or</span></div>}
    {emailEnabled&&!sent&&<form className="form" onSubmit={send}>
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <button className="primary auth-wide" disabled={!!busy}>{busy==='send'?<LoaderCircle className="spin" size={17}/>:<Mail size={17}/>} Email me a sign-in code</button>
    </form>}
    {sent&&<form className="form" onSubmit={verify}>
      <p className="auth-sent">We sent a 6-digit code to <b>{email.trim()}</b>. It expires in 10 minutes.</p>
      <label>Sign-in code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="123456" className="code-input" autoFocus/></label>
      <button className="primary auth-wide" disabled={!!busy||code.length!==6}>{busy==='verify'?<LoaderCircle className="spin" size={17}/>:null} Sign in</button>
      <button type="button" className="text-button" onClick={()=>{setSent(false);setError('')}}><ArrowLeft size={15}/> Use a different email</button>
    </form>}
    {!google&&!emailEnabled&&<div className="notice">Sign-in is being set up. Please try again soon.</div>}
  </div>;
}

function GoogleMark(){return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>}
