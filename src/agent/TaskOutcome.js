const social=/(?:تلگرام|واتساپ|روبیکا|telegram|whatsapp|rubika)/i;
const transfer=/(?:بفرست|ارسال کن|فوروارد کن|forward|send)/i;
const advice=/(?:چطور|چگونه|چرا|آموزش|نحوه)/i;
export function assessTaskOutcome(goal,trace=[],reply='') {
  if(!social.test(goal)||!transfer.test(goal)||advice.test(goal))return {complete:trace.some(s=>s.success===false)?false:true,text:reply};
  const verified=trace.some(step=>step.success&&step.name==='messenger_verify_delivery'&&step.verification?.verified===true);
  if(verified)return {complete:true,text:reply};
  const acted=trace.some(step=>step.success);
  return {complete:false,status:'needs-verification',text:acted?'بخشی از مراحل پیام‌رسان انجام شد، اما ارسال پیام یا فایل به مخاطب موردنظر تأیید نشده است. بازشدن برنامه یا آماده‌شدن فایل به معنی ارسال نیست.':'انتقال پیام یا فایل انجام نشده است؛ هنوز به چت و محتوای موردنظر دسترسی تأییدشده ندارم.'};
}
