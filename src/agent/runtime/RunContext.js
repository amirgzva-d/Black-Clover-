import crypto from 'node:crypto';

export class RunContext{
  constructor({text='',canonical='',normalized='',privateContext=false,profile='general',intent=null,routeNames=[],chatOptions={}}={}){
    this.id=crypto.randomUUID();this.original=String(text);this.canonical=String(canonical||text);this.normalized=String(normalized||canonical||text);
    this.private=Boolean(privateContext);this.profile=profile;this.intent=intent||{action:false,multiStep:false,modes:[]};
    this.routeNames=[...new Set(routeNames||[])];this.chatOptions={...chatOptions};this.trace=[];this.assistantMessage=null;this.startedAt=Date.now();
  }
  addTrace(entry){this.trace.push({...entry,at:new Date().toISOString()});return this.trace[this.trace.length-1];}
  get failures(){return this.trace.filter(x=>x.success===false);}
  get successes(){return this.trace.filter(x=>x.success!==false);}
  get fullyVerified(){return this.successes.length>0&&this.successes.every(x=>['hard','observed'].includes(x.verification?.level));}
  markPrivate(reason='tool-context'){this.private=true;this.privateReason=reason;if(this.assistantMessage)this.assistantMessage._private=true;}
}
