import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const port=Number(process.env.MARIA_CDP_PORT||9583);
const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const island=targets.find(t=>t.url.includes('surface=island'));
assert.ok(island,'Top Island window found');
const ws=new WebSocket(island.webSocketDebuggerUrl);
await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});
let seq=0;const pending=new Map();
ws.onmessage=e=>{const msg=JSON.parse(e.data);if(pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id)}};
function send(method,params={}){
 return new Promise((ok,fail)=>{
  const n=++seq;pending.set(n,ok);ws.send(JSON.stringify({id:n,method,params}));
  setTimeout(()=>{if(pending.has(n)){pending.delete(n);fail(new Error('Timeout '+method));}},12000).unref();
 });
}
async function run(expression){
 const response=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(response.error||response.result?.exceptionDetails)throw Error(JSON.stringify(response.error||response.result?.exceptionDetails));
 return response.result?.result?.value;
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const inspect=()=>run(`(()=>{const root=document.querySelector('.maria-island-v4');const buttons=[...document.querySelectorAll('.v4-right-tools button')];return {
  mode:root.dataset.mode,
  viewport:{w:innerWidth,h:innerHeight},
  centerNavCount:document.querySelectorAll('.v4-section-tools,.v4-section-button').length,
  buttons:buttons.map(b=>{const r=b.getBoundingClientRect(),svg=b.querySelector('svg'),s=svg?getComputedStyle(svg):null;return {
    module:b.dataset.page||b.dataset.settings||b.dataset.panelSound||b.getAttribute('aria-label'),title:b.title,
    x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
    svgW:svg?Math.round(svg.getBoundingClientRect().width):null,
    stroke:s?.strokeWidth,
    visible:getComputedStyle(b).display!=='none'&&r.width>0&&r.height>0,
    hit:!!svg&&(b===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)||b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))),
    background:getComputedStyle(b).backgroundColor
  }}),
  pageTitle:document.querySelector('.v4-page-head h2')?.textContent
};})()`);
async function screenshot(file){
 const response=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
 await fs.writeFile(path.resolve(file),Buffer.from(response.result.data,'base64'));
}
const outcome={};
try{
 await sleep(280);
 outcome.mini=await inspect();
 assert.equal(outcome.mini.mode,'peek');
 await screenshot('phase7-mini.png');
 await run("document.querySelector('[data-character]').click();true");
 await sleep(240);
 outcome.preview=await inspect();
 assert.equal(outcome.preview.mode,'preview');
 assert.equal(outcome.preview.viewport.w,900);
 assert.equal(outcome.preview.centerNavCount,0);
 const buttons=outcome.preview.buttons;
 assert.equal(buttons.length,6,'four modules plus settings and sound');
 assert.deepEqual(buttons.slice(0,4).map(b=>b.module),['shortcuts','reports','pins','tasks']);
 assert.deepEqual(buttons.slice(-2).map(b=>b.title),['تنظیمات','صدای پنل']);
 assert.ok(buttons.every(x=>x.visible&&x.hit),'Every icon is visibly clickable');
 assert.ok(buttons.every(x=>x.w===36&&x.h===36&&x.svgW===18&&x.stroke==='1.7px'),'All icon sizes and line weights agree with settings');
 assert.ok(buttons.every(x=>x.x>600),'Module icons sit near Settings at the right edge');
 for(let i=1;i<buttons.length;i++)assert.equal(buttons[i].x-buttons[i-1].x,39,'Same icon spacing');
 await screenshot('phase7-preview.png');
 for(const [module,label] of [['shortcuts','میان‌برها'],['reports','گزارش ثبت'],['pins','پین‌ها'],['tasks','یادآور و اجرا']]){
  const p=await run("(()=>{const b=document.querySelector('.v4-right-module[data-page="+module+"]');const r=b.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y,pointerType:'mouse'});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1});
  await sleep(160);
  const s=await inspect();
  assert.equal(s.mode,'expanded');assert.equal(s.pageTitle,label);
  assert.ok(s.buttons.find(x=>x.module===module)?.hit,'Module stays clickable when expanded');
  outcome[module]={page:s.pageTitle,iconSizes:s.buttons.map(x=>x.svgW)};
 }
 await screenshot('phase7-expanded.png');
 await run("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true");
 await sleep(140);
 assert.equal((await inspect()).mode,'peek');
 console.log(JSON.stringify({success:true,preview:outcome.preview,modules:Object.fromEntries(['shortcuts','reports','pins','tasks'].map(x=>[x,outcome[x]]))},null,2));
}finally{ws.close();}
