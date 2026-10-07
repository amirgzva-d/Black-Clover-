const persian=/[\u0600-\u06FF]/g;
const latin=/[A-Za-z]/g;

const count=(text,re)=>(String(text||'').match(re)||[]).length;

export class ResultValidator {
  validateText(input='',output='') {
    const text=String(output||'').trim();
    if(!text)return {ok:false,needsRepair:true,reason:'empty-response'};

    const inputPersian=count(input,persian);
    const outputPersian=count(text,persian);
    const outputLatin=count(text,latin);
    const expectsPersian=inputPersian>=2;
    const mostlyEnglish=expectsPersian&&outputPersian<Math.max(4,Math.floor(inputPersian*.2))&&outputLatin>24;

    if(mostlyEnglish)return {ok:false,needsRepair:true,reason:'unexpected-english'};
    if(/^(undefined|null|\[object Object\])$/i.test(text))return {ok:false,needsRepair:true,reason:'invalid-rendered-response'};
    return {ok:true,needsRepair:false,reason:'ok'};
  }

  repairMessages(input='',badOutput='') {
    return [
      {
        role:'system',
        content:'پاسخ قبلی از نظر زبان یا کیفیت خروجی مناسب نبود. فقط پاسخ نهایی را به فارسی طبیعی، دقیق و حرفه‌ای بازنویسی کن. معنی و اطلاعات درست را حفظ کن، اطلاعات جدید نساز، و اگر سؤال تخصصی است سطحی جواب نده.'
      },
      {
        role:'user',
        content:'سؤال کاربر:\n'+String(input||'')+'\n\nپاسخ قبلی:\n'+String(badOutput||'')
      }
    ];
  }
}
