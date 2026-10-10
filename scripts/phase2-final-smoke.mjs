import assert from 'node:assert/strict';
const targets=await(await fetch('http://127.0.0.1:'+(process.env.MARIA_CDP_PORT||'9494')+'/json/list')).json();
const t=targets.find(x=>x.url.includes('surface=island'));if(!t)throw Error('Island absent');
const w=new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r,j)=>{w.onopen=r;w.onerror=j});
let id=0;const q=new Map();
w.onmessage=e=>{const d=JSON.parse(e.data);if(q.has(d.id)){q.get(d.id)(d);q.delete(d.id)}};
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const n=++id;q.set(n,resolve);w.send(JSON.stringify({id:n,method,params}));
 setTimeout(()=>{if(q.has(n)){q.delete(n);reject(Error('timeout '+method));}},7000).unref();
});
const ev=async expression=>{const a=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(a.error||a.result?.exceptionDetails)throw Error(JSON.stringify(a.error||a.result.exceptionDetails));return a.result?.result?.value};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>ev("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,pinned:document.querySelector('.maria-island-v4')?.classList.contains('is-pinned'),headX:document.querySelector('.maria-island-v4')?.style.getPropertyValue('--head-x'),eyeX:document.querySelector('.maria-island-v4')?.style.getPropertyValue('--look-x'),eyes:document.querySelectorAll('.v4-character .eye').length,hands:document.querySelectorAll('.v4-character .orbit').length,page:document.querySelector('.v4-page-head h2')?.textContent})");
try{
 await ev("for(let i=0;i<3;i++)document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true");
 await sleep(120);
 await ev("document.querySelector('.maria-island-v4').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:680,clientY:80}));true");
 await sleep(190);
 const preview=await state();assert.equal(preview.mode,'preview');
 assert.equal(preview.eyes,2);assert.equal(preview.hands,2);
 assert.ok(parseFloat(preview.headX)>0,'head responds to mouse');
 assert.ok(parseFloat(preview.eyeX)>0,'eyes respond to mouse');
 await ev("document.querySelector('[data-preview-module=shortcuts]').dispatchEvent(new PointerEvent('pointerover',{bubbles:true,relatedTarget:null}));true");
 await sleep(145);
 const expanded=await state();assert.equal(expanded.mode,'expanded');
 await ev("document.querySelector('[data-character]').click();true");
 const pinned=await state();assert.equal(pinned.pinned,true);
 await ev("document.querySelector('.maria-island-v4').dispatchEvent(new MouseEvent('mouseleave'));true");
 await sleep(3050);
 const preserved=await state();assert.equal(preserved.pinned,true);assert.equal(preserved.mode,'expanded');
 console.log(JSON.stringify({ok:true,preview,expanded,pinned,preserved},null,2));
}finally{w.close()}
