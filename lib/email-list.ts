// A list of email addresses typed into a setting (ADMIN_EMAILS, PLATFORM_AI_TEST_USERS). People separate them with
// commas, semicolons, spaces or new lines, so accept all of those. Addresses compare case-insensitively.
export function emailList(value:string|undefined):string[]{
  return (value||'').split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);
}
export const inEmailList=(value:string|undefined,email:string)=>emailList(value).includes(email.trim().toLowerCase());
