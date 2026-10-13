// Electron CDP UI test: top navigation is always visible in the preview and clickable.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const port=process.env.MARIA_CDP_PORT||'9571';
const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const surface=pages.find(x=>x.url.includes('surface=island'));
if(!surface)throw Error('Missing Top Island renderer');
const ws=new WebSocket(surface.webSocketDebuggerUrl);
await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});
let next=0;const pending=new Map();
ws.onmessage=e=>{
 const item=JSON.parse(e.data);
 if(item.id&&pending.has(item.id)){pending.get(item.id)(item);pending.delete(item.id);}
};
function call(method,params={}){
 return new Promise((ok,fail)=>{
  const id=++next;pending.set(id,ok);ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){pending.delete(id);fail(Error('CDP timeout '+method));}},8000).unref();
 });
}
async function evalExpr(expression){
 const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(result.error||result.result?.exceptionDetails)throw Error(JSON.stringify(result.error||result.result?.exceptionDetails));
 return result.result?.result?.value;
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function picture(name){
 const data=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile(path.resolve(name),Buffer.from(data.result.data,'base64'));
}
const state=()=>evalExpr("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,screen:[innerWidth,innerHeight],nav:[...document.querySelectorAll('.v4-section-button')].map(el=>({module:el.dataset.page,label:el.textContent.trim(),rect:(()=>{const r=el.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]})(),visible:getComputedStyle(el).display!=='none',hit:(()=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el||el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})()})),eyes:document.querySelectorAll('.v4-character .eye').length,arms:document.querySelectorAll('.v4-character .v4-palm').length,face:(()=>{const r=document.querySelector('.v4-character .face').getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]})(),mouthVisible:getComputedStyle(document.querySelector('.v4-character .mouth')).display!=='none',pageTitle:document.querySelector('.v4-page-head h2')?.textContent})");
const result={};
try{
 await sleep(350);
 await evalExpr("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true");
 await sleep(150);
 result.start=await state();assert.equal(result.start.mode,'peek');
 await picture('phase6-mini.png');
 await evalExpr("document.querySelector('[data-character]').click();true");
 await sleep(180);
 result.preview=await state();
 assert.equal(result.preview.mode,'preview');
 assert.equal(result.preview.nav.length,4);
 assert.deepEqual(result.preview.nav.map(x=>x.module),['shortcuts','reports','pins','tasks']);
 assert.ok(result.preview.nav.every(x=>x.visible&&x.hit),'Navigation not visible/clickable in header');
 assert.equal(result.preview.mouthVisible,false,'Reference face has no mouth');
 assert.equal(result.preview.eyes,2);assert.equal(result.preview.arms,2);
 await picture('phase6-preview.png');
 const checks=[['shortcuts','میان‌برها'],['pins','پین‌ها'],['tasks','یادآور و اجرا'],['reports','گزارش ثبت']];
 for(const [module,title] of checks){
  if(module==='shortcuts'){
    const hit=await evalExpr("(()=>{const r=document.querySelector('.v4-section-button[data-page=shortcuts]').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:hit.x,y:hit.y,pointerType:'mouse'});
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x:hit.x,y:hit.y,button:'left',clickCount:1});
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:hit.x,y:hit.y,button:'left',clickCount:1});
  }else{
    await evalExpr("document.querySelector('.v4-section-button[data-page="+module+"]').click();true");
  }
  await sleep(180);
  const x=await state();
  assert.equal(x.mode,'expanded');assert.equal(x.pageTitle,title);
  result[module]={mode:x.mode,title:x.pageTitle,navVisible:x.nav.every(y=>y.visible&&y.hit)};
  assert.equal(result[module].navVisible,true);
  if(module==='shortcuts')await picture('phase6-expanded.png');
 }
 await evalExpr("document.querySelector('[data-character]')?.click();true");
 await evalExpr("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true");
 await sleep(110);
 const closed=await state();assert.equal(closed.mode,'peek');
 result.closed=closed.mode;
 console.log(JSON.stringify({success:true,...result},null,2));
}finally{ws.close();}
