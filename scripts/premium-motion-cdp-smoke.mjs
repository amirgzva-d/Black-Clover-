// Live Electron CDP regression for premium MARIA companion, isolated development profile.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const port=process.env.MARIA_CDP_PORT||'9594';
const root=process.env.MARIA_SMOKE_OUTPUT||'C:\\Users\\cibesabz\\MARIA_Backups\\PREMIUM_MOTION_SMOKE';
await fs.mkdir(root,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let pages=[];
for(let attempt=0;attempt<25;attempt++){
 try{pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();if(pages.some(x=>x.url.includes('surface=island')))break;}catch{}
 await sleep(300);
}
const surface=pages.find(x=>x.url.includes('surface=island'));
assert.ok(surface,'Top Island must be running before smoke test');
const ws=new WebSocket(surface.webSocketDebuggerUrl);
await new Promise((yes,no)=>{ws.addEventListener('open',yes,{once:true});ws.addEventListener('error',no,{once:true});});
let serial=0;const pending=new Map();
ws.addEventListener('message',e=>{
 const r=JSON.parse(e.data);if(r.id&&pending.has(r.id)){pending.get(r.id)(r);pending.delete(r.id);}
});
async function call(method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++serial;pending.set(id,resolve);
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('CDP timeout: '+method));}},8000).unref();
 });
}
async function run(expression){
 const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(r.error||r.result?.exceptionDetails)throw new Error(JSON.stringify(r.error||r.result?.exceptionDetails));
 return r.result?.result?.value;
}
async function snapshot(name){
 const data=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile(root+'\\'+name+'.png',Buffer.from(data.result.data,'base64'));
}
const results={};
try{
 for(let attempt=0;attempt<30;attempt++){
   await sleep(250);
   results.initial=await run("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,eyes:document.querySelectorAll('[data-character] .eye').length,shape:document.querySelector('.maria-island-v4')?.style.getPropertyValue('--maria-mochi-shape').slice(0,8)})");
   if(results.initial.mode==='peek')break;
 }
 console.log('INIT',JSON.stringify(results.initial));
 assert.equal(results.initial.mode,'peek');assert.equal(results.initial.eyes,2);
 assert.equal(results.initial.shape,'polygon(');
 await snapshot('01-idle-peek');
 await run("document.querySelector('[data-character]').click();true");
 await sleep(250);
 results.preview=await run("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,controls:[...document.querySelectorAll('.v4-right-module')].map(x=>x.dataset.page),face:document.querySelector('.face')?.getBoundingClientRect().width})");
 assert.equal(results.preview.mode,'preview');assert.equal(results.preview.controls.length,4);
 await snapshot('02-preview');
 await run("document.querySelector('[data-settings]').click();true");
 await sleep(350);
 results.settings=await run("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,button:!!document.querySelector('[data-motion-lab]')})");
 assert.equal(results.settings.mode,'expanded');assert.equal(results.settings.button,true);
 await run("document.querySelector('[data-motion-lab]').click();true");
 await sleep(150);
 results.studio=await run("({heading:document.querySelector('.v4-motion-head h2')?.textContent,states:document.querySelectorAll('[data-motion-state]').length,outfits:document.querySelectorAll('[data-motion-outfit]').length})");
 assert.ok(results.studio.heading.includes('استودیو'));assert.ok(results.studio.states>=14);assert.equal(results.studio.outfits,8);
 await snapshot('03-motion-studio');
 await run("document.querySelector('[data-motion-state=uploading]').click();true");
 results.upload=await run("({state:document.querySelector('.v4-motion-stage').dataset.filmState,real:document.querySelector('[data-character]').dataset.companionState,label:document.querySelector('[data-motion-stage-status]').textContent})");
 assert.equal(results.upload.state,'uploading');assert.ok(results.upload.label.includes('بارگذاری'));
 assert.ok(['idle','greeting'].includes(results.upload.real));
 await snapshot('04-upload-motion');
 await run("document.querySelector('[data-motion-outfit=wizard]').click();true");
 results.outfit=await run("({outfit:document.querySelector('.maria-island-v4')?.dataset.outfit,pref:JSON.parse(localStorage.getItem('maria:top-island-v4:ui')).companionOutfit})");
 assert.equal(results.outfit.outfit,'wizard');assert.equal(results.outfit.pref,'wizard');
 await snapshot('05-wizard');
 await run("document.querySelector('[data-motion-level=none]').click();true");
 results.noMotion=await run("({level:document.querySelector('.maria-island-v4')?.dataset.motionLevel,pref:JSON.parse(localStorage.getItem('maria:top-island-v4:ui')).motionQuality})");
 assert.equal(results.noMotion.level,'none');assert.equal(results.noMotion.pref,'none');
 await run("document.querySelector('[data-motion-level=full]').click();document.querySelector('[data-motion-outfit=classic]').click();true");
 results.ok=true;
 console.log(JSON.stringify(results,null,2));
 await fs.writeFile(root+'\\smoke-results.json',JSON.stringify(results,null,2));
}finally{ws.close();}
