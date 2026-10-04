import { reminders } from './ReminderStore.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const schedulerTools={
  create_reminder:tool('low','Create a durable local reminder. due_at must be an ISO date/time. Optional interval_minutes repeats it',{type:'object',properties:{message:{type:'string'},due_at:{type:'string'},interval_minutes:{type:'number'}},required:['message','due_at']},async({message,due_at,interval_minutes=0})=>result('create_reminder',true,'Reminder created',await reminders.create({message,dueAt:due_at,intervalMinutes:interval_minutes}))),
  list_reminders:tool('read','List active local reminders and schedules',{type:'object',properties:{},required:[]},async()=>result('list_reminders',true,'Reminders listed',await reminders.list())),
  cancel_reminder:tool('sensitive','Cancel an existing reminder by id',{type:'object',properties:{id:{type:'string'}},required:['id']},async({id})=>{const ok=await reminders.cancel(id);return result('cancel_reminder',ok,ok?'Reminder cancelled':'Reminder not found',{id});})
};
