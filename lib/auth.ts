import {env} from 'cloudflare:workers';
import {betterAuth} from 'better-auth';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import {emailOTP} from 'better-auth/plugins';
import {getDb} from '@/db';
import {authUser,authSession,authAccount,authVerification,authRateLimit} from '@/db/schema';
import {sendSystemEmail,signInCodeEmail} from './system-email';

// Bandwise's own sign-in: Continue with Google, or a 6-digit code sent by email. It is off until
// BETTER_AUTH_SECRET and BETTER_AUTH_URL are set (docs/SIGN_IN_SETUP.md); until then Cloudflare Access is the
// only way in. Routes live under /auth, outside the Access-protected /app and /api, so they work while Access
// is still in front of the studio.
export const AUTH_BASE_PATH='/auth';
export const authEnabled=()=>!!(env.BETTER_AUTH_SECRET&&env.BETTER_AUTH_URL&&env.DB);
export const googleEnabled=()=>!!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET);

function create(){
  return betterAuth({
    appName:'Bandwise',
    baseURL:env.BETTER_AUTH_URL,
    basePath:AUTH_BASE_PATH,
    secret:env.BETTER_AUTH_SECRET,
    trustedOrigins:[env.BETTER_AUTH_URL!],
    database:drizzleAdapter(getDb(),{provider:'sqlite',schema:{user:authUser,session:authSession,account:authAccount,verification:authVerification,rateLimit:authRateLimit}}),
    socialProviders:googleEnabled()?{google:{clientId:env.GOOGLE_CLIENT_ID!,clientSecret:env.GOOGLE_CLIENT_SECRET!,prompt:'select_account'}}:{},
    // Google and email codes both prove the address, so the same person can use either and stay one account.
    account:{accountLinking:{enabled:true,trustedProviders:['google','email-otp']}},
    session:{expiresIn:60*60*24*30,updateAge:60*60*24},
    // Stored in D1: Worker isolates are short-lived, so in-memory counters would barely limit anything.
    rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{
      // Per network address: a school's teachers often share one, so allow a few sign-ups at once.
      '/email-otp/send-verification-otp':{window:600,max:8},
      '/sign-in/email-otp':{window:600,max:10},
    }},
    advanced:{ipAddress:{ipAddressHeaders:['cf-connecting-ip']}},
    plugins:[emailOTP({
      otpLength:6,expiresIn:600,allowedAttempts:5,
      async sendVerificationOTP({email,otp,type}){if(type==='sign-in')await sendSystemEmail(signInCodeEmail(email,otp));},
    })],
  });
}
let instance:ReturnType<typeof create>|null=null;
export function auth(){
  if(!authEnabled())throw new Error('Sign-in is not set up yet.');
  return instance??=create();
}
