import {sqliteTable,text,real,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const students=sqliteTable('students',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),target:real('target').notNull(),minBand:real('min_band'),email:text('email'),track:text('track').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_students_owner').on(t.owner)]);
export const assessments=sqliteTable('assessments',{id:text('id').primaryKey(),owner:text('owner').notNull(),studentId:text('student_id').notNull().references(()=>students.id),data:text('data').notNull(),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull()},t=>[index('idx_assessments_owner_student').on(t.owner,t.studentId)]);
export const aiConnections=sqliteTable('ai_connections',{owner:text('owner').notNull(),provider:text('provider').notNull(),config:text('config').notNull(),encryptedKey:text('encrypted_key').notNull(),testedAt:text('tested_at')},t=>[uniqueIndex('idx_ai_connections_owner_provider').on(t.owner,t.provider)]);
export const aiPreferences=sqliteTable('ai_preferences',{owner:text('owner').primaryKey(),writing:text('writing').notNull(),speaking:text('speaking').notNull()});
export const emailSettings=sqliteTable('email_settings',{owner:text('owner').primaryKey(),config:text('config').notNull(),encryptedPassword:text('encrypted_password').notNull(),testedAt:text('tested_at')});
// One row per AI provider call, for cost tracking. The assessment and task are kept even after the
// assessment is deleted, so past costs stay countable.
export const usageEvents=sqliteTable('usage_events',{id:text('id').primaryKey(),owner:text('owner').notNull(),assessmentId:text('assessment_id'),task:text('task'),action:text('action').notNull(),kind:text('kind').notNull(),provider:text('provider').notNull(),model:text('model').notNull(),inputTokens:integer('input_tokens').notNull(),audioTokens:integer('audio_tokens').notNull(),outputTokens:integer('output_tokens').notNull(),costUsd:real('cost_usd'),ok:integer('ok').notNull(),platform:integer('platform').notNull().default(0),createdAt:text('created_at').notNull()},t=>[index('idx_usage_events_owner_created').on(t.owner,t.createdAt)]);
// A teacher's branding for student reports (lib/branding.ts). The logo lives in R2 under branding/<logo_id>.
export const branding=sqliteTable('branding',{owner:text('owner').primaryKey(),name:text('name').notNull(),color:text('color').notNull(),contact:text('contact').notNull(),logoId:text('logo_id'),updatedAt:text('updated_at').notNull()});

// Sign-in (Better Auth, lib/auth.ts). The adapter reads these by their property names; the columns are ours.
const at=(name:string)=>integer(name,{mode:'timestamp_ms'});
export const authUser=sqliteTable('auth_user',{id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull().unique(),emailVerified:integer('email_verified',{mode:'boolean'}).notNull().default(false),image:text('image'),createdAt:at('created_at').notNull(),updatedAt:at('updated_at').notNull()});
export const authSession=sqliteTable('auth_session',{id:text('id').primaryKey(),expiresAt:at('expires_at').notNull(),token:text('token').notNull().unique(),createdAt:at('created_at').notNull(),updatedAt:at('updated_at').notNull(),ipAddress:text('ip_address'),userAgent:text('user_agent'),userId:text('user_id').notNull().references(()=>authUser.id,{onDelete:'cascade'})},t=>[index('idx_auth_session_user').on(t.userId)]);
export const authAccount=sqliteTable('auth_account',{id:text('id').primaryKey(),accountId:text('account_id').notNull(),providerId:text('provider_id').notNull(),userId:text('user_id').notNull().references(()=>authUser.id,{onDelete:'cascade'}),accessToken:text('access_token'),refreshToken:text('refresh_token'),idToken:text('id_token'),accessTokenExpiresAt:at('access_token_expires_at'),refreshTokenExpiresAt:at('refresh_token_expires_at'),scope:text('scope'),password:text('password'),createdAt:at('created_at').notNull(),updatedAt:at('updated_at').notNull()},t=>[index('idx_auth_account_user').on(t.userId)]);
export const authVerification=sqliteTable('auth_verification',{id:text('id').primaryKey(),identifier:text('identifier').notNull(),value:text('value').notNull(),expiresAt:at('expires_at').notNull(),createdAt:at('created_at').notNull(),updatedAt:at('updated_at').notNull()},t=>[index('idx_auth_verification_identifier').on(t.identifier)]);
export const authRateLimit=sqliteTable('auth_rate_limit',{id:text('id').primaryKey(),key:text('key').notNull().unique(),count:integer('count').notNull(),lastRequest:integer('last_request').notNull()});

// A workspace owns students and assessments: its id is the `owner` value on every row. Teachers who used
// Cloudflare Access keep their Access user ID as their workspace ID, so no data moves. `status` gates the
// studio: new sign-ups wait as 'pending' until an admin approves them. `aiCreditLimit` overrides the monthly
// Bandwise AI allowance (PLATFORM_MONTHLY_CREDITS) for one workspace; null means the default.
export const workspaces=sqliteTable('workspaces',{id:text('id').primaryKey(),status:text('status').notNull(),createdAt:text('created_at').notNull(),approvedAt:text('approved_at'),aiCreditLimit:integer('ai_credit_limit')});
export const memberships=sqliteTable('memberships',{userId:text('user_id').notNull().references(()=>authUser.id,{onDelete:'cascade'}),workspaceId:text('workspace_id').notNull().references(()=>workspaces.id),role:text('role').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('idx_memberships_user').on(t.userId),index('idx_memberships_workspace').on(t.workspaceId)]);
// Which email signed in through Cloudflare Access as which workspace, recorded on every Access request, so the
// same person signing in with Google or an email code is linked to their existing data.
export const accessIdentities=sqliteTable('access_identities',{email:text('email').primaryKey(),workspaceId:text('workspace_id').notNull(),lastSeen:text('last_seen').notNull()});

// Answers to the pilot survey: one row per workspace, updated when the teacher answers again. Prices are
// euros a month, from the four Van Westendorp questions.
export const pilotFeedback=sqliteTable('pilot_feedback',{owner:text('owner').primaryKey(),email:text('email').notNull(),tooCheap:real('too_cheap'),bargain:real('bargain'),expensive:real('expensive'),tooExpensive:real('too_expensive'),hoursSaved:real('hours_saved'),comments:text('comments').notNull(),updatedAt:text('updated_at').notNull()});
