import type {Metadata} from 'next';
import LegalPage from '../legal-page';
import {OPERATOR,CONTACT_EMAIL} from '@/lib/legal';

export const metadata:Metadata={title:'Terms of Service | Bandwise',description:'The terms for using Bandwise.'};

export default function Terms(){
  return <LegalPage title="Terms of Service">
    <p>These terms apply to your use of Bandwise, an online workspace for IELTS teachers, operated by <b>{OPERATOR}</b> (“we”, “us”). By creating an account or using Bandwise, you agree to them.</p>

    <h2>1. The service</h2>
    <p>Bandwise helps teachers record students’ IELTS practice, get AI-assisted band estimates and written feedback, and share reports. <b>Estimates are practice estimates, not official IELTS scores</b>, and they can be wrong. You are responsible for reviewing every score and piece of feedback before you rely on it or share it.</p>
    <p>IELTS is a registered trademark of the British Council, IDP IELTS and Cambridge University Press &amp; Assessment. Bandwise is independent and is not affiliated with or endorsed by them.</p>

    <h2>2. Your account</h2>
    <p>Bandwise is for teachers and schools, not for students to use directly. New accounts may need our approval before they can be used. Keep your sign-in secure and tell us straight away if you think someone else has used your account. You are responsible for activity in your account.</p>

    <h2>3. Your content and your students’ data</h2>
    <p>You keep all rights to the content you add. You allow us to store and process it only as needed to provide Bandwise to you, including sending it to the AI provider you choose when you ask for an assessment.</p>
    <p>You confirm that you have the right to add your students’ information and work, including any consent needed from students or, for children, their parents or guardians. You must only upload material you have the right to use, and must not upload copyrighted test content (such as full Cambridge test papers or audio) unless you are allowed to. How we handle personal data is explained in our <a href="/privacy">Privacy Policy</a>.</p>

    <h2>4. AI providers and your own keys</h2>
    <p>If you connect your own AI provider key, that provider’s terms apply to your use of it, and the provider bills you directly for its charges. We are not responsible for third-party services, their availability or their charges.</p>

    <h2>5. Acceptable use</h2>
    <p>Don’t use Bandwise to break the law or others’ rights, to upload harmful code, to try to access other teachers’ data, to overload or probe the service, or to resell it without our agreement. We may suspend accounts that do.</p>

    <h2>6. Early access and pricing</h2>
    <p>Bandwise is in early access. Features may change, and there may be interruptions. There is currently no charge from us. If we introduce paid plans, we will tell you in advance, and you won’t be charged unless you choose a paid plan.</p>

    <h2>7. Availability and liability</h2>
    <p>We work to keep Bandwise available and your data safe, but we provide it “as is”, without guarantees that it will be uninterrupted or error-free. Keep your own copies of anything important. To the extent the law allows, we are not liable for indirect or consequential losses, or for decisions made on the basis of practice estimates. Nothing in these terms limits liability that cannot be limited by law, or your rights as a consumer.</p>

    <h2>8. Ending your use</h2>
    <p>You can stop using Bandwise at any time and ask us to delete your account at <a href={'mailto:'+CONTACT_EMAIL}>{CONTACT_EMAIL}</a>. We may suspend or close accounts that break these terms. Where we can, we will warn you first and give you time to export your data.</p>

    <h2>9. Changes and law</h2>
    <p>We may update these terms. For significant changes, we will tell signed-up teachers by email before they take effect. These terms are governed by the laws of Greece, without affecting any mandatory consumer protections of the country where you live.</p>
  </LegalPage>;
}
