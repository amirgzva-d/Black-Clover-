// Real Windows Electron CDP acceptance of beta.2 UI and native island resizing.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const port=process.env.MARIA_CDP_PORT||'9598';
const folder='C:\\Users\\cibesabz\\MARIA_Backups\\BETA2_LIVE_SMOKE_20261012';
await fs.mkdir(folder,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pages=[];
for(let i=0;i<35;i++){
 try{pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();if(pages.some(x=>x.url.includes('surface=island')))break;}catch{}
 await sleep(200);
}
const surface=pages.find(x=>x.url.includes('surface=island'));assert.ok(surface,'island window missing');
const ws=new WebSocket(surface.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
let id=0;const pending=new Map();
ws.onmessage=e=>{const o=JSON.parse(e.data);if(o.id&&pending.has(o.id)){pending.get(o.id)(o);pending.delete(o.id);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const seq=++id;pending.set(seq,resolve);ws.send(JSON.stringify({id:seq,method,params}));
 setTimeout(()=>{if(pending.has(seq)){pending.delete(seq);reject(new Error('CDP timeout '+method));}},10000).unref();
});
const run=async expression=>{
 const x=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(x.result?.exceptionDetails||x.error)throw Error(JSON.stringify(x.result?.exceptionDetails||x.error));
 return x.result?.result?.value;
};
const shot=async file=>{
 const x=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile(folder+'\\'+file+'.png',Buffer.from(x.result.data,'base64'));
};
const result={};try{
 await sleep(850);
 // Check the native render size stays equal to the intended peek geometry.
 for(let n=0;n<20;n++){
  result.peek=await run("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,w:innerWidth,h:innerHeight})");
  if(result.peek.mode==='peek')break;await sleep(200);
 }
 assert.equal(result.peek.mode,'peek');
 assert.ok(result.peek.w>=260&&result.peek.w<=310);
 await run("document.querySelector('[data-character]').click();true");
 await sleep(390);
 result.preview=await run("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,w:innerWidth,avatar:!!document.querySelector('[data-character] .face')})");
 assert.equal(result.preview.mode,'preview');assert.ok(result.preview.w>=750&&result.preview.avatar);
 await run("document.querySelector('[data-settings]').click();true");
 await sleep(450);
 result.settings=await run("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,w:innerWidth,updateBtn:!!document.querySelector('[data-feature-catalog]')})");
 assert.equal(result.settings.mode,'expanded');assert.ok(result.settings.w>=900);assert.equal(result.settings.updateBtn,true);
 await run("document.querySelector('[data-feature-catalog]').click();true");await sleep(240);
 result.catalog=await run("({heading:document.querySelector('.v4-features h2')?.textContent,cards:document.querySelectorAll('.v4-feature-card').length,planned:[...document.querySelectorAll('.v4-feature-card[data-feature-status=planned]')].every(x=>!x.querySelector('button'))})");
 assert.ok(result.catalog.heading.includes('قابلیت'));assert.ok(result.catalog.cards>=10);assert.ok(result.catalog.planned);
 await shot('01-feature-catalog');
 await run("(()=>{const x=document.querySelector('[data-feature-status]');x.value='planned';x.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
 result.planned=await run("({count:document.querySelectorAll('.v4-feature-card').length,allPlanned:[...document.querySelectorAll('.v4-feature-card')].every(x=>x.dataset.featureStatus==='planned')})");
 assert.ok(result.planned.count>=1&&result.planned.allPlanned);
 await run("(()=>{const x=document.querySelector('[data-feature-status]');x.value='all';x.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
 await run("document.querySelector('[data-feature-open=quick-launch]').click();true");await sleep(260);
 result.navigation=await run("({title:document.querySelector('.v4-page-head h2')?.textContent,mode:document.querySelector('.maria-island-v4')?.dataset.mode})");
 assert.ok(result.navigation.title.includes('میان'));assert.equal(result.navigation.mode,'expanded');
 // Outside shortcuts, a dropped link offers explicit actions; nothing is executed without a click.
 await run("document.querySelector('[data-home]').click();true");await sleep(250);
 await run("(()=>{const r=document.querySelector('.maria-island-v4');const d=new DataTransfer();d.setData('text/uri-list','https://example.com/test');r.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:d}));return true;})()");
 await sleep(180);
 result.drop=await run("({modal:!!document.querySelector('.v4-modal'),actions:[...document.querySelectorAll('[data-drop-action]')].map(x=>x.dataset.dropAction),text:document.querySelector('.v4-drop-file-identity small')?.textContent})");
 assert.ok(result.drop.modal);assert.deepEqual(result.drop.actions,['ask','shortcut','pin']);assert.ok(result.drop.text.includes('example.com'));
 await shot('02-real-drop-actions');
 await run("document.querySelector('[data-modal-close]')?.click();true");
 result.ok=true;
 console.log(JSON.stringify(result,null,2));
 await fs.writeFile(folder+'\\qa.json',JSON.stringify(result,null,2));
}finally{ws.close();}
