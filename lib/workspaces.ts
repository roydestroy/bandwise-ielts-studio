import {env} from 'cloudflare:workers';
import {database} from './storage';
import {inEmailList} from './email-list';

// A workspace owns a teacher's students, assessments and settings: its ID is the `owner` on every row.
export type WorkspaceStatus='pending'|'active'|'suspended';
export type Workspace={id:string;status:WorkspaceStatus};
const now=()=>new Date().toISOString();

// The workspace of a signed-in user, created on first sign-in. A verified email that signed in through
// Cloudflare Access before is linked to that existing, already-approved workspace; anyone else starts a new
// workspace that waits for an admin's approval (admins' own included, unless their email is in ADMIN_EMAILS).
export async function workspaceForUser(user:{id:string;email:string;emailVerified:boolean}):Promise<Workspace>{
  const db=database();
  const find=()=>db.prepare('SELECT w.id,w.status FROM memberships m JOIN workspaces w ON w.id = m.workspace_id WHERE m.user_id = ?').bind(user.id).first<Workspace>();
  const existing=await find();
  // An address added to ADMIN_EMAILS after it signed up would otherwise wait for an approval nobody can give.
  if(existing?.status==='pending'&&user.emailVerified&&isAdminEmail(user.email)){await setWorkspaceStatus(existing.id,'active');return {...existing,status:'active'};}
  if(existing)return existing;
  const legacy=user.emailVerified?await db.prepare('SELECT workspace_id FROM access_identities WHERE email = ?').bind(user.email.toLowerCase()).first<{workspace_id:string}>():null;
  const id=legacy?.workspace_id??crypto.randomUUID();const at=now();
  // Admins approve everyone else, so a verified admin email is approved from the start.
  const approved=!!legacy||(user.emailVerified&&isAdminEmail(user.email));
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO workspaces (id,status,created_at,approved_at) VALUES (?,?,?,?)').bind(id,approved?'active':'pending',at,approved?at:null),
    // Unique per user: two first requests at once both land on whichever membership was written first.
    db.prepare('INSERT OR IGNORE INTO memberships (user_id,workspace_id,role,created_at) VALUES (?,?,?,?)').bind(user.id,id,'owner',at),
  ]);
  return (await find())!;
}

// Remember which email reached which workspace through Cloudflare Access, so the move to Bandwise's own sign-in
// keeps everyone's data. Written once per email per isolate, not on every request.
const recorded=new Set<string>();
export async function recordAccessIdentity(email:string,workspaceId:string){
  const key=email.toLowerCase()+' '+workspaceId;
  if(recorded.has(key))return;
  const db=database();const at=now();
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO workspaces (id,status,created_at,approved_at) VALUES (?,?,?,?)').bind(workspaceId,'active',at,at),
    db.prepare('INSERT INTO access_identities (email,workspace_id,last_seen) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET workspace_id=excluded.workspace_id,last_seen=excluded.last_seen').bind(email.toLowerCase(),workspaceId,at),
  ]);
  await relinkEmptyAccount(email,workspaceId);
  recorded.add(key);
}

// Someone who signed in with Google or a code before their email was linked got a new, empty workspace. Once
// Access proves the same email owns an existing workspace, move their account there, as long as the new one
// holds no students or assessments, and drop the empty workspace.
async function relinkEmptyAccount(email:string,workspaceId:string){
  const db=database();
  const m=await db.prepare('SELECT m.user_id,m.workspace_id FROM auth_user u JOIN memberships m ON m.user_id = u.id WHERE lower(u.email) = ? AND u.email_verified = 1').bind(email.toLowerCase()).first<{user_id:string;workspace_id:string}>();
  if(!m||m.workspace_id===workspaceId)return;
  const used=await db.prepare('SELECT (SELECT COUNT(*) FROM students WHERE owner = ?) + (SELECT COUNT(*) FROM assessments WHERE owner = ?) AS n').bind(m.workspace_id,m.workspace_id).first<{n:number}>();
  if(used?.n)return;
  await db.batch([
    db.prepare('UPDATE memberships SET workspace_id = ? WHERE user_id = ? AND workspace_id = ?').bind(workspaceId,m.user_id,m.workspace_id),
    db.prepare('DELETE FROM workspaces WHERE id = ? AND NOT EXISTS (SELECT 1 FROM memberships WHERE workspace_id = ?)').bind(m.workspace_id,m.workspace_id),
  ]);
}

export function isAdminEmail(email:string){
  return inEmailList(env.ADMIN_EMAILS,email);
}

export type WorkspaceRow={id:string;status:WorkspaceStatus;created_at:string;approved_at:string|null;email:string|null;name:string|null;students:number;ai_credit_limit:number|null};
export async function listWorkspaces():Promise<WorkspaceRow[]>{
  const rows=await database().prepare(`SELECT w.id,w.status,w.created_at,w.approved_at,w.ai_credit_limit,COALESCE(u.email,(SELECT a.email FROM access_identities a WHERE a.workspace_id = w.id ORDER BY a.last_seen DESC LIMIT 1)) AS email,u.name,(SELECT COUNT(*) FROM students s WHERE s.owner = w.id) AS students
    FROM workspaces w LEFT JOIN memberships m ON m.workspace_id = w.id LEFT JOIN auth_user u ON u.id = m.user_id
    ORDER BY CASE w.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, w.created_at DESC LIMIT 500`).all<WorkspaceRow>();
  return rows.results;
}
export async function setWorkspaceStatus(id:string,status:WorkspaceStatus){
  const out=await database().prepare('UPDATE workspaces SET status = ?, approved_at = CASE WHEN ? = \'active\' THEN COALESCE(approved_at,?) ELSE approved_at END WHERE id = ?').bind(status,status,now(),id).run();
  if(!out.meta.changes)throw new Error('Workspace not found.');
}
