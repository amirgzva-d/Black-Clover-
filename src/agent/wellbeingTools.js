import { reminders } from './ReminderStore.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const WELLBEING_PROFILES={
  eye_break:{label:'استراحت چشم',defaultMinutes:30,message:'چند لحظه از صفحه فاصله بگیر و به یک نقطه دور نگاه کن.'},
  stand_up:{label:'بلند شدن',defaultMinutes:50,message:'چند دقیقه از جا بلند شو و کمی حرکت کن.'},
  stretch:{label:'کشش کوتاه',defaultMinutes:60,message:'شانه، گردن و دست‌ها را خیلی آرام کشش بده.'},
  hydration:{label:'آب',defaultMinutes:90,message:'اگر برات مناسبه، یه کم آب بخور.'},
  posture:{label:'وضعیت نشستن',defaultMinutes:45,message:'یه نگاه کوتاه به وضعیت نشستن و ارتفاع صفحه بنداز.'},
  blink:{label:'پلک و خشکی چشم',defaultMinutes:35,message:'چند بار کامل پلک بزن و برای چند ثانیه از صفحه فاصله بگیر.'},
  breathing:{label:'تنفس کوتاه',defaultMinutes:120,message:'چند نفس آرام و معمولی؛ فقط یه مکث کوتاه بین کارها.'},
  focus_reset:{label:'ریست تمرکز',defaultMinutes:75,message:'هدف بعدی رو مشخص کن و تب‌ها/کارهای اضافی رو ببند.'},
  headphone_break:{label:'استراحت هدفون',defaultMinutes:90,message:'اگر مدت زیادی هدفون داشتی، چند دقیقه به گوش‌هات استراحت بده.'},
  walk:{label:'قدم کوتاه',defaultMinutes:120,message:'اگر امکانش هست چند قدم کوتاه راه برو.'},
  meal_check:{label:'وعده غذایی',defaultMinutes:240,message:'اگر زمان وعده‌ات گذشته، یادت نره یه چیزی مناسب بخوری.'},
  caffeine_check:{label:'کافئین',defaultMinutes:240,message:'قبل از نوشیدنی کافئین‌دار بعدی، زمان و خوابت رو هم در نظر بگیر.'},
  screen_distance:{label:'فاصله صفحه',defaultMinutes:60,message:'فاصله و زاویه صفحه رو یک لحظه بررسی کن.'},
  hand_rest:{label:'استراحت دست',defaultMinutes:60,message:'انگشت‌ها و مچ دست رو چند لحظه رها کن.'},
  neck_reset:{label:'گردن',defaultMinutes:75,message:'گردنت رو در حالت راحت قرار بده و چند لحظه از وضعیت ثابت خارج شو.'},
  daylight:{label:'نور محیط',defaultMinutes:180,message:'اگر می‌تونی نور محیط و روشنایی نمایشگر رو متعادل کن.'},
  wind_down:{label:'آماده خواب',defaultMinutes:1440,message:'اگر نزدیک زمان خوابه، شدت کار و نور صفحه رو کم‌کم پایین بیار.'},
  long_session:{label:'جلسه طولانی',defaultMinutes:120,message:'جلسه طولانی شده؛ چند دقیقه واقعاً از کار فاصله بگیر.'},
  task_switch:{label:'تعویض کار',defaultMinutes:90,message:'قبل از کار بعدی، نتیجه این کار رو ذخیره کن و بعد سوییچ کن.'},
  room_break:{label:'فاصله از میز',defaultMinutes:150,message:'اگه امکانش هست چند دقیقه از میز و صفحه فاصله بگیر.'}
};
export const wellbeingTools={
  wellbeing_catalog:tool('read','List Maria’s non-medical wellbeing reminder profiles and default intervals',{type:'object',properties:{},required:[]},async()=>result('wellbeing_catalog',true,'Wellbeing profiles listed',Object.entries(WELLBEING_PROFILES).map(([id,x])=>({id,...x})))),
  schedule_wellbeing:tool('low','Schedule a repeating non-medical wellbeing reminder such as eye break, water, stretch or posture',{type:'object',properties:{kind:{type:'string',enum:Object.keys(WELLBEING_PROFILES)},interval_minutes:{type:'number'},first_in_minutes:{type:'number'}},required:['kind']},async({kind,interval_minutes,first_in_minutes})=>{const p=WELLBEING_PROFILES[kind];if(!p)return result('schedule_wellbeing',false,'Unknown wellbeing profile');const interval=Math.max(10,Number(interval_minutes)||p.defaultMinutes),first=Math.max(1,Number(first_in_minutes)||interval),item=await reminders.create({title:p.label,message:p.message,dueAt:new Date(Date.now()+first*60000),intervalMinutes:interval,category:`wellbeing:${kind}`,priority:'low'});return result('schedule_wellbeing',true,'Wellbeing reminder scheduled',item);}),
  list_wellbeing_schedules:tool('read','List active wellbeing reminders',{type:'object',properties:{},required:[]},async()=>result('list_wellbeing_schedules',true,'Wellbeing schedules listed',(await reminders.list()).filter(x=>String(x.category||'').startsWith('wellbeing:'))))
};
