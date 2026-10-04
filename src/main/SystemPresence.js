import { powerMonitor } from 'electron';
const lines=[
  'もう… بسه پادشاه؛ حدود نیم ساعت واقعاً با سیستم درگیری. پانزده ثانیه چشماتو از صفحه بردار، دنیا فرار نمی‌کنه 😄',
  'お疲れ، قهرمان؛ نیم ساعت فعالیت واقعی سیستم شد. یه استراحت خیلی کوتاه بده به چشمات، بعد دوباره حمله می‌کنیم.',
  'やれやれ… حتی باس آخر هم بین فازها مکث داره؛ پانزده ثانیه فاصله از صفحه، بعد ادامه.'
];
const pick=a=>a[Math.floor(Math.random()*a.length)];
export class SystemPresence{
  constructor({emit=()=>{},intervalMs=15000,breakAfterMs=30*60*1000,cooldownMs=60*60*1000}={}){this.emit=emit;this.intervalMs=intervalMs;this.breakAfterMs=breakAfterMs;this.cooldownMs=cooldownMs;this.activeMs=0;this.lastTick=Date.now();this.lastBreak=0;this.timer=null;}
  start(){if(this.timer)return;this.lastTick=Date.now();this.timer=setInterval(()=>this.tick(),this.intervalMs);}
  tick(){const now=Date.now(),delta=Math.max(0,now-this.lastTick);this.lastTick=now;let idle=999;try{idle=powerMonitor.getSystemIdleTime();}catch{}if(idle<120)this.activeMs+=delta;else this.activeMs=Math.max(0,this.activeMs-delta*.25);if(this.activeMs>=this.breakAfterMs&&now-this.lastBreak>=this.cooldownMs){this.lastBreak=now;this.activeMs=0;this.emit({type:'break-reminder',text:pick(lines),systemIdleSeconds:idle});}}
  status(){let idle=null;try{idle=powerMonitor.getSystemIdleTime();}catch{}return {activeMs:Math.round(this.activeMs),idleSeconds:idle,lastBreak:this.lastBreak||null};}
  stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
