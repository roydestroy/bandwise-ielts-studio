import {CONTACT_EMAIL,LEGAL_UPDATED} from '@/lib/legal';
import BrandMark from '@/app/brand-mark';

// Shared frame for the privacy policy and terms: readable column, brand header, links between the two.
export default function LegalPage({title,children}:{title:string;children:React.ReactNode}){
  return <div className="lp legal">
    <header className="lp-header">
      <a href="/" className="brand lp-brand" aria-label="Bandwise home"><BrandMark/>bandwise<span className="brandperiod">.</span></a>
      <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/login" className="lp-signin">Sign in</a></nav>
    </header>
    <main className="legal-body">
      <h1>{title}</h1>
      <p className="legal-updated">Last updated {LEGAL_UPDATED}</p>
      {children}
      <p className="legal-contact">Questions? Email <a href={'mailto:'+CONTACT_EMAIL}>{CONTACT_EMAIL}</a>.</p>
    </main>
  </div>;
}
