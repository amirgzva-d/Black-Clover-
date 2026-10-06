import { toolMakesContextPrivate } from '../PrivacyClassifier.js';

const parseArgs=raw=>{if(typeof raw!=='string')return raw??{};try{return JSON.parse(raw||'{}');}catch{return {};}};
export const toolHistoryMessage=(name,out,callId,isPrivate=false)=>({role:'tool',content:JSON.stringify(out),tool_name:name,...(callId?{tool_call_id:callId}:{}),_private:isPrivate});

export class Executor{
  constructor({tools,runTool,permissions,verifier,recovery,skills,emit=()=>{},runStore=null}={}){
    this.tools=tools||{};this.runTool=runTool;this.permissions=permissions;this.verifier=verifier;this.recovery=recovery;this.skills=skills;this.emit=emit;this.runStore=runStore;
  }
  async execute(call,turn,{skipConfirmation=false}={}){
    const name=call?.function?.name||call?.name,args=parseArgs(call?.function?.arguments??call?.args??{}),callId=call?.id,tool=this.tools[name];
    if(!tool){
      const out={tool_name:name,success:false,error:'Unknown tool'},verification={ok:false,level:'hard',reason:'unknown-tool'};
      turn.addTrace({name,args,success:false,error:out.error,verification});
      return {out,verification,history:toolHistoryMessage(name,out,callId,turn.private)};
    }
    const privateTool=toolMakesContextPrivate(name);if(privateTool)turn.markPrivate(`tool:${name}`);
    const protectedMatch=await this.permissions?.protectedMatch?.(name,args);
    if(protectedMatch){
      const out={tool_name:name,success:false,blocked:true,error:`Protected by permanent user rule: ${protectedMatch.label}`},verification={ok:false,level:'hard',reason:'protected-resource'};
      turn.addTrace({name,args,success:false,error:out.error,verification});
      return {out,verification,history:toolHistoryMessage(name,out,callId,true)};
    }
    if(!skipConfirmation&&await this.permissions?.shouldConfirm?.(name,tool,args))return {needsConfirmation:true,name,args,callId,tool};
    this.emit({type:'tool',name,runId:turn.id});
    let out;try{await this.permissions?.assertAllowed?.(name,args);out=await this.runTool(name,args);}catch(e){out={tool_name:name,success:false,error:e.message};}
    const verification=await this.verifier.verify(name,args,out),success=out?.success!==false&&verification.ok!==false,recovery=this.recovery.advice(name,args,out,verification);
    const error=success?'':String(out?.error||out?.message||verification?.reason||'tool failed').slice(0,700);
    turn.addTrace({name,args,success,error,verification,message:out?.message||''});
    if(!success&&!turn.private){
      await this.skills?.queueImprovement?.(turn.original,{tool:name,error});
      this.emit({type:'learning',action:'gap-queued',title:turn.original,tool:name,error,runId:turn.id});
    }
    if(this.runStore)await this.runStore.event(turn.id,{kind:'tool',tool:name,success,verification:verification.level,error},{privateContext:turn.private});
    const payload=recovery?{...out,_verification:verification,_recovery:recovery}:{...out,_verification:verification};
    return {out:payload,verification,recovery,success,history:toolHistoryMessage(name,payload,callId,turn.private||privateTool)};
  }
}
