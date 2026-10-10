import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const clean=(v,max=12000)=>String(v??'').trim().slice(0,max);

export class ReminderStore{
  constructor({directory=defaultDir()}={}){
    this.file=path.join(directory,'reminders.json');
    this.directory=directory;
    this.items=[];
    this.loaded=false;
    this.actionExecutor=null;
    this.executing=new Set();
    this.actionRuns=new Set();
    this.saveChain=Promise.resolve();
  }
  setActionExecutor(fn){this.actionExecutor=typeof fn==='function'?fn:null;}
  normalize(input={}){
    const kind=input.kind==='action'||input.kind==='execute'?'action':'reminder';
    const message=clean(input.message||input.label||input.instruction,2000);
    const instruction=clean(input.instruction||input.message,12000);
    const due=new Date(input.dueAt||input.nextRunAt||Date.now());
    const intervalMinutes=Math.max(0,Number(input.intervalMinutes)||0);
    const allowedRecurrence=new Set(['once','interval','daily','weekly','monthly']);
    const recurrenceType=String(input.recurrence?.type||'');
    const recurrence=allowedRecurrence.has(recurrenceType)
      ?structuredClone(input.recurrence)
      :(intervalMinutes?{type:'interval',minutes:intervalMinutes}:{type:'once'});
    if(recurrence.type==='monthly'&&!Number.isInteger(Number(recurrence.dayOfMonth)))recurrence.dayOfMonth=due.getDate();
    const operation=kind==='action'
      ?structuredClone(input.operation&&typeof input.operation==='object'?input.operation:{type:'chat_draft',target:instruction})
      :null;
    return {
      kind,
      title:clean(input.title||input.label||message,180),
      label:clean(input.label||input.title||message,180),
      message,
      instruction,
      dueAt:Number.isNaN(due.getTime())?new Date().toISOString():due.toISOString(),
      nextRunAt:Number.isNaN(due.getTime())?new Date().toISOString():due.toISOString(),
      intervalMinutes,
      operation,
      notifyChat:Boolean(input.notifyChat),
      trigger:input.trigger&&typeof input.trigger==='object'?structuredClone(input.trigger):{type:'time'},
      recurrence,
      conditions:Array.isArray(input.conditions)?structuredClone(input.conditions):[],
      missedRunPolicy:clean(input.missedRunPolicy||'grace_or_ask',40),
      retryPolicy:input.retryPolicy&&typeof input.retryPolicy==='object'?structuredClone(input.retryPolicy):{maxAttempts:kind==='action'?2:0,backoff:'bounded'},
      enabled:input.enabled!==false,
      paused:Boolean(input.paused),
      riskLevel:clean(input.riskLevel||'auto',30),
      permissionRef:input.permissionRef||null,
      idempotencyKey:clean(input.idempotencyKey||'',160),
      lastRunAt:input.lastRunAt||null,
      lastResult:input.lastResult||null,
      runCount:Math.max(0,Number(input.runCount)||0),
      createdAt:input.createdAt||new Date().toISOString(),
      updatedAt:input.updatedAt||new Date().toISOString()
    };
  }
  async load(){
    if(this.loaded)return this.items;
    this.loaded=true;
    try{
      const j=JSON.parse(await fs.readFile(this.file,'utf8'));
      this.items=Array.isArray(j?.items)?j.items.map(x=>({id:String(x.id||crypto.randomUUID()),...this.normalize(x)})):[];
    }catch(e){if(e.code!=='ENOENT')console.warn('Reminder load failed',e.message);}
    return this.items;
  }
  save(){
    const snapshot=JSON.stringify({version:3,items:this.items,updatedAt:new Date().toISOString()},null,2);
    const pending=this.saveChain.catch(()=>{}).then(async()=>{
      await fs.mkdir(this.directory,{recursive:true});
      const tmp=this.file+'.tmp';
      await fs.writeFile(tmp,snapshot,'utf8');
      await fs.rename(tmp,this.file);
    });
    this.saveChain=pending;
    return pending;
  }
  async whenIdle(){while(this.actionRuns.size)await Promise.allSettled([...this.actionRuns]);await this.saveChain;}
  async create({message,dueAt,intervalMinutes=0,...rest}={}){
    await this.load();
    const when=new Date(dueAt);
    if(!clean(message,2000)||Number.isNaN(when.getTime()))throw new Error('Valid message and dueAt are required');
    const item={id:crypto.randomUUID(),...this.normalize({...rest,kind:'reminder',message,dueAt:when.toISOString(),intervalMinutes,createdAt:new Date().toISOString()})};
    this.items.push(item);
    await this.save();
    return structuredClone(item);
  }
  async createAction({instruction,dueAt,intervalMinutes=0,label='',...rest}={}){
    await this.load();
    const when=new Date(dueAt),task=clean(instruction);
    if(!task||Number.isNaN(when.getTime()))throw new Error('Valid instruction and dueAt are required');
    const item={id:crypto.randomUUID(),...this.normalize({...rest,kind:'action',instruction:task,label:label||task,message:label||task,dueAt:when.toISOString(),intervalMinutes,createdAt:new Date().toISOString()})};
    this.items.push(item);
    await this.save();
    return structuredClone(item);
  }
  async createAutomation(payload={}){
    return payload.kind==='action'||payload.kind==='execute'?this.createAction(payload):this.create(payload);
  }
  async list({includePaused=true,includeDisabled=false}={}){
    await this.load();
    return this.items
      .filter(x=>(includeDisabled||x.enabled)&&(includePaused||!x.paused))
      .sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt))
      .map(x=>structuredClone(x));
  }
  async update(id,patch={}){
    await this.load();
    const item=this.items.find(x=>x.id===String(id));
    if(!item)return null;
    Object.assign(item,this.normalize({...item,...patch}),{id:item.id,updatedAt:new Date().toISOString()});
    await this.save();
    return structuredClone(item);
  }
  async pause(id){return this.update(id,{paused:true});}
  async resume(id){return this.update(id,{paused:false});}
  async cancel(id){
    await this.load();
    const item=this.items.find(x=>x.id===String(id));
    if(!item)return false;
    item.enabled=false;
    item.updatedAt=new Date().toISOString();
    await this.save();
    return true;
  }
  _advance(item,now){
    const type=item.recurrence?.type||'once';
    const repeatDays=type==='daily'?1:type==='weekly'?7:0;
    let next=new Date(item.dueAt);
    if(type==='monthly'){
      const day=Math.max(1,Math.min(31,Number(item.recurrence?.dayOfMonth)||next.getDate()));
      while(next.getTime()<=now){
        next.setDate(1);
        next.setMonth(next.getMonth()+1);
        const last=new Date(next.getFullYear(),next.getMonth()+1,0).getDate();
        next.setDate(Math.min(day,last));
      }
    }else if(repeatDays){
      while(next.getTime()<=now)next.setDate(next.getDate()+repeatDays);
    }else if(type==='interval'||item.intervalMinutes>0){
      const step=Math.max(1,Number(item.recurrence?.minutes||item.intervalMinutes)||1)*60000;
      const start=next.getTime();
      const jumps=Math.max(1,Math.floor((now-start)/step)+1);
      next=new Date(start+jumps*step);
    }else item.enabled=false;
    if(item.enabled){item.dueAt=next.toISOString();item.nextRunAt=item.dueAt;}
    item.updatedAt=new Date().toISOString();
  }
  async snooze(id,minutes=5){
    const delay=Number(minutes);
    if(![5,15,60,1440].includes(delay))throw new Error('مدت تعویق معتبر نیست.');
    return this.update(id,{dueAt:new Date(Date.now()+delay*60000).toISOString(),enabled:true,paused:false});
  }
  async runNow(id){
    await this.load();
    const item=this.items.find(x=>x.id===String(id));
    if(!item||item.kind!=='action')throw new Error('عملیات پیدا نشد.');
    if(!this.actionExecutor)throw new Error('موتور اجرای عملیات فعال نیست.');
    if(this.executing.has(item.id))throw new Error('این عملیات در حال اجراست.');
    const now=Date.now();
    if(item.recurrence?.type==='once'||!item.recurrence||item.recurrence.type==='once'){
      item.enabled=false;item.updatedAt=new Date().toISOString();await this.save();
    }else if(new Date(item.dueAt).getTime()<=now){this._advance(item,now);await this.save();}
    await this._runActions([{...item}],now);
    const after=this.items.find(x=>x.id===String(id));
    return structuredClone({id:item.id,lastResult:after?.lastResult,runCount:after?.runCount});
  }
  async _runActions(actions,now){
    if(!this.actionExecutor)return;
    for(const item of actions){
      if(this.executing.has(item.id))continue;
      this.executing.add(item.id);
      try{
        const out=await this.actionExecutor({...item});
        const target=this.items.find(x=>x.id===item.id);
        if(target){
          target.lastRunAt=new Date(now).toISOString();
          target.runCount=(Number(target.runCount)||0)+1;
          target.lastResult={ok:out?.ok!==false,text:clean(out?.text,2000),requiresConfirmation:Boolean(out?.requiresConfirmation)};
          target.updatedAt=new Date().toISOString();
          await this.save();
        }
        // The executor already emits a Windows notification and a result event.
        // Keep history on the original task rather than creating a duplicate reminder.
      }catch(e){
        const target=this.items.find(x=>x.id===item.id);
        if(target){
          target.lastRunAt=new Date(now).toISOString();
          target.runCount=(Number(target.runCount)||0)+1;
          target.lastResult={ok:false,text:clean(e.message||e,2000)};
          target.updatedAt=new Date().toISOString();
          await this.save();
        }
        console.warn('Scheduled action failed:',String(e?.message||e));
      }finally{this.executing.delete(item.id);}
    }
  }
  async takeDue(now=Date.now()){
    await this.load();
    const remindersDue=[],actionsDue=[];
    let changed=false;
    for(const item of this.items){
      if(!item.enabled||item.paused||new Date(item.dueAt).getTime()>now)continue;
      if((item.kind||'reminder')==='action'){
        if(!this.actionExecutor)continue;
        const lateBy=Math.max(0,now-new Date(item.dueAt).getTime());
        const policy=String(item.missedRunPolicy||'grace_or_ask');
        if(lateBy>15*60000&&policy!=='run_immediately'&&(policy==='skip'||policy==='ask'||policy==='grace_or_ask')){
          item.lastResult={ok:false,requiresConfirmation:policy!=='skip',text:policy==='skip'?'اجرای دیرهنگام رد شد.':'زمان اجرا گذشته است؛ برای اجرا نیاز به تأیید است.'};
          remindersDue.push({...item,kind:'reminder',message:item.lastResult.text});
          this._advance(item,now);
          changed=true;
          continue;
        }
        actionsDue.push({...item});
        this._advance(item,now);
        changed=true;
      }else{
        remindersDue.push({...item});
        this._advance(item,now);
        changed=true;
      }
    }
    if(changed)await this.save();
    if(actionsDue.length){
      const pending=Promise.resolve().then(()=>this._runActions(actionsDue,now));
      this.actionRuns.add(pending);
      pending.then(()=>this.actionRuns.delete(pending),error=>{
        this.actionRuns.delete(pending);
        console.warn('Scheduled action failed',error.message);
      });
    }
    return remindersDue;
  }
}
export const reminders=new ReminderStore();
