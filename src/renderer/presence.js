const offlineLines=[
  'やれやれ… باز اینترنت پرید؛ من آفلاین ادامه می‌دم، ولی کارهای آنلاین فعلاً خوابیدن.',
  'もう… اینترنت دوباره قطع شد؟ خدایا، من دیگه نمی‌کشم 😑 فعلاً با مغز محلی کنارتم.',
  'عه، اینترنت رفت. خیلی خب پادشاه، تا برگرده کارهای محلی رو من جمع می‌کنم.'
];
const onlineLines=['よし، اینترنت برگشت؛ دوباره به دنیای بیرون وصل شدیم.','آها، برگشت. اینترنت بالا اومد و قابلیت‌های آنلاین دوباره آماده‌ان.'];
const breakLines=[
  'もう… بسه پادشاه، حدود نیم ساعته یک‌نفس پای سیستمی؛ فقط پانزده ثانیه چشمتو از صفحه بردار، دنیا فرار نمی‌کنه 😄',
  'お疲れ، قهرمان؛ نیم ساعت شد. پانزده ثانیه به چشمات مرخصی بده، بعد دوباره حمله می‌کنیم.',
  'ارباب، حتی باس آخر هم بین فازها مکث داره؛ پانزده ثانیه از صفحه فاصله بگیر، بعد ادامه بده 😄'
];
const pick=list=>list[Math.floor(Math.random()*list.length)];

export class PresenceManager{
  constructor({onLine=()=>{},onStatus=()=>{}}={}){this.onLine=onLine;this.onStatus=onStatus;this.internet=null;this.lastActivity=Date.now();this.activeMs=0;this.lastTick=Date.now();this.lastBreak=0;this.timer=null;this.activity=()=>{this.lastActivity=Date.now();};}
  async poll({announce=true}={}){try{const s=await window.blackClover.getStatus();const online=Boolean(s.brain?.internet);this.onStatus(s);if(this.internet!==null&&online!==this.internet&&announce)this.onLine(pick(online?onlineLines:offlineLines));this.internet=online;return s;}catch{return null;}}
  start(){window.addEventListener('pointerdown',this.activity,{passive:true});window.addEventListener('keydown',this.activity,{passive:true});this.poll({announce:false});this.timer=setInterval(async()=>{const now=Date.now(),delta=now-this.lastTick;this.lastTick=now;if(now-this.lastActivity<120000)this.activeMs+=delta;if(this.activeMs>=30*60*1000&&now-this.lastBreak>60*60*1000){this.lastBreak=now;this.activeMs=0;this.onLine(pick(breakLines));}await this.poll();},60000);}
  stop(){clearInterval(this.timer);window.removeEventListener('pointerdown',this.activity);window.removeEventListener('keydown',this.activity);}
}
