import assert from 'node:assert/strict';

const port=9622;
const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const target=targets.find(x=>x.url.includes('surface=island'));
assert.ok(target,'Isolated MARIA island window must be reachable');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let count=0;
const pending=new Map();
ws.onmessage=e=>{
  const response=JSON.parse(e.data);
  if(pending.has(response.id)){pending.get(response.id)(response);pending.delete(response.id);}
};
async function call(method,params={}){
  return await new Promise((resolve,reject)=>{
    const id=++count;
    pending.set(id,resolve);
    ws.send(JSON.stringify({id,method,params}));
    const timer=setTimeout(()=>{
      if(pending.has(id)){pending.delete(id);reject(Error('CDP timed out '+method));}
    },16000);
    timer.unref();
  });
}
async function js(expression){
  const response=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(response.error||response.result?.exceptionDetails)throw Error(JSON.stringify(response.error||response.result?.exceptionDetails).slice(0,800));
  return response.result?.result?.value;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function eventually(predicate,n=35){
  for(let i=0;i<n;i++){const value=await predicate();if(value)return value;await sleep(320);}
  throw Error('DOM state did not settle');
}
try{
  assert.equal(await js("document.querySelector('.maria-island-v4')?.dataset.mode"),'peek');
  await js("document.querySelector('[data-page=reports]')?.click();true");
  await sleep(450);
  console.log('AFTER_REPORT_CLICK',await js("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,page:document.querySelector('[data-page-body]')?.innerText?.slice(0,230),cards:document.querySelectorAll('[data-monitor]').length,buttons:[...document.querySelectorAll('[data-page]')].map(x=>x.dataset.page),errors:document.querySelector('.v4-error')?.textContent})"));
  await eventually(()=>js("document.querySelector('[data-report-search]')!==null"));
  await eventually(()=>js("document.querySelectorAll('[data-monitor]').length>=1"));
  const initial=await js(`(async()=>{const r=(await window.blackClover.accountingDashboard());return {count:r.length,id:r[0]?.monitor?.id,mode:document.querySelector('.maria-island-v4').dataset.mode};})()`);
  assert.ok(initial.count>=1);
  assert.equal(initial.mode,'expanded');
  const closeElement=await js("document.querySelector('[data-panel-close]')?.getAttribute('aria-label')");
  assert.ok(closeElement?.includes('بستن پنل'));
  await js("document.querySelector('[data-report-search]').value='no_such_invoice_134';document.querySelector('[data-report-search]').dispatchEvent(new Event('input',{bubbles:true}));true");
  assert.equal(await js("document.querySelector('[data-monitor]')?.hidden"),true);
  await js("document.querySelector('[data-report-search]').value='';document.querySelector('[data-report-search]').dispatchEvent(new Event('input',{bubbles:true}));true");
  assert.equal(await js("document.querySelector('[data-monitor]')?.hidden"),false);
  await js("document.querySelector('[data-monitor-detail]').click();true");
  assert.equal(await js("document.querySelector('[data-report-detail]').hidden"),false);
  await js("document.querySelector('[data-detail-close]').click();true");
  assert.equal(await js("document.querySelector('[data-report-detail]').hidden"),true);
  await js("document.querySelector('[data-monitor-sheets]').click();true");
  await eventually(()=>js("document.querySelector('.v4-modal [data-modal-close]')!==null"));
  await js("document.querySelector('.v4-modal [data-modal-close]').click();true");
  assert.equal(await js("document.querySelector('.v4-modal')===null"),true);
  await js("document.querySelector('[data-monitor-remove]').click();true");
  await eventually(()=>js("document.querySelector('.v4-modal button[type=submit]')!==null"));
  const message=await js("document.querySelector('.v4-report-unlink-confirm')?.textContent");
  assert.ok(message?.includes('حذف یا تغییر نمی‌کنند'),'confirmation must state that the XLSX is preserved');
  await js("document.querySelector('.v4-modal [data-modal-close]').click();true");
  assert.equal(await js("document.querySelector('.v4-modal')===null"),true);
  assert.equal((await js("(async()=>await window.blackClover.accountingDashboard())()")).length,initial.count);
  const pages=[
    {selector:'[data-settings]',label:'settings'},
    {selector:'[data-page=shortcuts]',label:'shortcuts'},
    {selector:'[data-page=pins]',label:'pins'},
    {selector:'[data-page=tasks]',label:'tasks'},
    {selector:'[data-page=reports]',label:'reports'}
  ];
  for(const item of pages){
    await js("document.querySelector("+JSON.stringify(item.selector)+")?.click();true");
    await eventually(()=>js("document.querySelector('.maria-island-v4')?.dataset.mode==='expanded'"));
    const hasClose=await js("document.querySelector('.v4-expanded-close')?.getBoundingClientRect().width>0");
    assert.equal(hasClose,true,item.label+' must expose a visible close');
    await js("document.querySelector('[data-panel-close]').click();true");
    await eventually(()=>js("document.querySelector('.maria-island-v4')?.dataset.mode==='peek'"));
  }
  await js("document.querySelector('[data-page=reports]').click();true");
  await eventually(()=>js("document.querySelector('[data-monitor-remove]')!==null"));
  await js("document.querySelector('[data-monitor-remove]').click();true");
  await eventually(()=>js("document.querySelector('.v4-modal button[type=submit]')!==null"));
  await js("document.querySelector('.v4-modal form').requestSubmit();true");
  await eventually(async()=>{const count=await js("(async()=>{const list=await window.blackClover.accountingDashboard();return list.length;})()");return count===initial.count-1;});
  assert.equal(await js("document.querySelectorAll('[data-monitor]').length"),initial.count-1);
  await js("document.querySelector('[data-panel-close]').click();true");
  assert.equal(await js("document.querySelector('.maria-island-v4').dataset.mode"),'peek');
  console.log(JSON.stringify({ok:true,verified:['search','details close','sheet modal close','unlink cancellation','pages close','isolated unlink confirmed','peek restored'],isolatedMonitorId:initial.id},null,2));
}finally{ws.close();}
