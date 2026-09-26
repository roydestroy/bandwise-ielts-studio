"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import {readJson} from '@/lib/read-json';
import {DEFAULT_BRAND_COLOR,LOGO_MAX_BYTES,contrastWithWhite,type ReportBrand} from '@/lib/branding';

// One shared copy of the teacher's branding for this page, refreshed when Settings saves a change.
let cached:Promise<ReportBrand|null>|null=null;
const listeners=new Set<(b:ReportBrand|null)=>void>();
function loadBranding(){cached??=fetch('/api/branding',{cache:'no-store'}).then(async r=>{const d=await readJson(r) as {branding?:ReportBrand|null;error?:string};if(!r.ok)throw new Error(d.error);return d.branding??null}).catch(()=>{cached=null;return null});return cached;}
function publish(b:ReportBrand|null){cached=Promise.resolve(b);listeners.forEach(l=>l(b));}
export function useBranding(){
  const [brand,setBrand]=useState<ReportBrand|null>(null);
  useEffect(()=>{let live=true;void loadBranding().then(b=>{if(live)setBrand(b)});listeners.add(setBrand);return ()=>{live=false;listeners.delete(setBrand)}},[]);
  return brand;
}

// The printable practice report's heading: the teacher's brand when set, otherwise the standard title.
// It also passes the brand colour to the report's headings.
export function PrintReportHeading(){
  const brand=useBranding();const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{const report=ref.current?.parentElement;if(!report)return;if(brand)report.style.setProperty('--report-accent',brand.color);else report.style.removeProperty('--report-accent');},[brand]);
  return <div ref={ref} className="print-brand">
    {brand&&<div className="print-brand-head">{brand.logoUrl&&<img src={brand.logoUrl} alt={brand.name}/>}<div><strong>{brand.name}</strong>{brand.contact&&<small>{brand.contact}</small>}</div></div>}
    <h1>{brand?'IELTS practice report':'Bandwise · IELTS practice report'}</h1>
  </div>;
}
export function PrintReportFooter(){const brand=useBranding();return brand?<p className="print-brand-foot">Made with Bandwise</p>:null;}

export default function BrandingSettings(){
  const [brand,setBrand]=useState<ReportBrand|null|undefined>(undefined);const [error,setError]=useState('');
  useEffect(()=>{fetch('/api/branding',{cache:'no-store'}).then(async r=>{const d=await readJson(r) as {branding?:ReportBrand|null;error?:string};if(!r.ok)throw new Error(d.error);setBrand(d.branding??null)}).catch(e=>setError((e as Error).message))},[]);
  return <>
    <div className="page-heading"><div><p className="eyebrow">REPORT BRANDING</p><h1>Put your name on every report.</h1><p>Your name or school, logo and colour appear on printed practice reports and emailed progress reports.</p></div></div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {brand===undefined&&!error?<p>Loading branding…</p>:brand!==undefined&&<BrandingForm key={JSON.stringify(brand)} brand={brand} saved={b=>{setBrand(b);publish(b)}}/>}
  </>;
}

function BrandingForm({brand,saved}:{brand:ReportBrand|null;saved:(b:ReportBrand|null)=>void}){
  const [name,setName]=useState(brand?.name||'');const [contact,setContact]=useState(brand?.contact||'');const [color,setColor]=useState(brand?.color||DEFAULT_BRAND_COLOR);
  const [logo,setLogo]=useState<File|null>(null);const [preview,setPreview]=useState<string|null>(brand?.logoUrl||null);const [removeLogo,setRemoveLogo]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const hex=/^#[0-9a-f]{6}$/i.test(color);const readable=hex&&contrastWithWhite(color.toLowerCase())>=4.5;
  // A picked file is previewed from a local object URL, released when replaced or when the form closes.
  const objectUrl=useRef<string|null>(null);
  useEffect(()=>()=>{if(objectUrl.current)URL.revokeObjectURL(objectUrl.current)},[]);
  const pick=(f:File|null)=>{setError('');if(!f)return;if(!['image/png','image/jpeg'].includes(f.type)){setError('Upload the logo as a PNG or JPEG image.');return}if(f.size>LOGO_MAX_BYTES){setError('Keep the logo under 500 KB.');return}if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current=URL.createObjectURL(f);setPreview(objectUrl.current);setLogo(f);setRemoveLogo(false)};
  const send=async(form:FormData)=>{setBusy(true);setError('');try{const r=await fetch('/api/branding',{method:'POST',body:form});const d=await readJson(r) as {branding?:ReportBrand|null;message?:string;error?:string};if(!r.ok)throw new Error(d.error);saved(d.branding??null);toast.success(d.message||'Branding saved')}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
  const shownLogo=removeLogo?null:preview;
  return <div className="branding-layout">
    <section className="panel settings-panel">
      <h2>Your brand</h2>
      {error&&<div className="notice error" role="alert">{error}</div>}
      <form className="form" onSubmit={e=>{e.preventDefault();const f=new FormData();f.set('name',name);f.set('contact',contact);f.set('color',color);if(logo)f.set('logo',logo);if(removeLogo)f.set('remove_logo','1');void send(f)}}>
        <label>Name on reports<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required placeholder="e.g. Maria’s IELTS Studio"/></label>
        <label>Contact line <span className="field-hint muted">Optional: a website, email or phone number</span><input value={contact} onChange={e=>setContact(e.target.value)} maxLength={120} placeholder="e.g. mariasielts.com"/></label>
        <label>Colour<div className="color-field"><input type="color" value={hex?color:DEFAULT_BRAND_COLOR} onChange={e=>setColor(e.target.value)} aria-label="Pick a colour"/><input value={color} onChange={e=>setColor(e.target.value.trim())} maxLength={7} aria-label="Colour code"/></div>{hex&&!readable&&<span className="field-hint" style={{color:'var(--destructive)'}}>Too light to read on white. Choose a darker shade.</span>}</label>
        <div className="form-label">Logo <span className="field-hint muted">PNG or JPEG, under 500 KB. A wide logo on a white or transparent background works best.</span>
          <input className="file-input" type="file" accept="image/png,image/jpeg" onChange={e=>pick(e.target.files?.[0]||null)}/>
          {preview&&!logo&&<label className="check-label"><input type="checkbox" checked={removeLogo} onChange={e=>setRemoveLogo(e.target.checked)}/> Remove the current logo</label>}
        </div>
        <div className="button-row"><button className="primary" disabled={busy||!name.trim()||!readable}>{busy?'Saving…':'Save branding'}</button>{brand&&<button type="button" className="text-button" disabled={busy} onClick={()=>{const f=new FormData();f.set('action','remove');void send(f)}}>Remove branding</button>}</div>
      </form>
    </section>
    <section className="panel settings-panel branding-preview" aria-label="Preview">
      <h2>Preview</h2>
      <p className="muted">How the top of a report looks.</p>
      <div className="brand-sample" style={{borderTopColor:readable?color:DEFAULT_BRAND_COLOR}}>
        {shownLogo&&<img src={shownLogo} alt=""/>}
        <strong style={{color:readable?color:DEFAULT_BRAND_COLOR}}>{name||'Your name or school'}</strong>
        {contact&&<small>{contact}</small>}
        <span className="brand-sample-eyebrow" style={{color:readable?color:DEFAULT_BRAND_COLOR}}>IELTS PROGRESS REPORT</span>
        <b>Student name</b>
      </div>
      <p className="muted brand-sample-foot">Reports end with a small “Made with Bandwise” line.</p>
    </section>
  </div>;
}
