const secretPatterns=[
  /\b(?:api[_ -]?key|token|access[_ -]?token|refresh[_ -]?token|secret|password|passwd|رمز(?: عبور)?|پسورد|کلید api)\b\s*[:=]?\s*\S+/i,
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\b(?:ghp|github_pat|glpat)-[A-Za-z0-9_-]{12,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}\b/gi
];

const ephemeralPrivate=/(کلیپ.?بورد|clipboard|آخرین پیام|پیام خصوصی|محتوای فایل|داخل فایل|اسکرین(?:شات)?|صفحه من|ببین چی روی صفحه|رمز|پسورد|token|api.?key|کد یکبار مصرف|otp)/i;
const explicitMemory=/(یادت باشه|یادت بمونه|به خاطر بسپار|فراموش نکن|من دوست دارم|من ترجیح میدم|ترجیح می‌دم|اسم من|اسمم|همیشه برام|از این به بعد|هیچ.?وقت|هرگز)/i;

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();

export class MemoryPolicy {
  classify(text='',{explicit=false}={}) {
    const value=clean(text);
    if(!value)return {eligible:false,reason:'empty',sensitivity:'none',text:''};

    let hasSecret=false;
    for(const re of secretPatterns){
      re.lastIndex=0;
      if(re.test(value)){hasSecret=true;break;}
    }
    if(hasSecret)return {eligible:false,reason:'secret',sensitivity:'secret',text:'',localOnly:true};
    if(ephemeralPrivate.test(value))return {eligible:false,reason:'ephemeral-private-context',sensitivity:'private',text:'',localOnly:true};

    const asked=explicit||explicitMemory.test(value);
    if(!asked)return {eligible:false,reason:'not-explicit-memory',sensitivity:'normal',text:value};

    return {
      eligible:true,
      reason:'explicit-user-memory',
      sensitivity:/(ایمیل|حساب|اکانت|مسیر|پوشه|فایل|شرکت)/i.test(value)?'private':'normal',
      text:value.slice(0,2400),
      localOnly:true,
      tags:['policy-approved']
    };
  }

  sanitize(text='') {
    let value=clean(text);
    for(const re of secretPatterns){
      re.lastIndex=0;
      value=value.replace(re,'[REDACTED]');
    }
    return value;
  }

  evaluate(text='',options={}) {
    const classified=this.classify(text,options);
    if(!classified.eligible)return classified;
    return {...classified,text:this.sanitize(classified.text)};
  }
}

export const memoryPolicy=new MemoryPolicy();
