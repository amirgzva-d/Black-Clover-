// Isolated Electron UI check. Launch Electron with BLACK_CLOVER_DEBUG_PORT=9526
// and a dedicated BLACK_CLOVER_DEV_SLOT before running this script.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const host='http://127.0.0.1:'+String(process.env.MARIA_CDP_PORT||9526);
const pages=await(await fetch(host+'/json/list')).json();
const target=pages.find(p=>p.url.includes('surface=island'));
if(!target)throw Error('Isolated Top Island target missing');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
let next=0;const requests=new Map();
ws.onmessage=e=>{const v=JSON.parse(e.data);if(requests.has(v.id)){requests.get(v.id)(v);requests.delete(v.id)}};
function cmd(method,params={}){
 return new Promise((ok,fail)=>{
  const id=++next;requests.set(id,ok);ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(requests.has(id)){requests.delete(id);fail(new Error('CDP timeout '+method))}},12000).unref();
 });
}
async function run(expression){
 const v=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(v.error||v.result?.exceptionDetails)throw Error(JSON.stringify(v.error||v.result.exceptionDetails));
 return v.result?.result?.value;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function picture(name){
 const v=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
 await fs.writeFile(path.resolve(name),Buffer.from(v.result.data,'base64'));
}
async function snap(){
 return run("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,pinned:document.querySelector('.maria-island-v4')?.classList.contains('is-pinned'),screen:{w:innerWidth,h:innerHeight},title:document.querySelector('.v4-page-head h2')?.textContent,eyes:document.querySelectorAll('.v4-character .eye').length,arms:document.querySelectorAll('.v4-arm').length,peekAvatarLeft:document.querySelector('[data-character]')?.getBoundingClientRect().left,previewIcons:document.querySelectorAll('.v4-preview button').length})");
}
const result={};
try{
 await sleep(350);
 result.boot=await snap();assert.equal(result.boot.mode,'peek','default must be mini');
 assert.ok(result.boot.screen.w<=310&&result.boot.screen.h<=60,'mini bounds');
 await picture('phase4-mini.png');
 await run("document.querySelector('.maria-island-v4').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:70,clientY:23}));true");
 await sleep(260);
 result.hover=await snap();
 assert.equal(result.hover.mode,'preview','hover should show rectangle');
 assert.equal(result.hover.previewIcons,0,'reference rectangle remains uncluttered');
 await picture('phase4-rectangle.png');
 await run("document.querySelector('[data-settings]').dispatchEvent(new PointerEvent('pointerover',{bubbles:true,relatedTarget:null}));true");
 await sleep(110);
 result.iconHover=await snap();assert.equal(result.iconHover.mode,'preview','icon hover must NOT navigate');
 await run("document.querySelector('.v4-preview').click();true");
 result.fixed=await snap();assert.equal(result.fixed.pinned,true);
 await run("document.querySelector('[data-character]').click();true");
 await sleep(180);
 result.avatarClose=await snap();assert.equal(result.avatarClose.mode,'peek');assert.equal(result.avatarClose.pinned,false);
 await run("document.querySelector('.maria-island-v4').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:71,clientY:25}));true");
 await sleep(300);
 result.noFlicker=await snap();assert.equal(result.noFlicker.mode,'peek','avatar click must not immediately reopen');
 await run("document.querySelector('.maria-island-v4').dispatchEvent(new MouseEvent('mouseleave'));document.querySelector('.maria-island-v4').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:74,clientY:22}));true");
 await sleep(260);
 result.reopen=await snap();assert.equal(result.reopen.mode,'preview');
 await run("document.querySelector('[data-settings]').click();true");
 await sleep(160);
 result.settings=await snap();assert.equal(result.settings.mode,'expanded');assert.equal(result.settings.title,'تنظیمات پنل');
 await picture('phase4-settings.png');
 await sleep(5230);
 result.afterIdle=await snap();assert.equal(result.afterIdle.mode,'peek');assert.equal(result.afterIdle.pinned,false);
 console.log(JSON.stringify({ok:true,...result},null,2));
}finally{ws.close()}
