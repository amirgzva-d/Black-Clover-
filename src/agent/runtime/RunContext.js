import crypto from 'node:crypto';

export class RunContext {
  constructor({goal='',input='',mode='chat',profile='chat',privateContext=false,allowOnline=true,options={},history=[]}={}) {
    this.id=crypto.randomUUID();
    this.goal=String(goal||input||'').trim();
    this.input=String(input||goal||'').trim();
    this.mode=mode;
    this.profile=profile;
    this.privateContext=Boolean(privateContext);
    this.allowOnline=Boolean(allowOnline);
    this.options={...options};
    this.history=Array.isArray(history)?history:[];
    this.plan=null;
    this.route=null;
    this.trace=[];
    this.errors=[];
    this.startedAt=Date.now();
    this.finishedAt=null;
    this.status='running';
  }

  event(type,data={}) {
    const item={type,at:Date.now(),...data};
    this.trace.push(item);
    return item;
  }

  fail(error,meta={}) {
    const item={message:String(error?.message||error||'Unknown error'),at:Date.now(),...meta};
    this.errors.push(item);
    this.event('error',item);
    return item;
  }

  finish(status='done') {
    this.status=status;
    this.finishedAt=Date.now();
    return this;
  }

  snapshot() {
    return {
      id:this.id,
      goal:this.privateContext?'[private]':this.goal,
      mode:this.mode,
      profile:this.profile,
      privateContext:this.privateContext,
      allowOnline:this.allowOnline,
      plan:this.plan,
      route:this.route,
      trace:this.trace,
      errors:this.errors,
      status:this.status,
      durationMs:(this.finishedAt||Date.now())-this.startedAt
    };
  }
}
