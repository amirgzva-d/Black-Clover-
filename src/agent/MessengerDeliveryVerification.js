import crypto from 'node:crypto';
const norm=value=>String(value||'').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const serviceNames={whatsapp:/whatsapp|واتساپ/i,telegram:/telegram|تلگرام/i,rubika:/rubika|روبیکا/i};
function currentRecipient(snapshot,service,recipient){
  if(!serviceNames[service]?.test(snapshot?.window||''))return false;
  const wanted=norm(recipient);
  if(norm(snapshot.window).includes(wanted))return true;
  const headers=(snapshot.elements||[]).filter(e=>!e.offscreen&&norm(e.name)===wanted&&
    /(?:header|conversation|chat.title|chat.info|عنوان|گفتگو|مخاطب)/i.test([e.parentName,e.className,e.automationId,e.helpText].join(' ')));
  return headers.length===1;
}
function sentContent(snapshot,content){
  const wanted=norm(content);
  return (snapshot.elements||[]).filter(e=>{
    if(e.offscreen||/Edit|Button|MenuItem|ListItem/i.test(e.controlType||''))return false;
    if(/draft|preview|attachment.dialog|پیش.?نمایش|پیش.?نویس/i.test([e.parentName,e.className].join(' ')))return false;
    const name=norm(e.name);if(!name.includes(wanted))return false;
    // The content itself cannot serve as its own receipt.
    const receipt=norm(name.replace(wanted,' ')+' '+String(e.helpText||'').replace(content,''));
    return /(?:\bsent\b|\bdelivered\b|ارسال شد|ارسال شده|تحویل داده|تحویل شد)/i.test(receipt);
  }).length;
}
export class MessengerDeliveryVerification{
  constructor({inspect,now=Date.now}={}){this.inspect=inspect;this.now=now;this.checkpoints=new Map();}
  prune(){for(const [id,item] of this.checkpoints)if(this.now()-item.createdAt>600000)this.checkpoints.delete(id);}
  async prepare({service,recipient,content,window}={}){
    this.prune();
    service=String(service||'').toLowerCase();recipient=String(recipient||'').trim();content=String(content||'').trim();
    if(!serviceNames[service]||!recipient||!content)throw new Error('پیام‌رسان، مخاطب و متن پیام یا نام دقیق فایل لازم است.');
    const target=String(window||service),result=await this.inspect({window:target,limit:250});
    const snapshot=result?.data;
    if(result?.success===false||!snapshot?.handle||!currentRecipient(snapshot,service,recipient))throw new Error('چت مقصد از روی عنوان و مشخصات قابل دسترس تأیید نشد؛ هنوز ارسال نکن.');
    const id=crypto.randomUUID(),item={service,recipient,content,window:target,handle:snapshot.handle,before:sentContent(snapshot,content),createdAt:this.now()};
    this.checkpoints.set(id,item);
    return {checkpoint:id,recipient,service,ready:true,next:'Send the staged content once, then call messenger_verify_delivery with this checkpoint.'};
  }
  async verify(id){
    this.prune();const item=this.checkpoints.get(String(id||''));
    if(!item)return {verified:false,reason:'نقطهٔ بررسی موجود نیست یا منقضی شده است.'};
    const result=await this.inspect({window:item.window,limit:250}),snapshot=result?.data;
    if(result?.success===false||snapshot?.handle!==item.handle||!currentRecipient(snapshot,item.service,item.recipient))return {verified:false,reason:'پنجره یا چت مقصد تغییر کرده یا قابل تأیید نیست؛ ارسال را تکرار نکن.'};
    const count=sentContent(snapshot,item.content),verified=count>item.before;
    return {verified,service:item.service,recipient:item.recipient,before:item.before,after:count,reason:verified?'محتوای تازه با نشانهٔ ارسال در چت مقصد دیده شد.':'محتوای تازه با نشانهٔ ارسال پیدا نشد؛ وضعیت را بررسی کن و ارسال را کورکورانه تکرار نکن.'};
  }
}
