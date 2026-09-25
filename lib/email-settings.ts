import {z} from 'zod';

// Outgoing mail goes through the teacher's own mailbox over SMTP (the sending side of an IMAP account).
// Cloudflare Workers cannot open port 25, so only the submission ports are offered.
export const mailPorts=[465,587,2525] as const;
export const mailConfigSchema=z.object({
  host:z.string().trim().toLowerCase().min(3).max(253).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/,'Enter the SMTP server name, such as smtp.gmail.com.'),
  port:z.number().int().refine(p=>(mailPorts as readonly number[]).includes(p),'Use port 465, 587 or 2525. Cloudflare blocks port 25.'),
  username:z.string().trim().min(1,'Enter the mailbox username.').max(254),
  fromEmail:z.string().trim().toLowerCase().email('Enter a valid sender address.').max(254),
  fromName:z.string().trim().max(100),
});
export type MailConfig=z.infer<typeof mailConfigSchema>;
export type MailState={config:MailConfig|null;testedAt:string|null;vaultReady:boolean};
// Port 465 is TLS from the first byte; 587 and 2525 upgrade with STARTTLS.
export const implicitTls=(port:number)=>port===465;
export const mailPresets=[
  {id:'gmail',name:'Gmail / Google Workspace',host:'smtp.gmail.com',port:465,hint:'Turn on 2-Step Verification, then create an app password at myaccount.google.com/apppasswords. Your normal password will not work.'},
  {id:'outlook',name:'Outlook / Microsoft 365',host:'smtp.office365.com',port:587,hint:'Your Microsoft 365 admin may need to enable “Authenticated SMTP” for this mailbox. Accounts that require modern sign-in only may be rejected.'},
  {id:'icloud',name:'iCloud Mail',host:'smtp.mail.me.com',port:587,hint:'Create an app-specific password at account.apple.com. Use your full iCloud address as the username.'},
  {id:'yahoo',name:'Yahoo Mail',host:'smtp.mail.yahoo.com',port:465,hint:'Generate an app password in Yahoo account security settings.'},
  {id:'zoho',name:'Zoho Mail',host:'smtp.zoho.com',port:465,hint:'Use an app-specific password if two-factor authentication is on.'},
  {id:'custom',name:'Other provider',host:'',port:587,hint:'Use the SMTP (outgoing) server shown in your provider’s IMAP/SMTP settings.'},
] as const;
export const studentEmailSchema=z.string().trim().toLowerCase().email('Enter a valid student email address.').max(254).nullable();
