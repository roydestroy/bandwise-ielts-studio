import {Clock,Ban} from 'lucide-react';
import BrandMark from '@/app/brand-mark';

export default function Pending({email,suspended,signOut}:{email:string;suspended:boolean;signOut:string|null}){
  return <main className="auth-page"><div className="auth-card">
    <a href="/" className="brand auth-brand"><BrandMark/>bandwise<span className="brandperiod">.</span></a>
    <span className="auth-icon">{suspended?<Ban size={22}/>:<Clock size={22}/>}</span>
    <h1>{suspended?'This account is paused':'Thanks for signing up'}</h1>
    <p>{suspended?<>The workspace for <b>{email}</b> is currently paused. Please get in touch if you think this is a mistake.</>:<>Your account for <b>{email}</b> is waiting for approval. We’ll email you as soon as it’s ready. This usually takes less than a day.</>}</p>
    {signOut&&<form method={signOut==='/logout'?'post':'get'} action={signOut}><button className="secondary auth-wide">Sign out</button></form>}
  </div></main>;
}
