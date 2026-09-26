import {env} from 'cloudflare:workers';

// Emails Bandwise itself sends (sign-in codes, account approval) through Cloudflare Email Service. Teacher-to-
// student reports go through the teacher's own mailbox instead (lib/email-store.ts).
export type SystemEmail={to:string;subject:string;html:string;text:string};

export const systemEmailReady=()=>!!(env.EMAIL&&env.EMAIL_FROM);

export async function sendSystemEmail(m:SystemEmail){
  if(env.EMAIL&&env.EMAIL_FROM){
    try{await env.EMAIL.send({to:m.to,from:{email:env.EMAIL_FROM,name:'Bandwise'},subject:m.subject,html:m.html,text:m.text});}
    catch(e){
      console.error('System email failed',(e as {code?:string}).code||(e instanceof Error?e.message:'Unknown error'));
      throw new Error('We couldn’t send the email just now. Please try again, or continue with Google.');
    }
    return;
  }
  // Local development has no email binding: print the message instead. Vite replaces DEV with false in
  // production builds, so this branch never ships.
  if(import.meta.env.DEV){console.log('[dev email] to '+m.to+' — '+m.subject+'\n'+m.text);return;}
  throw new Error('Email sign-in isn’t available yet. Please continue with Google.');
}

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const frame=(body:string)=>`<!doctype html><html><body style="margin:0;padding:24px 12px;background:#eef3f1;font-family:Arial,Helvetica,sans-serif;color:#1d2b25"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px"><tr><td style="padding:28px">`+
  `<div style="font-size:20px;font-weight:bold;color:#183c32;letter-spacing:-.5px;margin-bottom:18px">bandwise<span style="color:#629e55">.</span></div>${body}</td></tr></table></td></tr></table></body></html>`;

export function signInCodeEmail(to:string,code:string):SystemEmail{
  return {to,subject:'Your Bandwise sign-in code: '+code,
    text:`Your Bandwise sign-in code is ${code}\n\nIt expires in 10 minutes. If you didn't try to sign in, you can ignore this email.`,
    html:frame(`<p style="margin:0 0 14px;font-size:15px">Your sign-in code:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#145e50;margin:0 0 18px">${esc(code)}</div><p style="margin:0;font-size:13px;color:#6b7a73">It expires in 10 minutes. If you didn’t try to sign in, you can ignore this email.</p>`)};
}
export function approvedEmail(to:string,url:string):SystemEmail{
  return {to,subject:'Your Bandwise account is ready',
    text:`Your Bandwise account has been approved. Sign in at ${url}`,
    html:frame(`<p style="margin:0 0 14px;font-size:15px">Your Bandwise account has been approved. You can start adding students and assessing their work.</p><p style="margin:0"><a href="${esc(url)}" style="display:inline-block;background:#145e50;color:#fff;text-decoration:none;padding:11px 18px;border-radius:7px;font-weight:bold;font-size:14px">Open Bandwise</a></p>`)};
}
export function newSignUpEmail(to:string,who:{email:string;name?:string|null},adminUrl:string):SystemEmail{
  const label=who.name?who.name+' ('+who.email+')':who.email;
  return {to,subject:'New Bandwise sign-up: '+who.email,
    text:`${label} has signed up and is waiting for approval.\n\nApprove or pause accounts at ${adminUrl}`,
    html:frame(`<p style="margin:0 0 14px;font-size:15px"><b>${esc(label)}</b> has signed up and is waiting for your approval.</p><p style="margin:0"><a href="${esc(adminUrl)}" style="display:inline-block;background:#145e50;color:#fff;text-decoration:none;padding:11px 18px;border-radius:7px;font-weight:bold;font-size:14px">Open the admin panel</a></p>`)};
}
