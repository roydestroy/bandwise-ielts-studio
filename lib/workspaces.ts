import {env} from 'cloudflare:workers';
import {database} from './storage';

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
  recorded.add(key);
}

export function isAdminEmail(email:string){
  return (env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(email.trim().toLowerCase());
}

export type WorkspaceRow={id:string;status:WorkspaceStatus;created_at:string;approved_at:string|null;email:string|null;name:string|null;students:number};
export async function listWorkspaces():Promise<WorkspaceRow[]>{
  const rows=await database().prepare(`SELECT w.id,w.status,w.created_at,w.approved_at,COALESCE(u.email,(SELECT a.email FROM access_identities a WHERE a.workspace_id = w.id ORDER BY a.last_seen DESC LIMIT 1)) AS email,u.name,(SELECT COUNT(*) FROM students s WHERE s.owner = w.id) AS students
    FROM workspaces w LEFT JOIN memberships m ON m.workspace_id = w.id LEFT JOIN auth_user u ON u.id = m.user_id
    ORDER BY CASE w.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, w.created_at DESC LIMIT 500`).all<WorkspaceRow>();
  return rows.results;
}
export async function setWorkspaceStatus(id:string,status:WorkspaceStatus){
  const out=await database().prepare('UPDATE workspaces SET status = ?, approved_at = CASE WHEN ? = \'active\' THEN COALESCE(approved_at,?) ELSE approved_at END WHERE id = ?').bind(status,status,now(),id).run();
  if(!out.meta.changes)throw new Error('Workspace not found.');
}
