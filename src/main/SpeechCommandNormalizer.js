const tidy=s=>String(s??'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim();
const replaceToken=(s,from,to)=>s.replace(new RegExp('(^|\\s)(?:'+from+')(?=\\s|$)','giu'),(_,lead)=>lead+to);
const direct=[
  ['سدا ?رو|صدا ?رو|سدارو|صدرو','صدا رو'],['ماری|ماریاا','ماریا'],['زیادکن','زیاد کن'],['کمکن','کم کن'],['بازکن','باز کن'],['روشنای','روشنایی'],['تلگرامم','تلگرام'],['واتساپم','واتساپ']
];
const vocab=['صدا','زیاد','کم','روشنایی','نور','باز','ببند','پیدا','سرچ','جستجو','تلگرام','واتساپ','روبیکا','کروم','اکسل','فایل','پوشه','یادآوری','ماریا','خاموش','ریستارت','قفل','اسلیپ'];
function distance(a,b){a=String(a);b=String(b);const dp=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)dp[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return dp[a.length][b.length];}
export function normalizeSpeechCommand(input){
  let s=tidy(input);for(const [from,to] of direct)s=replaceToken(s,from,to);
  const parts=s.split(' ').map(w=>{if(w.length<3||/\d/.test(w))return w;let best=w,bd=99;for(const v of vocab){const d=distance(w,v);if(d<bd){bd=d;best=v;}}return bd<=1&&Math.abs(w.length-best.length)<=1?best:w;});
  return tidy(parts.join(' '));
}
