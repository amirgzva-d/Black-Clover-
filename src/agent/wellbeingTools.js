import { reminders } from './ReminderStore.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const nowPlus=min=>new Date(Date.now()+Math.max(1,Number(min)||1)*60000).toISOString();
const mkReminder=(name,label,defaultMinutes)=>tool('low',label,{type:'object',properties:{minutes:{type:'number'},message:{type:'string'}},required:[]},async({minutes=defaultMinutes,message=''})=>result(name,true,'Wellbeing reminder scheduled',await reminders.create({message:message||label,dueAt:nowPlus(minutes)})));
export const wellbeingTools={
  wellbeing_status:tool('read','Return Maria general wellbeing feature set. This is general wellness support, not medical diagnosis',{type:'object',properties:{},required:[]},async()=>result('wellbeing_status',true,'Wellbeing capabilities ready',{capabilities:['eye break','movement','posture','hydration','meal break','sleep wind-down','focus reset','breathing','wrist stretch','neck stretch','back stretch','screen distance','brightness comfort','audio comfort','ventilation','workspace reset','deep-work pacing','long-session warning','late-night warning','quiet pause']})),
  remind_eye_break:mkReminder('remind_eye_break','۲۰ ثانیه به نقطه‌ای دور نگاه کن و به چشم‌هات استراحت بده.',20),
  remind_move_body:mkReminder('remind_move_body','چند دقیقه از جا بلند شو و کمی حرکت کن.',45),
  remind_posture:mkReminder('remind_posture','حالت نشستن، شانه‌ها و ارتفاع صفحه را چک کن.',35),
  remind_hydration:mkReminder('remind_hydration','اگر برات مناسبه کمی آب بخور.',60),
  remind_meal_break:mkReminder('remind_meal_break','اگر مدت زیادی کار کردی، زمان غذا/میان‌وعده را فراموش نکن.',120),
  remind_sleep_wind_down:mkReminder('remind_sleep_wind_down','کم‌کم نور صفحه و کار سنگین را کمتر کن تا برای خواب آماده شوی.',60),
  remind_focus_reset:mkReminder('remind_focus_reset','یک توقف کوتاه؛ هدفت را دوباره مشخص کن و فقط یک کار را ادامه بده.',25),
  remind_breathing_pause:mkReminder('remind_breathing_pause','چند نفس آرام و معمولی بکش و برای لحظه‌ای از صفحه فاصله بگیر.',30),
  remind_wrist_stretch:mkReminder('remind_wrist_stretch','مچ و انگشت‌ها را آرام حرکت بده؛ بدون فشار یا درد.',50),
  remind_neck_stretch:mkReminder('remind_neck_stretch','گردن و شانه‌ها را خیلی آرام آزاد کن؛ اگر درد داری ادامه نده.',55),
  remind_back_stretch:mkReminder('remind_back_stretch','از حالت ثابت خارج شو و کمر/بدن را آرام حرکت بده.',70),
  remind_screen_distance:mkReminder('remind_screen_distance','فاصله و زاویه نمایشگر را بررسی کن تا گردن و چشم کمتر تحت فشار باشند.',80),
  remind_brightness_comfort:mkReminder('remind_brightness_comfort','نور صفحه و محیط را طوری تنظیم کن که چشم را اذیت نکند.',90),
  remind_audio_comfort:mkReminder('remind_audio_comfort','اگر مدت زیادی هدفون داری، صدا و مدت استفاده را بررسی کن.',75),
  remind_ventilation:mkReminder('remind_ventilation','اگر محیط بسته است، تهویه و هوای اتاق را بررسی کن.',150),
  remind_workspace_reset:mkReminder('remind_workspace_reset','میز و محیط کارت را یک دقیقه مرتب کن تا حواس‌پرتی کمتر شود.',180),
  remind_deep_work_pace:mkReminder('remind_deep_work_pace','چند دقیقه از کار سنگین فاصله بگیر و بعد با تمرکز برگرد.',90),
  remind_long_session_break:mkReminder('remind_long_session_break','جلسه طولانی شده؛ پنج دقیقه استراحت واقعی بد نیست، پادشاه.',120),
  remind_late_night_pause:mkReminder('remind_late_night_pause','اگر خیلی دیر شده، بررسی کن ادامه کار واقعاً لازم هست یا بهتره استراحت کنی.',60),
  remind_quiet_pause:mkReminder('remind_quiet_pause','یک دقیقه هیچ کاری نکن؛ فقط از صفحه فاصله بگیر و ذهنت را ریست کن.',40)
};
