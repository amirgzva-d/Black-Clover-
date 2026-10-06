const persianChars=s=>(String(s||'').match(/[\u0600-\u06FF]/g)||[]).length;
const latinChars=s=>(String(s||'').match(/[A-Za-z]/g)||[]).length;
const codeHeavy=s=>(String(s||'').match(/```/g)||[]).length>=2;

export function needsPersianRepair(userText,reply){
  if(persianChars(userText)<3)return false;
  const fa=persianChars(reply),en=latinChars(reply);
  if(fa>=24)return false;
  if(en<24)return false;
  return en>fa*1.6;
}

export async function ensurePersianReply({userText,reply,client,allowOnline=true,privateContext=false}={}){
  const text=String(reply||'').trim();if(!needsPersianRepair(userText,text)||!client)return text;
  const preserve=codeHeavy(text)?'هر بلوک کد را دقیقاً بدون تغییر نگه دار.':'';
  const messages=[
    {role:'system',content:`متن پاسخ دستیار را به فارسی طبیعی، روان و حرفه‌ای بازنویسی کن. معنی، اعداد، نام مدل‌ها، مسیرها و جزئیات فنی را حفظ کن. چیزی اضافه یا حذف نکن. ${preserve}`},
    {role:'user',content:text}
  ];
  try{
    const out=await client.chat(messages,[],{allowOnline:allowOnline&&!privateContext,profile:'chat'});
    const repaired=String(out?.message?.content||'').trim();
    return repaired&&persianChars(repaired)>=Math.max(8,persianChars(text))?repaired:text;
  }catch{return text;}
}
