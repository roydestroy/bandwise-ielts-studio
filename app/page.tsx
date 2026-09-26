import type {Metadata} from 'next';
import {FileText,Mic,Headphones,BookOpen,ChartNoAxesCombined,Mail,ShieldCheck,UserCheck,ArrowRight,Check,Printer,Target,ListChecks,Quote} from 'lucide-react';

// The public landing page. The studio itself lives at /app, behind sign-in.
const CONTACT_EMAIL='panagoulix@gmail.com';
const accessLink='mailto:'+CONTACT_EMAIL+'?subject='+encodeURIComponent('Bandwise early access')+'&body='+encodeURIComponent('Hi, I would like to try Bandwise.\n\nI teach IELTS as: (private tutor / school / other)\nRoughly how many students: \n');

export const metadata:Metadata={
  title:'Bandwise | IELTS marking support for teachers',
  description:'Criterion-by-criterion feedback for IELTS Writing and Speaking, with next steps for every student, printable practice reports and emailed progress reports. The teacher reviews and confirms every score.',
};

const features=[
  {icon:FileText,tone:'writing',title:'Writing',text:'Upload a photo or PDF of a handwritten essay. You check the transcription, then get a band and written feedback for each of the four official criteria, with a next step for each.'},
  {icon:Mic,tone:'speaking',title:'Speaking',text:'Record the test in the browser or upload a recording. It is assessed from the audio itself, so feedback on pronunciation is based on what the student actually said.'},
  {icon:Headphones,tone:'listening',title:'Reading & Listening',text:'Enter the raw score out of 40 and the band appears at once, with separate Academic and General Training Reading tables.'},
  {icon:ChartNoAxesCombined,tone:'progress',title:'Progress tracking',text:'Each student’s history per skill, their latest criterion profile, and a flag when practice falls below their university’s minimum band.'},
  {icon:Mail,tone:'reports',title:'Reports for students',text:'A printable report for every piece of work, and progress reports emailed from your own address. Only work you have reviewed is included.'},
  {icon:BookOpen,tone:'rubric',title:'Official descriptors',text:'Assessments are made against the published IELTS band descriptors, and the full-test band calculator combines results the way the real test does.'},
];

const criteria=[['Task Response',6.5],['Coherence & Cohesion',6],['Lexical Resource',7],['Grammatical Range & Accuracy',6]] as const;

// What a student receives, drawn from the fields every assessment produces (summary, per-criterion evidence
// and next step, strengths, priorities) and from the emailed progress report. The content is a sample.
const feedbackParts=[
  {icon:ListChecks,title:'A band for each criterion',text:'The four official criteria, each with its own band: from Task Response and Coherence and Cohesion in writing to Fluency and Pronunciation in speaking.'},
  {icon:Quote,title:'Evidence from their own work',text:'Each band is explained with short quotes from the essay or recording, so students can see exactly what earned it.'},
  {icon:Target,title:'A next step for every criterion',text:'Concrete advice on what to change next time. You also get their main strengths and top priorities, ready to talk through in class.'},
];
const reportCriteria=[
  {name:'Task Response',band:'6.5',evidence:'A clear position is stated (“I partly agree”) and kept throughout, but the second main idea is listed rather than developed.',next:'Support each main idea with a specific example or a result, not only a statement.'},
  {name:'Lexical Resource',band:'7.0',evidence:'Good range for the topic (“congestion charge”, “public transport network”), with occasional repetition of “cars”.',next:'Vary how you refer to the key subject: “private vehicles”, “drivers”, “car owners”.'},
];
const progress=[['Test 1','5.5'],['Test 2','6.0'],['Test 3','6.5']] as const;

