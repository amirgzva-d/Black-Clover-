import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const folder='C:\\Users\\cibesabz\\MARIA_Backups\\VIDEO_1030_SMOKE_20261012';
await fs.mkdir(folder,{recursive:true});
const port=process.env.MARIA_CDP_PORT||'9600';
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
let pages=[];
for(let i=0;i<40;i++){
 try{pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();if(pages.some(x=>x.url.includes('surface=island')))break;}catch{}
 await delay(225);
}
const target=pages.find(x=>x.url.includes('surface=island'));assert.ok(target,'Island not found');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
let cursor=0;const waiting=new Map();
ws.onmessage=e=>{const x=JSON.parse(e.data);if(x.id&&waiting.has(x.id)){waiting.get(x.id)(x);waiting.delete(x.id);}};
const cmd=(method,params={})=>new Promise((ok,fail)=>{
 const id=++cursor;waiting.set(id,ok);ws.send(JSON.stringify({id,method,params}));
 setTimeout(()=>{if(waiting.has(id)){waiting.delete(id);fail(Error('Timed out '+method));}},10000).unref();
});
const run=async expression=>{
 const x=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(x.error||x.result?.exceptionDetails)throw Error(JSON.stringify(x.error||x.result?.exceptionDetails));
 return x.result?.result?.value;
};
async function shot(name){
 const x=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile(folder+'\\'+name+'.png',Buffer.from(x.result.data,'base64'));
}
const result={};try{
 await delay(650);
 await run("document.querySelector('[data-character]').click();true");await delay(300);
 await run("document.querySelector('[data-settings]').click();true");await delay(420);
 await run("document.querySelector('[data-motion-lab]').click();true");await delay(260);
 const start=await run("({stage:!!document.querySelector('[data-companion-preview]'),states:document.querySelectorAll('[data-motion-state]').length,player:!!document.querySelector('[data-film1030-play]'),particles:document.querySelectorAll('[data-companion-preview] .maria-film-particle').length,hearts:document.querySelectorAll('[data-companion-preview] .maria-film-heart').length,live:document.querySelector('[data-character]').dataset.companionState})");
 assert.ok(start.stage&&start.player);assert.ok(start.states>=18);assert.equal(start.particles,9);assert.equal(start.hearts,6);
 result.initial=start;
 await shot('01-neutral');
 for(const [name,state] of [['02-greet','greeting'],['03-thinking','thinking'],['04-warning','approval'],['05-success','success'],['06-love','affection']]){
  await run("document.querySelector('[data-motion-state="+state+"]').click();true");
  await delay(state==='affection'?460:200);
  result[state]=await run("({scene:document.querySelector('[data-companion-preview]').dataset.filmScene,stage:document.querySelector('.v4-motion-stage').dataset.filmState,real:document.querySelector('[data-character]').dataset.companionState,symbol:getComputedStyle(document.querySelector('[data-companion-preview] .v4-state-symbol')).opacity})");
  assert.equal(result[state].stage,state);
  assert.ok(['idle','greeting'].includes(result[state].real),'preview must not claim real backend completion');
  await shot(name);
 }
 await run("document.querySelector('[data-film1030-play]').click();true");await delay(400);
 result.beginPlayback=await run("({stage:document.querySelector('.v4-motion-stage').dataset.filmState,playing:document.querySelector('[data-film1030-play]').disabled,stoppable:!document.querySelector('[data-film1030-stop]').disabled})");
 console.log('BEGIN',JSON.stringify(result.beginPlayback));
 await delay(5800);
 result.playback=await run("({stage:document.querySelector('.v4-motion-stage').dataset.filmState,playing:document.querySelector('[data-film1030-play]').disabled,stoppable:!document.querySelector('[data-film1030-stop]').disabled})");
 console.log('MID',JSON.stringify(result.playback));
 assert.ok(['approval','success'].includes(result.playback.stage));
 assert.ok(result.beginPlayback.playing);
 await delay(6100);
 result.finish=await run("({stage:document.querySelector('.v4-motion-stage').dataset.filmState,startEnabled:!document.querySelector('[data-film1030-play]').disabled})");
 assert.equal(result.finish.stage,'idle');assert.equal(result.finish.startEnabled,true);
 // Real event mapping is independent from the studio: this is the critical safety invariant.
 assert.ok(['idle','greeting'].includes(result.success.real));
 result.ok=true;console.log(JSON.stringify(result,null,2));
 await fs.writeFile(folder+'\\qa.json',JSON.stringify(result,null,2));
}finally{ws.close();}
