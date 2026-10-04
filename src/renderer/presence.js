const offlineLines=['やれやれ… باز اینترنت پرید؛ من آفلاین ادامه می‌دم، ولی کارهای آنلاین فعلاً خوابیدن.','もう… اینترنت دوباره قطع شد؟ خدایا، من دیگه نمی‌کشم 😑 فعلاً با مغز محلی کنارتم.','عه، اینترنت رفت. خیلی خب پادشاه، تا برگرده کارهای محلی رو من جمع می‌کنم.'];
const onlineLines=['よし، اینترنت برگشت؛ دوباره به دنیای بیرون وصل شدیم.','آها، برگشت. اینترنت بالا اومد و قابلیت‌های آنلاین دوباره آماده‌ان.'];
const pick=list=>list[Math.floor(Math.random()*list.length)];
export class PresenceManager{
  constructor({onLine=()=>{},onStatus=()=>{}}={}){this.onLine=onLine;this.onStatus=onStatus;this.internet=null;this.timer=null;}
  async poll({announce=true}={}){try{const s=await window.blackClover.getStatus(),online=Boolean(s.brain?.internet);this.onStatus(s);if(this.internet!==null&&online!==this.internet&&announce)this.onLine(pick(online?onlineLines:offlineLines));this.internet=online;return s;}catch{return null;}}
  start(){this.poll({announce:false});this.timer=setInterval(()=>this.poll(),60000);}
  stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
