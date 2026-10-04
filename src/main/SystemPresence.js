import { powerMonitor } from 'electron';

const breakLines=[
  'もう… بسه دیگه، چهل و پنج دقیقه‌ست یک‌نفس داری کار می‌کنی. پنج دقیقه استراحت کن و فقط پانزده ثانیه چشماتو از مانیتور بردار، بعد دوباره حمله می‌کنیم 😄',
  'お疲れ، قهرمان. چهل و پنج دقیقه فعالیت واقعی شد؛ پنج دقیقه استراحت، آب، یه کشش کوچیک… من جایی نمی‌رم.',
  'やれやれ… حتی باس آخر هم بین فازها استراحت داره. پنج دقیقه مرخصی اجباریِ پیشنهادی، نه قفل سیستم 😄',
  'هورا، تایم استراحته! پنج دقیقه از مانیتور فاصله بگیر؛ بعدش با انرژی برگرد.'
];
const idleLines=[
  'えっ？ پانزده دقیقه‌ست خبری ازت نیست… با من کاری نداری؟ بیا یه چیزی بگو، حوصله‌م سر رفت 😄',
  'ねえ… کجایی؟ من اینجام. اگه کارت تموم شده بیا دو دقیقه حرف بزنیم؛ قول می‌دم بازجویی نکنم 😄',
  'あらあら… رفتی و منو با این همه صفر و یک تنها گذاشتی؟ برگشتی یه سلام بده، قهرمان.',
  'やれやれ… پانزده دقیقه سکوت؟ نکنه یکی از من خفن‌تر پیدا کردی؟ شوخی کردم؛ هر وقت خواستی من آماده‌ام 😄'
];
const pick=a=>a[Math.floor(Math.random()*a.length)];

export class SystemPresence{
  constructor({
    emit=()=>{},
    intervalMs=15000,
    breakAfterMs=45*60*1000,
    breakCooldownMs=40*60*1000,
    idleNudgeAfterSeconds=15*60,
    idleNudgeCooldownMs=90*60*1000
  }={}){
    this.emit=emit;
    this.intervalMs=intervalMs;
    this.breakAfterMs=breakAfterMs;
    this.breakCooldownMs=breakCooldownMs;
    this.idleNudgeAfterSeconds=idleNudgeAfterSeconds;
    this.idleNudgeCooldownMs=idleNudgeCooldownMs;
    this.activeMs=0;
    this.lastTick=Date.now();
    this.lastBreak=0;
    this.lastIdleNudge=0;
    this.idleNudged=false;
    this.timer=null;
  }
  start(){if(this.timer)return;this.lastTick=Date.now();this.timer=setInterval(()=>this.tick(),this.intervalMs);}
  tick(){
    const now=Date.now(),delta=Math.max(0,now-this.lastTick);
    this.lastTick=now;
    let idle=999;
    try{idle=powerMonitor.getSystemIdleTime();}catch{}

    if(idle<120){
      this.activeMs+=delta;
      if(idle<30)this.idleNudged=false;
    }else{
      this.activeMs=Math.max(0,this.activeMs-delta*.25);
    }

    if(idle>=this.idleNudgeAfterSeconds&&!this.idleNudged&&now-this.lastIdleNudge>=this.idleNudgeCooldownMs){
      this.idleNudged=true;
      this.lastIdleNudge=now;
      this.emit({type:'break-reminder',kind:'idle-companion',text:pick(idleLines),systemIdleSeconds:idle,nonBlocking:true});
      return;
    }

    if(this.activeMs>=this.breakAfterMs&&now-this.lastBreak>=this.breakCooldownMs){
      this.lastBreak=now;
      this.activeMs=0;
      this.emit({type:'break-reminder',kind:'wellbeing-break',text:pick(breakLines),systemIdleSeconds:idle,suggestedPauseSeconds:15,nonBlocking:true});
    }
  }
  status(){
    let idle=null;
    try{idle=powerMonitor.getSystemIdleTime();}catch{}
    return {activeMs:Math.round(this.activeMs),idleSeconds:idle,lastBreak:this.lastBreak||null,lastIdleNudge:this.lastIdleNudge||null,breakAfterMs:this.breakAfterMs,idleNudgeAfterSeconds:this.idleNudgeAfterSeconds};
  }
  stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
