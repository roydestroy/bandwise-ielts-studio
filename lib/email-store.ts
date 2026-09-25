import {env} from 'cloudflare:workers';
import {WorkerMailer} from 'worker-mailer';
import {database} from './storage';
import {sealKey,unsealKey} from './provider-crypto';
import {mailConfigSchema,implicitTls,type MailConfig,type MailState} from './email-settings';

type Row={config:string;encrypted_password:string;tested_at:string|null};
const context=(owner:string)=>owner+':smtp';

export async function mailState(owner:string):Promise<MailState>{
  const row=await database().prepare('SELECT config,encrypted_password,tested_at FROM email_settings WHERE owner = ?').bind(owner).first<Row>();
  return {config:row?mailConfigSchema.parse(JSON.parse(row.config)):null,testedAt:row?.tested_at||null,vaultReady:!!env.PROVIDER_ENCRYPTION_KEY};
}

// Keeps the saved password when none is entered, so teachers can edit other fields without retyping it.
export async function saveMail(owner:string,config:MailConfig,password?:string){
  if(!env.PROVIDER_ENCRYPTION_KEY)throw new Error('Secure key storage is temporarily unavailable.');
  const secret=password||(await credentials(owner).catch(()=>null))?.password;
  if(!secret)throw new Error('Enter the mailbox password or app password.');
  const sealed=await sealKey(env.PROVIDER_ENCRYPTION_KEY,secret,context(owner));
  await database().prepare('INSERT INTO email_settings (owner,config,encrypted_password,tested_at) VALUES (?,?,?,NULL) ON CONFLICT(owner) DO UPDATE SET config=excluded.config,encrypted_password=excluded.encrypted_password,tested_at=NULL').bind(owner,JSON.stringify(config),sealed).run();
}

export async function removeMail(owner:string){await database().prepare('DELETE FROM email_settings WHERE owner = ?').bind(owner).run();}
export async function markTested(owner:string){await database().prepare('UPDATE email_settings SET tested_at = ? WHERE owner = ?').bind(new Date().toISOString(),owner).run();}

async function credentials(owner:string){
  const row=await database().prepare('SELECT config,encrypted_password FROM email_settings WHERE owner = ?').bind(owner).first<Row>();
  if(!row)throw new Error('Connect your mailbox in Email reports first.');
  if(!env.PROVIDER_ENCRYPTION_KEY)throw new Error('Secure key storage is temporarily unavailable.');
  const password=await unsealKey(env.PROVIDER_ENCRYPTION_KEY,row.encrypted_password,context(owner)).catch(()=>{throw new Error('The saved mailbox password is unreadable. Enter it again.')});
  return {config:mailConfigSchema.parse(JSON.parse(row.config)),password};
}

// SMTP servers answer with terse codes; translate the common failures into something a teacher can act on.
function explain(e:unknown){
  const m=e instanceof Error?e.message:String(e);
  if(/auth|535|534|credential|password/i.test(m))return 'The mail server rejected the username or password. Many providers need an app password instead of your normal one.';
  if(/timeout|timed out/i.test(m))return 'The mail server did not respond. Check the server name and port.';
  if(/connect|socket|refused|dns|lookup/i.test(m))return 'Could not reach the mail server. Check the server name and port.';
  if(/550|553|554|sender|from/i.test(m))return 'The mail server refused the message. The sender address may need to match your mailbox. ('+m.slice(0,160)+')';
  return 'Sending failed: '+m.slice(0,200);
}

export async function sendMail(owner:string,message:{to:{name?:string;email:string};subject:string;html:string;text:string}){
  const {config,password}=await credentials(owner);
  try{
    await WorkerMailer.send(
      {host:config.host,port:config.port,secure:implicitTls(config.port),startTls:!implicitTls(config.port),credentials:{username:config.username,password},authType:['plain','login'],socketTimeoutMs:15000,responseTimeoutMs:15000},
      {from:{name:config.fromName||undefined,email:config.fromEmail},to:message.to,reply:config.fromEmail,subject:message.subject,html:message.html,text:message.text},
    );
  }catch(e){throw new Error(explain(e));}
  return config;
}
