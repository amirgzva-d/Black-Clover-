import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const port=Number(process.env.MARIA_CDP_PORT||9626);
const urls=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const target=urls.find(x=>x.url.includes('surface=island'));
assert.ok(target,'isolated Top Island target');
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let next=0;const jobs=new Map();
socket.onmessage=e=>{const msg=JSON.parse(e.data);if(jobs.has(msg.id)){jobs.get(msg.id)(msg);jobs.delete(msg.id);}};
function command(method,params={}){return new Promise((resolve,reject)=>{
 const id=++next;jobs.set(id,resolve);socket.send(JSON.stringify({id,method,params}));
 setTimeout(()=>{if(jobs.has(id)){jobs.delete(id);reject(new Error('Timeout '+method));}},14000).unref();
});}
async function inspect(expression){
 const m=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(m.error||m.result?.exceptionDetails)throw new Error(JSON.stringify(m.error||m.result.exceptionDetails));
 return m.result?.result?.value;
}
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const results={};
try{
 await command('Runtime.enable');
 await command('Page.reload');
 await sleep(850);
 await inspect("window.blackClover.showIslandModule('motion')");
 await sleep(350);
 await inspect("document.querySelector('[data-workflow-lock]')?.click();true");
 await sleep(550);
 results.studio=await inspect("({exists:!!document.querySelector('[data-mochi-studio]'),count:document.querySelectorAll('[data-card-state]').length,cheeks:document.querySelectorAll('[data-companion-preview] .mochi-cheeks .mochi-cheek').length,specular:document.querySelectorAll('[data-companion-preview] .mochi-specular').length,eyes:document.querySelectorAll('[data-companion-preview] .mochi-look .mochi-eyes').length,visibility:document.querySelector('[data-mochi-studio]')?.dataset.mochiDocHidden,live:document.querySelector('[data-motion-stage-status]')?.getAttribute('aria-live'),thumbnailFlags:[...document.querySelectorAll('[data-card-state]')].filter(e=>e.hasAttribute('data-mochi-visible')).length})");
 assert.equal(results.studio.exists,true);
 assert.equal(results.studio.count,25);
 assert.equal(results.studio.cheeks,2);
 assert.equal(results.studio.specular,1);
 assert.ok(results.studio.eyes>=5);
 assert.equal(results.studio.live,'polite');
 assert.equal(results.studio.thumbnailFlags,25);
 const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 const output=path.resolve('mochi-premium-ux-preview.png');await fs.writeFile(output,Buffer.from(shot.result.data,'base64'));
 await inspect("document.querySelector('[data-mochi-tab=sequences]').click();true");
 await sleep(100);
 const seq=await inspect("document.querySelectorAll('[data-mochi-play]').length");
 assert.equal(seq,9);
 await inspect("document.querySelector('[data-mochi-play=\\\"1000311262\\\"]').click();true");
 await sleep(350);
 results.timeline=await inspect("({playing:!document.querySelector('[data-mochi-stop]').disabled,state:document.querySelector('[data-companion-preview]').dataset.mochiState,progress:document.querySelector('[data-mochi-progress]').value})");
 assert.ok(results.timeline.playing);
 assert.ok(results.timeline.progress>0);
 await inspect("document.querySelector('[data-mochi-stop]').click();true");
 await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 results.reduced=await inspect("getComputedStyle(document.querySelector('[data-companion-preview] .mochi-float')).animationName");
 assert.equal(results.reduced,'none');
 await command('Emulation.setEmulatedMedia',{features:[]});
 console.log(JSON.stringify({success:true,...results,preview:output},null,2));
}finally{socket.close();}
