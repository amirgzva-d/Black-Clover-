import { reminders } from './ReminderStore.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const dueFrom=({due_at='',minutes_from_now=0,hours_from_now=0,days_from_now=0}={})=>{
  if(String(due_at||'').trim()){const d=new Date(due_at);if(Number.isNaN(d.getTime()))throw new Error('due_at معتبر نیست');return d.toISOString();}
  const ms=Math.max(0,Number(minutes_from_now)||0)*60000+Math.max(0,Number(hours_from_now)||0)*3600000+Math.max(0,Number(days_from_now)||0)*86400000;
  if(ms<=0)throw new Error('یک زمان دقیق یا فاصله زمانی لازم است');
  return new Date(Date.now()+ms).toISOString();
};
const timeProps={due_at:{type:'string'},minutes_from_now:{type:'number'},hours_from_now:{type:'number'},days_from_now:{type:'number'}};
export const schedulerTools={
  create_reminder:tool('low','Create a durable local reminder. Accepts due_at ISO time or a relative delay using minutes_from_now, hours_from_now or days_from_now.',{type:'object',properties:{message:{type:'string'},...timeProps,interval_minutes:{type:'number'}},required:['message']},async(args)=>{const dueAt=dueFrom(args);const item=await reminders.create({message:args.message,dueAt,intervalMinutes:args.interval_minutes||0});return result('create_reminder',true,'Reminder created',{...item,verified:true});}),
  create_scheduled_action:tool('low','Schedule a real future Agent action. Accepts due_at ISO time or relative delay. At the due time Maria re-enters the instruction into the action brain. Sensitive steps still require confirmation.',{type:'object',properties:{instruction:{type:'string'},label:{type:'string'},...timeProps,interval_minutes:{type:'number'}},required:['instruction']},async(args)=>{const dueAt=dueFrom(args);const item=await reminders.createAction({instruction:args.instruction,dueAt,intervalMinutes:args.interval_minutes||0,label:args.label||''});return result('create_scheduled_action',true,'Executable scheduled action created',{...item,verified:true});}),
  list_reminders:tool('read','List active reminders and executable scheduled actions',{type:'object',properties:{},required:[]},async()=>result('list_reminders',true,'Schedules listed',await reminders.list())),
  cancel_reminder:tool('sensitive','Cancel an existing reminder or scheduled action by id',{type:'object',properties:{id:{type:'string'}},required:['id']},async({id})=>{const ok=await reminders.cancel(id);return result('cancel_reminder',ok,ok?'Schedule cancelled':'Schedule not found',{id});})
};
export { dueFrom };