const faqs=[
  ['Is this an official IELTS score?','No. Bandwise gives a practice estimate to support your own judgement. You review, adjust and confirm every score before a student sees it.'],
  ['Do I need an AI account or API key?','During early access, yes: you connect your own key for OpenAI, Gemini, Claude or Qwen in Settings, and the provider bills you directly. A built-in option that needs no key is on the way.'],
  ['Where is student work stored?','On Cloudflare, in private storage. Each teacher has a separate workspace, and files are only sent to the AI provider you choose when you ask for an assessment.'],
  ['Does it include Cambridge test material?','No. You can tag work with a Cambridge book and test number to keep things organised, but no test passages, audio or questions are stored or reproduced.'],
];

export default function Landing(){
  return <div className="lp">
    <header className="lp-header">
      <a href="/" className="brand lp-brand" aria-label="Bandwise home"><span className="brandmark">b</span>bandwise<span className="brandperiod">.</span></a>
      <nav aria-label="Main">
        <a href="#feedback">Feedback</a>
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
        <a href="#faq">FAQ</a>
        <a href="/app" className="lp-signin">Sign in</a>
      </nav>
    </header>

    <main>
      <section className="lp-hero">
        <div className="lp-hero-text">
          <p className="eyebrow">FOR IELTS TEACHERS</p>
          <h1>Detailed IELTS feedback for every student, in a fraction of the marking time.</h1>
          <p className="lp-lead">Bandwise drafts band estimates and written feedback for Writing and Speaking, criterion by criterion, with a clear next step for each. You review and adjust it, then give students a report they can act on and a progress record they can see improving.</p>
          <div className="lp-actions">
            <a className="primary" href={accessLink}>Request early access <ArrowRight size={17}/></a>
            <a className="secondary" href="/app">Sign in</a>
          </div>
          <ul className="lp-points">
            <li><Check size={16}/> Feedback and next steps for each criterion</li>
            <li><Check size={16}/> Printable and emailed student reports</li>
            <li><Check size={16}/> You review every score</li>
          </ul>
        </div>
        <div className="lp-mock" aria-label="Example of a Writing Task 2 estimate with feedback" role="img">
          <div className="lp-mock-head">
            <div><small>WRITING TASK 2 · ACADEMIC</small><strong>Cities and car ownership</strong></div>
            <span className="status">Needs review</span>
          </div>
          <div className="band-summary"><div><p>AI estimate</p><strong>6.5<small>/ 9</small></strong><p>Target band 7.0</p></div></div>
          {criteria.map(([name,band])=><div className="lp-crit" key={name}>
            <span>{name}</span>
            <div className="bar-track"><div style={{width:(band/9*100)+'%'}}/></div>
            <b>{band.toFixed(1)}</b>
          </div>)}
          <div className="lp-mock-feedback">
            <p><b>Strength</b> A clear position, kept from the introduction to the conclusion.</p>
            <p><b>Next step</b> Support each main idea with a specific example or a result.</p>
          </div>
          <p className="lp-mock-note"><UserCheck size={15}/> Teacher confirms before it counts</p>
        </div>
      </section>

      <section id="feedback" className="lp-section">
        <div className="lp-section-head">
          <p className="eyebrow">WHAT YOUR STUDENTS GET</p>
          <h2>Feedback students can act on, not just a number</h2>
          <p className="lp-section-lead">Every assessment turns into written feedback you can check, edit and hand over. Nothing reaches a student until you have reviewed it.</p>
        </div>
        <div className="lp-parts">
          {feedbackParts.map(f=><div className="lp-part" key={f.title}><span className="icon-box"><f.icon size={20}/></span><div><h3>{f.title}</h3><p>{f.text}</p></div></div>)}
        </div>
        <div className="lp-deliverables">
          <figure className="lp-doc" aria-label="Sample printable practice report">
            <figcaption><Printer size={16}/> Practice report · print or save as PDF</figcaption>
            <div className="lp-paper">
              <small>BANDWISE · IELTS PRACTICE REPORT</small>
              <h3>Maria K. · Writing Task 2 · Cities and car ownership</h3>
              <p className="lp-paper-band">Practice estimate: <b>6.5 / 9</b></p>
              <p>A clear, relevant answer with a consistent position. Ideas need fuller development, and a few complex sentences lose control.</p>
              {reportCriteria.map(c=><div className="lp-paper-crit" key={c.name}>
                <h4>{c.name}: {c.band}</h4>
                <p>{c.evidence}</p>
                <p><b>Next step:</b> {c.next}</p>
              </div>)}
              <p className="lp-paper-more">+ Coherence and Cohesion, Grammatical Range and Accuracy, and your notes</p>
            </div>
          </figure>
          <figure className="lp-doc" aria-label="Sample emailed progress report">
            <figcaption><Mail size={16}/> Progress report · emailed from your address</figcaption>
            <div className="lp-paper lp-email">
              <p className="lp-email-meta"><b>Your IELTS progress report — Maria K.</b><br/>From: your own mailbox</p>
              <p className="lp-email-note">“Great progress this month, Maria. Let’s focus on developing your examples before the mock test.”</p>
              <h4>Overall band by practice test</h4>
              {progress.map(([test,band])=><div className="lp-crit" key={test}><span>{test}</span><div className="bar-track"><div style={{width:(Number(band)/9*100)+'%'}}/></div><b>{band}</b></div>)}
              <p className="lp-paper-more">+ latest band in each skill, progress in each skill over time, all against their target band</p>
            </div>
          </figure>
        </div>
      </section>

      <section id="features" className="lp-section">
        <div className="lp-section-head">
          <p className="eyebrow">WHAT’S INCLUDED</p>
          <h2>Everything you mark, in one workspace</h2>
        </div>
        <div className="lp-features">
          {features.map(f=><div className={'lp-feature panel '+f.tone} key={f.title}>
            <span className="icon-box"><f.icon size={21}/></span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>)}
        </div>
      </section>

      <section id="how" className="lp-section">
        <div className="lp-section-head">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>Three steps from submission to feedback</h2>
        </div>
        <ol className="lp-steps">
          <li><b>1</b><div><strong>Add your students</strong><p>Name, test type, target band and, if they have one, their university’s minimum.</p></div></li>
          <li><b>2</b><div><strong>Upload or record</strong><p>A photo or PDF of an essay, a speaking recording, or a Reading or Listening raw score.</p></div></li>
          <li><b>3</b><div><strong>Review and share</strong><p>Check the bands and feedback, edit anything you disagree with, add your own notes, then print the report or email the student their progress.</p></div></li>
        </ol>
      </section>

      <section className="lp-section lp-trust">
        <ShieldCheck size={28}/>
        <div>
          <h2>You stay the examiner</h2>
          <p>Estimates are a starting point, not a verdict. Bandwise flags what it cannot judge, shows the evidence for each criterion, and nothing reaches a report until you have reviewed it.</p>
        </div>
      </section>

      <section id="faq" className="lp-section">
        <div className="lp-section-head">
          <p className="eyebrow">QUESTIONS</p>
          <h2>Frequently asked</h2>
        </div>
        <div className="lp-faq">
          {faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>

      <section className="lp-cta">
        <h2>Bandwise is opening to a small group of teachers first.</h2>
        <p>Tell us a little about how you teach and we’ll get you set up.</p>
        <a className="primary" href={accessLink}>Request early access <ArrowRight size={17}/></a>
      </section>
    </main>

    <footer className="lp-footer">
      <p>© {new Date().getFullYear()} Bandwise · <a href={'mailto:'+CONTACT_EMAIL}>{CONTACT_EMAIL}</a></p>
      <p>IELTS is a registered trademark of the British Council, IDP IELTS and Cambridge University Press &amp; Assessment. Bandwise is an independent practice tool and is not affiliated with or endorsed by them. Estimates are not official IELTS scores.</p>
    </footer>
  </div>;
}
