import Link from 'next/link';
import {Clock,Ban} from 'lucide-react';

export default function Pending({email,suspended,signOut}:{email:string;suspended:boolean;signOut:string|null}){
  return <main className="auth-page"><div className="auth-card">
    <Link href="/" className="brand auth-brand"><span className="brandmark">b</span>bandwise<span className="brandperiod">.</span></Link>
    <span className="auth-icon">{suspended?<Ban size={22}/>:<Clock size={22}/>}</span>
    <h1>{suspended?'This account is paused':'Thanks for signing up'}</h1>
    <p>{suspended?<>The workspace for <b>{email}</b> is currently paused. Please get in touch if you think this is a mistake.</>:<>Your account for <b>{email}</b> is waiting for approval. We’ll email you as soon as it’s ready. This usually takes less than a day.</>}</p>
    {signOut&&<form method={signOut==='/logout'?'post':'get'} action={signOut}><button className="secondary auth-wide">Sign out</button></form>}
  </div></main>;
}
