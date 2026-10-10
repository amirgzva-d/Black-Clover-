const option=(id,title,chosen)=>`<option value="${id}" ${id===chosen?'selected':''}>${title}</option>`;
const localValue=iso=>{const d=new Date(iso||Date.now()+10*60000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};

export function taskForm({openModal,field,esc,bridge,refresh},item=null){
 const kind=item?.kind||'reminder',op=item?.operation?.type||'open_url',due=localValue(item?.dueAt);
 const modal=openModal({
  title:item?'ویرایش یادآور':'یادآور و اجرای کار',kicker:'REMINDER',submit:'ذخیره',
  body:`<div class="v4-workflow-pair">
    ${field('حالت',`<select name="kind">${option('reminder','فقط اعلان',kind)}${option('action','انجام عملیات',kind)}</select>`)}
    ${field('تاریخ و ساعت دقیق',`<input name="dueAt" type="datetime-local" step="60" value="${due}" required>`)}
   </div>
   ${field('متن کوتاه',`<textarea name="instruction" rows="2" required placeholder="مثلاً فایل گزارش را باز کن">${esc(item?.instruction||item?.message||'')}</textarea>`)}
   <div class="v4-workflow-pair">
    ${field('تکرار',`<select name="repeat">${[['once','یک‌بار'],['daily','روزانه'],['weekly','هفتگی'],['monthly','ماهانه']].map(([k,v])=>option(k,v,item?.recurrence?.type||'once')).join('')}</select>`)}
    ${field('اگر زمان گذشته بود',`<select name="missed">${option('grace_or_ask','بعد از ۱۵ دقیقه: تأیید',item?.missedRunPolicy||'grace_or_ask')}${option('skip','رد کن',item?.missedRunPolicy)}${option('run_immediately','فوری اجرا کن',item?.missedRunPolicy)}</select>`)}
   </div>
   <div data-workflow-operation>
    ${field('نوع عملیات',`<select name="operation">${[['open_url','بازکردن سایت'],['open_path','بازکردن فایل/پوشه'],['open_shortcut','اجرای میانبر'],['copy_text','کپی متن'],['chat_draft','دستور در چت با تأیید']].map(([k,v])=>option(k,v,op)).join('')}</select>`)}
    <div data-workflow-target>
    ${field('آدرس یا متن',`<input name="target" dir="auto" value="${esc(item?.operation?.target||'')}" placeholder="مسیر فایل یا آدرس سایت">`)}
    <div class="v4-workflow-selectors" data-workflow-picker><button type="button" data-pick-task-file>انتخاب فایل</button><button type="button" data-pick-task-folder>انتخاب پوشه</button></div>
    <select name="shortcutId" data-workflow-shortcuts hidden></select>
    </div>
    <small class="v4-workflow-hint">کارهای حساس مثل ارسال پیام بدون تأیید اجرا نمی‌شوند.</small>
   </div>
   <label class="v4-workflow-check"><input type="checkbox" name="notifyChat" ${item?.notifyChat!==false?'checked':''}>در زمان مقرر اعلان بده و چت را باز کن</label>`,
  onSubmit:async fd=>{
   const instruction=String(fd.get('instruction')||'').trim();
   const date=new Date(String(fd.get('dueAt')||''));
   if(!instruction||Number.isNaN(date.getTime())||date.getTime()<Date.now()+15000)
    throw new Error('متن و زمان معتبرِ حداقل ۱۵ ثانیه در آینده لازم است.');
   const payload={dueAt:date.toISOString(),recurrence:{type:String(fd.get('repeat'))},
    missedRunPolicy:String(fd.get('missed')),notifyChat:fd.get('notifyChat')==='on'};
   if(fd.get('kind')==='action'){
     const type=String(fd.get('operation'));
     const target=type==='open_shortcut'?String(fd.get('shortcutId')||''):
       type==='chat_draft'?instruction:String(fd.get('target')||'').trim();
     if(!target)throw new Error('هدف عملیات انتخاب نشده است.');
     Object.assign(payload,{kind:'action',instruction,label:instruction,operation:{type,target}});
   }else Object.assign(payload,{kind:'reminder',message:instruction});
   if(item)await bridge.updateReminder(item.id,payload);else await bridge.createReminder(payload);
   await refresh();
  }
 });
 const kindSelect=modal.querySelector('[name=kind]');
 const typeSelect=modal.querySelector('[name=operation]');
 const section=modal.querySelector('[data-workflow-operation]');
 const target=modal.querySelector('[name=target]');
 const picker=modal.querySelector('[data-workflow-picker]');
 const shortcutSelect=modal.querySelector('[data-workflow-shortcuts]');
 const sync=()=>{
  const type=typeSelect.value;
  section.hidden=kindSelect.value!=='action';
  target.hidden=['open_shortcut','chat_draft'].includes(type);
  picker.hidden=type!=='open_path';
  shortcutSelect.hidden=type!=='open_shortcut';
 };
 kindSelect.onchange=sync;typeSelect.onchange=sync;
 for(const button of modal.querySelectorAll('[data-pick-task-file],[data-pick-task-folder]')){
  button.onclick=async()=>{
   const result=await bridge.pickShortcutTarget(button.hasAttribute('data-pick-task-folder')?'folder':'file');
   if(result?.target)target.value=result.target;
  };
 }
 void bridge.listShortcuts().then(shortcuts=>{
  shortcutSelect.replaceChildren();
  for(const x of shortcuts){
   const el=document.createElement('option');el.value=x.id;el.textContent=x.label;
   if(item?.operation?.target===x.id)el.selected=true;
   shortcutSelect.append(el);
  }
 }).catch(()=>{});
 sync();
 return modal;
}

export function pinForm({openModal,field,esc,bridge,refresh},item=null){
 const modal=openModal({
  title:item?'ویرایش پین':'پین جدید',kicker:'QUICK PIN',
  body:`${field('عنوان',`<input name="title" placeholder="عنوان" value="${esc(item?.title||'')}">`)}
  ${field('متن یا لینک',`<textarea name="body" rows="3" required placeholder="اینجا بنویس…">${esc(item?.body||'')}</textarea>`)}
  <label class="v4-workflow-check"><input type="checkbox" name="favorite" ${item?.favorite?'checked':''}>نمایش در موارد مهم</label>`,
  onSubmit:async fd=>{
   const body=String(fd.get('body')||'').trim();
   if(!body)throw new Error('متن پین را وارد کن.');
   const payload={title:String(fd.get('title')||'').trim()||body.slice(0,50),body,
    type:item?.type||(/^https?:\/\//i.test(body)?'url':'text'),favorite:fd.get('favorite')==='on'};
   if(item)await bridge.updatePin({id:item.id,...payload});else await bridge.createPin(payload);
   await refresh();
  }
 });
 if(item){
  const del=document.createElement('button');del.type='button';del.className='v4-danger';del.textContent='حذف پین';
  modal.querySelector('.v4-dialog-body').append(del);
  del.onclick=async()=>{if(confirm('پین حذف شود؟')){await bridge.removePin(item.id);modal.remove();await refresh();}};
 }
 return modal;
}

export function reportForm({openModal,field,esc,bridge,refresh},selectedPath=''){
 const modal=openModal({
  title:'افزودن فایل',kicker:'ACCOUNTING • EXCEL',submit:'ثبت فایل',
  body:`<div class="v4-workflow-selectors">
    <button type="button" data-pick-accounting>انتخاب فایل Excel</button>
   </div>
   ${field('فایل Excel',`<input name="path" dir="auto" value="${esc(selectedPath)}" required readonly placeholder="با دکمهٔ بالا فایل را انتخاب کن">`)}
   ${field('نوع فایل',`<select name="type">
     <option value="invoice">حسابداری</option>
     <option value="transport">باربری</option>
   </select>`)}
   <div class="v4-workflow-hint">حسابداری: پلاک C، مبلغ D و عکسِ لینک‌شده H از ردیف ۱۴؛ همه خودکار خوانده می‌شوند.</div>`,
  onSubmit:async fd=>{
   const workbook=String(fd.get('path')||'').trim();
   if(!/\.(xlsx|xlsm)$/i.test(workbook))throw new Error('اسکن مستقیم فقط برای xlsx و xlsm آماده است. فایل xls را ابتدا به xlsx تبدیل کن.');
   const type=String(fd.get('type')||'invoice');
   await bridge.createAccountingMonitor({
    path:workbook,
    name:workbook.split(/[\\/]/).pop().replace(/\.(xlsx|xlsm)$/i,''),
    type,pinned:false,archiveWhenComplete:false
   });
   await bridge.refreshAccountingReports({force:true});
   await refresh();
  }
 });
 modal.querySelector('[data-pick-accounting]').onclick=async()=>{
  const chosen=await bridge.pickAccountingFile();
  if(!chosen)return;
  modal.querySelector('[name=path]').value=chosen.path;
 };
 return modal;
}
