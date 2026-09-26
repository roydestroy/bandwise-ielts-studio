import Link from 'next/link';
import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentAccount} from '@/app/access-auth';
import {authEnabled,googleEnabled} from '@/lib/auth';
import {systemEmailReady} from '@/lib/system-email';
import LoginForm from './login-form';

export const metadata:Metadata={title:'Sign in | Bandwise',robots:{index:false,follow:true}};

export default async function Login(){
  if(await currentAccount())redirect('/app');
  // Email codes work in local development too, where they are printed to the terminal.
  const email=authEnabled()&&(systemEmailReady()||import.meta.env.DEV);
  return <main className="auth-page"><div className="auth-card">
    <Link href="/" className="brand auth-brand"><span className="brandmark">b</span>bandwise<span className="brandperiod">.</span></Link>
    <h1>Sign in or create an account</h1>
    <p>New to Bandwise? Signing in creates your account. We’ll review it and let you know by email when it’s ready.</p>
    {authEnabled()?<LoginForm google={googleEnabled()} email={email}/>:<div className="notice">Sign-in is being set up. Existing teachers can still reach the studio at <a href="/app">/app</a>.</div>}
    <p className="auth-small">By continuing you agree to the <Link href="/terms">Terms of Service</Link> and confirm you have read the <Link href="/privacy">Privacy Policy</Link>. Estimates are not official IELTS scores.</p>
  </div></main>;
}
