import { ensurePersianReply } from './LanguageGuard.js';

const successOnly=/^(?:انجام شد|تمام شد|اوکی|done|completed|success(?:ful)?)[.!\s]*$/i;
const successClaim=/(انجام شد|باز شد|بسته شد|پیدا کردم|نصب شد|حذف شد|completed|done|successfully)/i;

export class ResultValidator{
  constructor({client}={}){this.client=client;}
  async validate({reply,userText,turn,allowOnline=true}={}){
    let text=String(reply||'').trim()||'پاسخی دریافت نشد.';
    const action=Boolean(turn?.intent?.action),trace=turn?.trace||[],failures=trace.filter(x=>x.success===false||x.verification?.ok===false),successes=trace.filter(x=>x.success!==false&&x.verification?.ok!==false);
    if(action&&!trace.length&&successClaim.test(text))text=`این کار هنوز با ابزار اجرا و تأیید نشده. ${text}`;
    if(failures.length&&(!successes.length||successOnly.test(text)))text=`نتیجه کامل تأیید نشد؛ ${failures.length} مرحله خطا یا عدم‌تأیید داشت. ${text}`;
    text=await ensurePersianReply({userText,reply:text,client:this.client,allowOnline,privateContext:Boolean(turn?.private)});
    return {text,verified:action?Boolean(successes.length&&!failures.length):true,failures:failures.length,successes:successes.length};
  }
}
