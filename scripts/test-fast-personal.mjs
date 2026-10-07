import {Agent} from '../src/agent/Agent.js';import {reminders} from '../src/agent/ReminderStore.js';import {pinnedNotes} from '../src/agent/PinnedNoteStore.js';
const a=new Agent({enableScheduler:false});const mark='تست-ماریا-'+Date.now();
const r1=await a.chat('20 دقیقه دیگه یادم بنداز '+mark);const rs=await reminders.list();const ri=rs.find(x=>x.message===mark);
const r2=await a.chat('پین کن: '+mark);const ns=await pinnedNotes.list({limit:200});const ni=ns.find(x=>x.text===mark);
console.log(JSON.stringify({r1,reminderFound:Boolean(ri),r2,noteFound:Boolean(ni)},null,2));
if(ri)await reminders.cancel(ri.id);if(ni)await pinnedNotes.remove(ni.id);