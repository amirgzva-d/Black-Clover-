import './topCompanionHub.css';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtTime=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}catch{return String(v);}};
const statusLabel=s=>({
  complete:'کامل',
  incomplete:'ناقص',
  error:'نیاز به بررسی',
  source_unavailable:'Share در دسترس نیست',
  unknown:'در انتظار بررسی'
}[s]||s||'نامشخص');

const MODULES=[
  {id:'shortcuts',label:'میان‌برها',icon:'⌁'},
  {id:'accounting',label:'گزارش ثبت',icon:'▦'},
  {id:'pins-automation',label:'پین و زمان‌بندی',icon:'◆'},
  {id:'reserved-4',label:'ماژول جدید',icon:'＋'}
];

export class TopCompanionHub{
  constructor({api=window.blackClover}={}){
    this.api=api;
    this.root=null;
    this.activeModule='shortcuts';
    this.state='compact';
    this.hideTimer=null;
    this.unsubscribe=null;
  }

  async mount(){
    if(this.root)return this;
    document.documentElement.classList.add('maria-top-hub-document');
    const root=document.createElement('section');
    root.className='maria-top-hub';
    root.dataset.state=this.state;
    root.innerHTML=`
      <div class="hub-glow" aria-hidden="true"></div>
      <header class="hub-compact">
        <button class="hub-character" data-hub-expand aria-label="باز کردن MARIA">
          <span class="hub-eye"></span><span class="hub-eye"></span>
        </button>
        <div class="hub-live" data-live>
          <span class="hub-status-dot"></span>
          <b>MARIA</b>
          <span data-status-text>آماده</span>
        </div>
        <div class="hub-pills" data-pills></div>
        <button class="hub-expand" data-hub-expand aria-label="باز کردن">⌄</button>
      </header>
      <div class="hub-expanded">
        <aside class="hub-modules" aria-label="بخش‌های MARIA">
          ${MODULES.map((m,i)=>`<button class="hub-module ${i===0?'active':''}" data-module="${m.id}"><span>${m.icon}</span><b>${m.label}</b></button>`).join('')}
        </aside>
        <main class="hub-main">
          <div class="hub-main-head">
            <div><small>MARIA HUB</small><h2 data-module-title>میان‌برها</h2></div>
            <div class="hub-head-actions">
              <button data-refresh title="بروزرسانی">↻</button>
              <button data-collapse title="جمع کردن">⌃</button>
            </div>
          </div>
          <div class="hub-content" data-content></div>
        </main>
      </div>
      <div class="hub-drop-overlay" data-drop>
        <b>رها کن</b><span>فایل را برای MARIA باز، پین، ارسال یا تحلیل کن</span>
      </div>
    `;
    document.body.append(root);
    this.root=root;
    this.bind();
    await this.refresh();
    this.subscribe();
    return this;
  }

