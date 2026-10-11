import assert from 'node:assert/strict';

const targets=await(await fetch('http://127.0.0.1:9614/json/list')).json();
const entry=targets.find(x=>x.url.includes('surface=island'));
assert.ok(entry,'The isolated MARIA report panel must exist');
const ws=new WebSocket(entry.webSocketDebuggerUrl);
await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});
let seq=0;const waiting=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(waiting.has(m.id)){waiting.get(m.id)(m);waiting.delete(m.id);}};
async function send(method,params={}){
 return await new Promise((ok,fail)=>{
  const id=++seq;waiting.set(id,ok);
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(waiting.has(id)){waiting.delete(id);fail(Error('CDP timeout '+method));}},20000).unref();
 });
}
async function js(expression){
 const out=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(out.error||out.result?.exceptionDetails)throw Error(JSON.stringify(out.error||out.result?.exceptionDetails).slice(0,700));
 return out.result?.result?.value;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,count=35){
 for(let i=0;i<count;i++){const val=await check();if(val)return val;await sleep(350);}
 throw Error('UI state not reached');
}
try{
 const initial=await js(`({mode:document.querySelector('.maria-island-v4')?.dataset.mode,toolbar:document.querySelector('.v4-right-tools')?.innerHTML})`);
 assert.equal(initial.mode,'peek');
 await js("document.querySelector('[data-character]').click();true");
 await sleep(250);
 await js("document.querySelector('.v4-right-module[data-page=reports]').click();true");
 await until(()=>js("document.querySelector('[data-page-body] h2')?.textContent==='گزارش ثبت'"));
 await until(()=>js("document.querySelectorAll('[data-monitor]').length===1"));
 const dashboard=await js(`(async()=>{const rows=await window.blackClover.accountingDashboard();return rows.map(x=>({
   name:x.monitor.name,type:x.monitor.type,selected:x.result?.selectedSheets,total:x.result?.total,
   candidates:x.result?.availableSheets?.map(s=>({name:s.name,dateRows:s.dateRows}))}))})()`);
 assert.equal(dashboard.length,1);
 assert.equal(dashboard[0].total,42);
 assert.equal(dashboard[0].selected.length,2);
 assert.equal(dashboard[0].candidates.length,4);
 const gear=await js("document.querySelector('[data-monitor-sheets]')?.outerHTML");
 assert.ok(gear?.includes('data-monitor-sheets'));
 await js("document.querySelector('[data-monitor-sheets]').click();true");
 const options=await until(()=>js(`(()=>{
 const root=document.querySelector('.v4-modal');if(!root)return null;
 return {count:root.querySelectorAll('[name=sheetName]').length,
  checked:root.querySelectorAll('[name=sheetName]:checked').length,
  automatic:root.querySelector('[name=selectionMode][value=auto]')?.checked,
  names:[...root.querySelectorAll('[name=sheetName]')].map(x=>x.value)};
})()`));
 assert.equal(options.count,4);
 assert.equal(options.checked,2);
 assert.equal(options.automatic,true);
 const manual=await js(`(()=>{
 const root=document.querySelector('.v4-modal');
 const boxes=[...root.querySelectorAll('[name=sheetName]')];
 boxes[1].checked=true;
 root.querySelector('[name=selectionMode][value=manual]').checked=true;
 root.querySelector('form').requestSubmit();
 return true;
})()`);
 assert.equal(manual,true);
 await until(()=>js(`(async()=>{const a=(await window.blackClover.accountingDashboard())[0];
 return a?.monitor?.profile?.sheetSelectionMode==='manual'&&a?.result?.total===55;})()`));
 const manualState=await js(`(async()=>{const a=(await window.blackClover.accountingDashboard())[0];
 return {mode:a.monitor.profile.sheetSelectionMode,sheets:a.monitor.profile.sheets,total:a.result.total};})()`);
 assert.equal(manualState.sheets.length,3);
 assert.equal(manualState.total,55);
 await until(()=>js("document.querySelector('[data-monitor-sheets]')!==null"));
 await js("document.querySelector('[data-monitor-sheets]').click();true");
 await until(()=>js("document.querySelector('.v4-modal [name=selectionMode][value=manual]')!==null"));
 await js(`(()=>{
 const root=document.querySelector('.v4-modal');
 root.querySelector('[name=selectionMode][value=auto]').checked=true;
 root.querySelector('form').requestSubmit();return true;
})()`);
 await until(()=>js(`(async()=>{const a=(await window.blackClover.accountingDashboard())[0];
 return a?.monitor?.profile?.sheetSelectionMode==='auto'&&a?.result?.total===42;})()`));
 const final=await js(`(async()=>{const a=(await window.blackClover.accountingDashboard())[0];
 return {mode:a.monitor.profile.sheetSelectionMode,total:a.result.total,selected:a.result.selectedSheets,
   all:a.result.availableSheets.map(x=>x.name),
   header:document.querySelector('.v4-topbar')?.outerHTML?.length||0};})()`);
 assert.equal(final.total,42);
 assert.equal(final.selected.length,2);
 console.log(JSON.stringify({PASS:true,initial:initial.mode,form:options,manual:manualState,restored:final},null,2));
}finally{ws.close();}
