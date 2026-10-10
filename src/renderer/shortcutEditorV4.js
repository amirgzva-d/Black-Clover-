export function createSmartShortcutEditor({openModal,field,esc,renderShortcuts},item=null,initialTarget=''){
  const inner=[
    '<div class="v4-shortcut-picker">',
    '<button type="button" data-pick-file>📄 انتخاب فایل یا برنامه</button>',
    '<button type="button" data-pick-folder>📁 انتخاب پوشه</button>',
    '<span>یا فایل را بکش و در کادر پایین رها کن</span></div>',
    field('مسیر اصلی / لینک','<input name="target" required placeholder="C:\\... یا https://..." value="'+esc(initialTarget||item?.target||'')+'">','فایل اصلی جابه‌جا یا تغییرنام نمی‌شود.'),
    '<div class="v4-fields-2">',
    field('نام میان‌بر','<input name="label" placeholder="نام به صورت خودکار" value="'+esc(item?.label||'')+'">'),
    field('نوع شناسایی‌شده','<output data-shortcut-kind class="v4-shortcut-type">در انتظار انتخاب…</output>'),
    '</div><div class="v4-shortcut-target-meta" data-shortcut-meta role="status">بعد از انتخاب فایل، نام و فرمت و مسیر اصلی آن نمایش داده می‌شود.</div><div class="v4-shortcut-drop" data-shortcut-drop>فایل، برنامه، پوشه یا لینک را اینجا رها کن</div>'
  ].join('');
  const modal=openModal({
    title:item?'ویرایش میان‌بر':'میان‌بر هوشمند',kicker:'SMART SHORTCUT',body:inner,wide:true,
    onSubmit:async fd=>{
      const target=String(fd.get('target')||'').trim();
      const special=['agent','routine','project','conversation','workspace','system_action','command','contact','pin','webapp'];
      const detected=item&&special.includes(item.kind)?{target,kind:item.kind,label:item.label,icon:item.icon}:await window.blackClover.resolveShortcut(target);
      const payload={target:detected.target,label:String(fd.get('label')||'').trim()||detected.label,kind:detected.kind,icon:item?.icon||detected.icon};
      if(item)await window.blackClover.updateShortcut(item.id,payload);
      else await window.blackClover.createShortcut(payload);
      await renderShortcuts();
    }
  });
  const $=sel=>modal.querySelector(sel);
  const target=$('[name="target"]'),label=$('[name="label"]'),status=$('[data-shortcut-kind]'),meta=$('[data-shortcut-meta]');
  let suggestion='';
  const preview=async()=>{
    const value=target.value.trim();
    if(!value){status.textContent='انتخاب نشده';return;}
    try{
      const result=await window.blackClover.resolveShortcut(value);
      if(target.value.trim()!==value)return;
      const filename=result.target.split(/[\\/]/).pop()||result.label;
      const extension=filename.includes('.')?filename.slice(filename.lastIndexOf('.')).toUpperCase():'بدون پسوند';
      const kind={app:'برنامه',file:'فایل',folder:'پوشه',url:'وب‌سایت',media:'رسانه'}[result.kind]||result.kind;
      status.textContent=result.icon+' '+kind+' • '+result.label;
      meta.textContent='نام: '+filename+' | فرمت: '+(result.kind==='folder'?'پوشه':extension)+' | مسیر اصلی: '+result.target;
      if(!label.value.trim()||label.value===suggestion){label.value=result.label;suggestion=result.label;}
    }catch(err){status.textContent=String(err?.message||err);meta.textContent='مسیر را اصلاح کن یا فایل موردنظر را از ویندوز انتخاب کن.';}
  };
  const pick=async kind=>{
    try{
      const chosen=await window.blackClover.pickShortcutTarget(kind);
      if(chosen){target.value=chosen.target;await preview();}
    }catch(err){status.textContent=String(err?.message||err);}
  };
  $('[data-pick-file]').onclick=()=>pick('file');
  $('[data-pick-folder]').onclick=()=>pick('folder');
  target.addEventListener('change',preview);
  target.addEventListener('blur',preview);
  const zone=$('[data-shortcut-drop]');
  zone.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();zone.classList.add('active');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('active'));
  zone.addEventListener('drop',async e=>{
    e.preventDefault();e.stopPropagation();zone.classList.remove('active');
    const file=e.dataTransfer?.files?.[0];
    const filepath=file?window.blackClover.getDroppedFilePath(file):'';
    const url=e.dataTransfer?.getData('text/uri-list')||e.dataTransfer?.getData('text/plain')||'';
    if(filepath||/^https?:\/\//i.test(url)){target.value=filepath||url;await preview();}
    else status.textContent='مسیر اصلی قابل خواندن نیست؛ از دکمهٔ انتخاب فایل استفاده کن.';
  });
  if(item&&['agent','routine','project','conversation','workspace','system_action','command','contact','pin','webapp'].includes(item.kind))status.textContent='میان‌بر ویژه • '+item.kind;
  else if(item||initialTarget)preview();
  if(item){
    const remove=document.createElement('button');remove.type='button';remove.className='v4-danger';remove.textContent='حذف میان‌بر';
    $('.v4-dialog-body').append(remove);
    remove.onclick=async()=>{
      if(!confirm('فقط میان‌بر حذف شود؟ فایل اصلی دست‌نخورده می‌ماند.'))return;
      await window.blackClover.removeShortcut(item.id);
      modal.remove();await renderShortcuts();
    };
  }
  return modal;
}
