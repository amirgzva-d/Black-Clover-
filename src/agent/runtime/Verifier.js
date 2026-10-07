import { ToolVerifier } from '../tools/ToolVerifier.js';

export class Verifier {
  constructor({toolVerifier=new ToolVerifier()}={}) {
    this.toolVerifier=toolVerifier;
  }

  async tool(name,args,result) {
    return this.toolVerifier.verify({name,args,result});
  }

  run(context,{answer='',toolChecks=[]}={}) {
    if(context.mode==='chat')return {ok:Boolean(String(answer||'').trim()),verified:Boolean(String(answer||'').trim()),reason:'chat-response'};
    if(context.mode==='research')return {ok:Boolean(String(answer||'').trim()),verified:Boolean(String(answer||'').trim()),reason:'research-response'};
    const failed=toolChecks.filter(x=>!x?.ok);
    const verified=toolChecks.filter(x=>x?.verified);
    return {
      ok:failed.length===0&&toolChecks.length>0,
      verified:failed.length===0&&verified.length>0,
      reason:failed.length?failed.map(x=>x.reason).join(' | '):verified.length?'postconditions-verified':'no-verifiable-postcondition'
    };
  }
}
