// Typed, permission-aware scheduled actions for the Windows MARIA companion.
// Only pre-approved local/read operations execute unattended.
// Sending messages, deleting files and unrestricted agent instructions are never
// silently executed: instead MARIA opens a chat draft for explicit user approval.
import fs from 'node:fs/promises';

const safeText=(value,limit=6000)=>String(value??'').trim().slice(0,limit);
export const REMINDER_OPERATIONS=Object.freeze([
  'notify','open_url','open_path','open_shortcut','copy_text','chat_draft'
]);

export function normalizeReminderOperation(raw){
  if(!raw||typeof raw!=='object')return {type:'chat_draft',target:''};
  const type=String(raw.type||'').trim();
  if(!REMINDER_OPERATIONS.includes(type))throw new Error('نوع عملیات زمان‌بندی‌شده مجاز نیست.');
  const target=safeText(raw.target,4096);
  if(['open_url','open_path','open_shortcut','copy_text'].includes(type)&&!target)
    throw new Error('برای این عملیات، آدرس یا متن لازم است.');
  if(type==='open_url'){
    let url;
    try{url=new URL(target);}catch{throw new Error('آدرس وب‌سایت معتبر نیست.');}
    if(!['https:','http:'].includes(url.protocol)||!url.hostname)
      throw new Error('فقط آدرس‌های وب HTTP/HTTPS قابل بازکردن هستند.');
    return {type,target:url.href};
  }
  if(type==='open_path'){
    if(/^[a-z][a-z0-9+.-]*:/i.test(target)&&!/^[a-z]:[\\/]/i.test(target))
      throw new Error('پروتکل غیرمجاز برای مسیر فایل.');
  }
  return {type,target};
}

export function createReminderActionExecutor({
  openExternal,openPath,openShortcut,writeClipboard,showChatDraft,
  notify=()=>{},emit=()=>{},stat=fs.stat,
}={}){
  return async item=>{
    const operation=normalizeReminderOperation(item?.operation||{type:'chat_draft',target:item?.instruction||''});
    const label=safeText(item?.title||item?.label||item?.instruction||'عملیات ماریا',200);
    const target=operation.target||safeText(item?.instruction||item?.message,6000);
    let result;
    try{
      if(operation.type==='notify'){
        result={ok:true,text:'اعلان زمان‌بندی‌شده نمایش داده شد.'};
      }else if(operation.type==='open_url'){
        await openExternal(operation.target);
        result={ok:true,text:'وب‌سایت باز شد.'};
      }else if(operation.type==='open_path'){
        if(/\.(exe|msi|bat|cmd|ps1|scr|vbs|wsf|js|lnk)$/i.test(operation.target)){
          await showChatDraft('برای اجرای فایل اجرایی ابتدا تأیید کن: '+operation.target,{label,item});
          result={ok:false,requiresConfirmation:true,text:'فایل اجرایی به تأیید در چت نیاز دارد.'};
        }else{
        const info=await stat(operation.target);
        if(!info.isFile?.()&&!info.isDirectory?.())throw new Error('فایل یا پوشه معتبر نیست.');
        const message=await openPath(operation.target);
        if(message)throw new Error(message);
        result={ok:true,text:'فایل یا پوشه باز شد.'};
        }
      }else if(operation.type==='open_shortcut'){
        await openShortcut(operation.target);
        result={ok:true,text:'میانبر انتخاب‌شده اجرا شد.'};
      }else if(operation.type==='copy_text'){
        writeClipboard(operation.target);
        result={ok:true,text:'متن در کلیپ‌بورد کپی شد.'};
      }else{
        await showChatDraft(target,{label,item});
        result={ok:false,requiresConfirmation:true,text:'دستور در چت MARIA آماده شد؛ برای اجرا باید آن را تأیید کنی.'};
      }
      emit({type:'scheduled-action',itemId:item?.id,label,operation:operation.type,result});
      notify({title:label,body:result.text});
      return result;
    }catch(error){
      result={ok:false,text:'عملیات اجرا نشد: '+safeText(error?.message||error,400)};
      emit({type:'scheduled-action',itemId:item?.id,label,operation:operation.type,result});
      notify({title:label,body:result.text});
      return result;
    }
  };
}
