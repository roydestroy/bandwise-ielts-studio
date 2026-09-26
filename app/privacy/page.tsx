import type {Metadata} from 'next';
import Link from 'next/link';
import LegalPage from '../legal-page';
import {OPERATOR,CONTACT_EMAIL} from '@/lib/legal';

export const metadata:Metadata={title:'Privacy Policy | Bandwise',description:'How Bandwise collects, uses and protects teachers’ and students’ data.'};

// Keep this in step with what the code does: data stored (db/schema.ts), where it goes (lib/assessment-ai.ts,
// lib/system-email.ts, lib/email-store.ts) and who processes it (docs/INFRASTRUCTURE.md).
export default function Privacy(){
  return <LegalPage title="Privacy Policy">
    <p>Bandwise is an online workspace that helps IELTS teachers assess their students’ practice work. This policy explains what personal data Bandwise handles, why, and the choices you have.</p>

    <h2>1. Who is responsible</h2>
    <p>Bandwise is operated by <b>{OPERATOR}</b> (“we”, “us”). Contact: <a href={'mailto:'+CONTACT_EMAIL}>{CONTACT_EMAIL}</a>.</p>
    <p>We are the <b>controller</b> of teachers’ account data. For information about students that teachers add to Bandwise, the <b>teacher (or their school) is the controller</b> and we act as their <b>processor</b>: we handle it only to provide the service to that teacher and on their instructions.</p>

    <h2>2. What we collect</h2>
    <ul>
      <li><b>Account data:</b> your email address and, if you sign in with Google, your name and profile picture from your Google account.</li>
      <li><b>Sign-in and security data:</b> session records, one-time sign-in codes (kept for 10 minutes), and the IP address and browser type of each session, used to keep accounts secure and to limit abuse.</li>
      <li><b>Content you add:</b> students’ names, email addresses, target bands and test types; essays, photos, PDFs and speaking recordings; transcripts, scores, feedback and your notes.</li>
      <li><b>Settings:</b> AI provider keys and email (SMTP) passwords you choose to save, which we encrypt before storing; your report branding, including any logo you upload.</li>
      <li><b>Usage records:</b> for each AI request, the provider, model, number of tokens used and an estimated cost.</li>
    </ul>

    <h2>3. Information from Google</h2>
    <p>If you choose “Continue with Google”, we ask Google only for your basic profile: your <b>name, email address and profile picture</b> (the <code>openid</code>, <code>email</code> and <code>profile</code> scopes). We use it solely to create your Bandwise account, sign you in and show your name in the app. We do not request access to your Gmail, Google Drive, contacts or any other Google data.</p>
    <p>We do not sell Google user data, use it for advertising, or transfer it to others except as needed to run Bandwise (see section 5), for security, or where the law requires. Bandwise’s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. We do not use Google user data to train AI models.</p>

    <h2>4. How we use data</h2>
    <ul>
      <li>To provide Bandwise: store your workspace, run the assessments you ask for, produce reports and send them when you choose.</li>
      <li>To run your account: sign-in codes, approval of new accounts, and messages about your account.</li>
      <li>To keep the service secure and working, and to understand costs so we can price it fairly.</li>
    </ul>
    <p>Our legal bases are performing our contract with you, our legitimate interest in running a secure and reliable service, and complying with legal obligations. We do not sell personal data, do not show advertising, and do not use your content to train AI models.</p>

    <h2>5. Who else handles data</h2>
    <ul>
      <li><b>Cloudflare</b> hosts Bandwise and stores its database and files, and delivers Bandwise’s own emails (sign-in codes, account approval).</li>
      <li><b>Google</b> provides “Continue with Google” sign-in.</li>
      <li><b>The AI provider you choose</b> (OpenAI, Google Gemini, Anthropic Claude or Alibaba Qwen) receives the student work, prompt and rubric needed for a transcription or assessment, <b>only when you request one</b>. With your own API key, that provider processes it under your agreement with them. With the built-in “Bandwise AI” option, it is processed by Google Gemini under our account. While that option is in test mode it may run on Google’s free tier, where Google can use submitted content to improve its products, so it is limited to named testers using sample work.</li>
      <li><b>Your own email provider</b> sends the progress reports you email to students, through the mailbox you connect.</li>
    </ul>
    <p>Some of these providers may process data outside the European Economic Area. Where they do, they rely on safeguards recognised under EU law, such as the European Commission’s Standard Contractual Clauses.</p>

    <h2>6. Where data is stored and how long we keep it</h2>
    <p>Bandwise’s database and files are stored with Cloudflare, currently in Eastern Europe. We keep account data while your account exists. Your content stays until you delete it or ask us to delete your account. Sign-in sessions expire after 30 days of inactivity, and sign-in codes after 10 minutes. After you ask us to close your account, we delete its data within 30 days, except where the law requires us to keep something.</p>

    <h2>7. Students and children</h2>
    <p>Bandwise is for teachers, not for students to use directly. Teachers are responsible for having a lawful basis to add their students’ information and work, including consent from a parent or guardian where a student is a child and the law requires it. Teachers should add only what they need, and can edit or delete a student’s information at any time.</p>

    <h2>8. Security</h2>
    <p>All traffic is encrypted in transit. Saved AI keys and email passwords are encrypted at rest. Each teacher’s workspace is separate, and uploaded files are only served to their signed-in owner. The exceptions are report logos, which are publicly readable so that emailed reports can show them. No system is perfectly secure, but we work to protect your data and will tell you about any breach that affects you as the law requires.</p>

    <h2>9. Cookies</h2>
    <p>We use only the cookies needed to keep you signed in. We do not use advertising or cross-site tracking cookies.</p>

    <h2>10. Your rights</h2>
    <p>You can ask to access, correct, export or delete your personal data, to restrict or object to how we use it, and to withdraw any consent. Email <a href={'mailto:'+CONTACT_EMAIL}>{CONTACT_EMAIL}</a>. Students whose information a teacher added should contact that teacher first; we will help the teacher respond. You can also complain to your data protection authority. In Greece, that is the Hellenic Data Protection Authority (<a href="https://www.dpa.gr" target="_blank" rel="noreferrer">dpa.gr</a>).</p>

    <h2>11. Changes</h2>
    <p>If we change this policy, we will update the date above and, for significant changes, tell signed-up teachers by email before they take effect.</p>

    <p>See also our <Link href="/terms">Terms of Service</Link>.</p>
  </LegalPage>;
}
