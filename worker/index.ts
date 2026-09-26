import app from 'vinext/server/app-router-entry';
import {canonicalRedirect} from '../lib/canonical-host';
import {verifyTeacher} from '../lib/access';
import {recordAccessIdentity} from '../lib/workspaces';

// The Worker's entry: the vinext app, behind a redirect to the canonical address (lib/canonical-host.ts).
export default {
  async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext):Promise<Response>{
    const redirect=canonicalRedirect(new URL(request.url),request.method,env.CANONICAL_HOST);
    if(redirect){
      // A teacher still arriving through Cloudflare Access on the old address: remember which email owns their
      // workspace before sending them on, so their new sign-in finds their data (lib/workspaces.ts).
      const token=request.headers.get('cf-access-jwt-assertion');
      if(token&&env.ACCESS_TEAM_DOMAIN&&env.ACCESS_AUD){
        try{const t=await verifyTeacher(token,env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUD);await recordAccessIdentity(t.email,t.userId);}
        catch{/* not a valid Access sign-in: just redirect */}
      }
      return redirect;
    }
    return app.fetch(request,env,ctx);
  },
};