  bind(){
    const r=this.root;
    r.querySelectorAll('[data-hub-expand]').forEach(b=>b.addEventListener('click',()=>this.setState(this.state==='expanded'?'compact':'expanded')));
    r.querySelector('[data-collapse]').addEventListener('click',()=>this.setState('compact'));
    r.querySelector('[data-refresh]').addEventListener('click',()=>this.refresh(true));
    r.querySelector('.hub-modules').addEventListener('click',e=>{
      const b=e.target.closest('[data-module]');
      if(!b)return;
      this.openModule(b.dataset.module);
    });
    r.addEventListener('mouseenter',()=>{clearTimeout(this.hideTimer);if(this.state==='hidden_edge')this.setState('peek');});
    r.addEventListener('mouseleave',()=>{clearTimeout(this.hideTimer);if(this.state==='peek')this.hideTimer=setTimeout(()=>this.setState('hidden_edge'),700);});
    for(const evt of ['dragenter','dragover']){
      r.addEventListener(evt,e=>{e.preventDefault();r.classList.add('is-drop-target');});
    }
    r.addEventListener('dragleave',e=>{if(!r.contains(e.relatedTarget))r.classList.remove('is-drop-target');});
    r.addEventListener('drop',e=>this.onDrop(e));
    r.addEventListener('click',e=>this.onAction(e));
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.state==='expanded')this.setState('compact');});
  }

  subscribe(){
    this.unsubscribe?.();
    this.unsubscribe=this.api?.onEvent?.(event=>{
      if(!event)return;
      if(event.type==='ui-state'){
        this.setStatus(event.mode,event.detail);
        return;
      }
      if(['data-changed','scheduled-action','reminder','accounting-monitor-changed','download-progress','tool'].includes(event.type)){
        this.refresh(false);
      }
      if(event.type==='permission-request')this.showPermission(event);
    });
  }

  setState(state){
    this.state=state;
    if(this.root)this.root.dataset.state=state;
  }

  setStatus(mode='online',detail=''){
    if(!this.root)return;
    this.root.dataset.mode=mode;
    const el=this.root.querySelector('[data-status-text]');
    if(el)el.textContent=detail||({online:'آماده',working:'در حال فکر کردن',executing:'در حال اجرا',listening:'در حال شنیدن',offline:'آفلاین',error:'نیاز به بررسی'}[mode]||mode);
  }

  async openModule(id){
    if(!MODULES.some(x=>x.id===id))return;
    this.activeModule=id;
    this.setState('expanded');
    this.root.querySelectorAll('[data-module]').forEach(b=>b.classList.toggle('active',b.dataset.module===id));
    const meta=MODULES.find(x=>x.id===id);
    this.root.querySelector('[data-module-title]').textContent=meta?.label||'MARIA';
    await this.renderActiveModule();
  }

  async refresh(force=false){
    if(!this.root)return;
    await this.renderPills();
    if(this.state==='expanded'||force)await this.renderActiveModule();
  }

  async renderPills(){
    const host=this.root.querySelector('[data-pills]');
    if(!host)return;
    let pills=[];
    try{pills=await this.api?.hubLivePills?.()||[];}catch{}
    host.innerHTML=pills.slice(0,4).map(p=>`<button class="hub-pill ${esc(p.state||'')}" data-pill-id="${esc(p.id)}"><span>${esc(p.icon||'•')}</span><b>${esc(p.label||p.title||'Task')}</b></button>`).join('');
  }

  async renderActiveModule(){
    const host=this.root.querySelector('[data-content]');
    if(!host)return;
    host.innerHTML='<div class="hub-loading">در حال بروزرسانی…</div>';
    try{
      if(this.activeModule==='shortcuts')return await this.renderShortcuts(host);
      if(this.activeModule==='accounting')return await this.renderAccounting(host);
      if(this.activeModule==='pins-automation')return await this.renderPinsAutomation(host);
      return this.renderReserved(host);
    }catch(e){
      host.innerHTML=`<div class="hub-error"><b>این بخش فعلاً آماده اتصال است</b><span>${esc(e?.message||e)}</span></div>`;
    }
  }

  async renderShortcuts(host){
    const items=await this.api?.hubShortcutsList?.()||[];
    const compact=items.slice(0,8);
    host.innerHTML=`
      <div class="hub-toolbar">
        <div class="hub-search"><span>⌕</span><input data-shortcut-search placeholder="جستجوی میان‌بر…"></div>
        <button class="hub-primary" data-add-shortcut>＋ افزودن</button>
      </div>
      <div class="shortcut-strip" data-shortcut-strip>
        ${compact.map(x=>this.shortcutCard(x)).join('')||'<div class="hub-empty">هنوز میان‌بری اضافه نشده.</div>'}
      </div>
      ${items.length>8?'<button class="hub-view-all" data-view-all-shortcuts>دیدن همه • '+items.length+'</button>':''}
      <div class="shortcut-grid" data-shortcut-grid>
        ${items.map(x=>this.shortcutCard(x,true)).join('')}
      </div>
    `;
    const search=host.querySelector('[data-shortcut-search]');
    search?.addEventListener('input',()=>{
      const q=search.value.trim().toLowerCase();
      host.querySelectorAll('.shortcut-card').forEach(card=>card.hidden=q&&!card.textContent.toLowerCase().includes(q));
    });
    const strip=host.querySelector('[data-shortcut-strip]');
    strip?.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();strip.scrollLeft+=e.deltaY;}},{passive:false});
  }

  shortcutCard(x,wide=false){
    return `<button class="shortcut-card ${wide?'wide':''}" data-run-shortcut="${esc(x.id)}" title="${esc(x.target||'')}">
      <span class="shortcut-icon">${esc(x.icon||x.label?.slice(0,1)||'•')}</span>
      <span><b>${esc(x.label||'میان‌بر')}</b><small>${esc(x.targetType||'')}</small></span>
      <i class="health ${esc(x.health||'unknown')}"></i>
    </button>`;
  }

  async renderAccounting(host){
    const profiles=await this.api?.accountingProfiles?.()||[];
    const results=await this.api?.accountingResults?.()||{};
    const rows=profiles.map(p=>({p,r:results[p.id]||null})).sort((a,b)=>{
      const rank=x=>x.p.pinned?0:x.r?.state==='error'?1:x.r?.state==='incomplete'?2:x.r?.state==='complete'?4:3;
      return rank(a)-rank(b)||(a.p.order??9999)-(b.p.order??9999);
    });
    host.innerHTML=`
      <div class="hub-toolbar">
        <div class="accounting-summary">
          <b>${rows.length} فایل</b><span>Event-driven + بررسی کامل هر ۳ دقیقه</span>
        </div>
        <button class="hub-primary" data-accounting-add>＋ افزودن فایل</button>
      </div>
      <div class="accounting-list">
        ${rows.map(({p,r})=>this.accountingRow(p,r)).join('')||'<div class="hub-empty">فایل حسابداری هنوز تعریف نشده.</div>'}
      </div>
    `;
  }

  accountingRow(p,r){
    const total=r?.totalRecords??0,done=r?.completeRecords??0,missing=r?.incompleteRecords??0,broken=r?.brokenLinks??0;
    const pct=total?Math.round(done/total*100):0;
    return `<article class="accounting-row ${esc(r?.state||'unknown')}" data-profile-id="${esc(p.id)}">
      <button class="pin-toggle ${p.pinned?'active':''}" data-accounting-pin="${esc(p.id)}" title="پین">◆</button>
      <div class="accounting-name"><b>${esc(p.displayName)}</b><small>${esc(p.invoiceNumber||p.workbookKind||'')}</small></div>
      <div class="accounting-progress"><div><i style="width:${pct}%"></i></div><span>${done} / ${total} ثبت</span></div>
      <div class="metric warning"><b>${missing}</b><span>ناقص</span></div>
      <div class="metric danger"><b>${broken}</b><span>لینک خراب</span></div>
      <div class="scan-meta"><b>${esc(statusLabel(r?.state))}</b><span>بررسی: ${esc(fmtTime(r?.scannedAt))}</span></div>
      <button class="row-action" data-accounting-details="${esc(p.id)}">جزئیات</button>
      <button class="row-action primary" data-accounting-open="${esc(p.id)}">بازکردن</button>
    </article>`;
  }

  async renderPinsAutomation(host){
    const [pins,automations]=await Promise.all([
      this.api?.hubPinsList?.().catch?.(()=>[])||Promise.resolve([]),
      this.api?.hubAutomationList?.().catch?.(()=>[])||Promise.resolve([])
    ]);
    host.innerHTML=`
      <div class="split-board">
        <section>
          <div class="section-head"><div><b>پین‌ها</b><span>متن، لینک، فایل، پیام و Routine</span></div><button data-add-pin>＋</button></div>
          <div class="mini-list">${(pins||[]).slice(0,12).map(x=>`<button class="mini-row" data-open-pin="${esc(x.id)}"><span>◆</span><div><b>${esc(x.title||x.label||'Pin')}</b><small>${esc(x.type||'text')}</small></div></button>`).join('')||'<div class="hub-empty">پینی نیست.</div>'}</div>
        </section>
        <section>
          <div class="section-head"><div><b>یادآور و اجرا</b><span>Notify / Execute</span></div><button data-add-automation>＋</button></div>
          <div class="mini-list">${(automations||[]).slice(0,12).map(x=>`<button class="mini-row" data-open-automation="${esc(x.id)}"><span class="kind ${esc(x.kind||'notify')}">${x.kind==='execute'?'▶':'◷'}</span><div><b>${esc(x.title||x.label||x.instruction||'Automation')}</b><small>${esc(fmtTime(x.nextRunAt||x.dueAt))}</small></div></button>`).join('')||'<div class="hub-empty">کاری زمان‌بندی نشده.</div>'}</div>
        </section>
      </div>
    `;
  }

  renderReserved(host){
    host.innerHTML='<div class="reserved-module"><span>＋</span><b>این جایگاه برای قابلیت بعدی آماده است</b><small>بعداً بدون تغییر ساختار اصلی Hub می‌توانی ماژول جدید اضافه کنی.</small></div>';
  }

  async onAction(e){
    const shortcut=e.target.closest('[data-run-shortcut]')?.dataset.runShortcut;
    if(shortcut){await this.api?.hubShortcutRun?.(shortcut);return;}
    const profile=e.target.closest('[data-accounting-open]')?.dataset.accountingOpen;
    if(profile){await this.api?.accountingOpenWorkbook?.(profile);return;}
    const details=e.target.closest('[data-accounting-details]')?.dataset.accountingDetails;
    if(details){await this.api?.accountingOpenDetails?.(details);return;}
    if(e.target.closest('[data-accounting-add]')){await this.api?.accountingAddProfile?.();return;}
    if(e.target.closest('[data-add-shortcut]')){await this.api?.hubShortcutCreateFlow?.();return;}
    if(e.target.closest('[data-add-pin]')){await this.api?.hubPinCreateFlow?.();return;}
    if(e.target.closest('[data-add-automation]')){await this.api?.hubAutomationCreateFlow?.();return;}
  }

  async onDrop(e){
    e.preventDefault();
    this.root.classList.remove('is-drop-target');
    const files=[...(e.dataTransfer?.files||[])];
    if(!files.length)return;
    await this.api?.hubDropFiles?.(files);
  }

  showPermission(event){
    if(!this.root)return;
    this.setState('expanded');
    const host=this.root.querySelector('[data-content]');
    host.innerHTML=`<div class="permission-card">
      <small>نیاز به تأیید</small>
      <h3>${esc(event.title||event.action||'عملیات MARIA')}</h3>
      <p>${esc(event.detail||event.reason||'این مرحله اثر خارجی یا حساس دارد.')}</p>
      <div><button class="deny" data-permission-deny="${esc(event.id)}">رد</button><button class="allow" data-permission-allow="${esc(event.id)}">اجازه</button></div>
    </div>`;
    host.querySelector('[data-permission-deny]')?.addEventListener('click',()=>this.api?.hubPermissionRespond?.(event.id,false));
    host.querySelector('[data-permission-allow]')?.addEventListener('click',()=>this.api?.hubPermissionRespond?.(event.id,true));
  }

  destroy(){
    this.unsubscribe?.();
    clearTimeout(this.hideTimer);
    this.root?.remove();
    this.root=null;
  }
}

export const mountTopCompanionHub=options=>new TopCompanionHub(options).mount();
