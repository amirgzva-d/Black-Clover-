import assert from 'node:assert/strict';

const port=9622;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const list=()=>fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
const original=(await list()).find(x=>x.url.includes('surface=island'));
assert.ok(original);
async function cdp(target){
  const ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad;});
  let seq=0;const pending=new Map();
  ws.onmessage=e=>{const data=JSON.parse(e.data);if(pending.has(data.id)){pending.get(data.id)(data);pending.delete(data.id);}};
  const evalJs=async expression=>{
    const response=await new Promise((ok,bad)=>{
      const id=++seq;pending.set(id,ok);
      ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
      const timer=setTimeout(()=>{if(pending.has(id)){pending.delete(id);bad(Error('CDP timeout'));}},12000);timer.unref();
    });
    if(response.error||response.result?.exceptionDetails)throw Error(JSON.stringify(response.error||response.result?.exceptionDetails));
    return response.result?.result?.value;
  };
  return {ws,js:evalJs};
}
const island=await cdp(original);
let chat=null;
try{
 await island.js("document.querySelector('[data-settings]')?.click();true");
 await sleep(350);
 await island.js("document.querySelector('[data-full-settings]')?.click();true");
 let target=null;
 for(let i=0;i<35;i++){
   target=(await list()).find(x=>x.type==='page'&&!x.url.includes('surface=island'));
   if(target)break;await sleep(350);
 }
 assert.ok(target,'Chat settings window did not open');
 chat=await cdp(target);
 let prior=null;
 for(let i=0;i<65;i++){
   prior=await chat.js("({hidden:document.querySelector('#setup')?.hidden,status:document.querySelector('#status')?.textContent,chatReady:Boolean(document.querySelector('#newChat')?.onclick),settingsReady:Boolean(document.querySelector('#settings')?.onclick),uri:location.href})");
   if(prior.chatReady&&prior.settingsReady&&prior.hidden===false)break;
   await sleep(300);
 }
 console.log('CHAT_INITIAL',JSON.stringify(prior));
 assert.equal(prior?.chatReady,true,'Chat handlers must finish loading');
 assert.equal(prior?.hidden,false,'First-open settings request must survive asynchronous Chat mounting');
 await chat.js("document.querySelector('#setupClose').click();true");
 assert.equal(await chat.js("document.querySelector('#setup').hidden"),true,'Close button must hide settings');
 await chat.js("document.querySelector('#settings').click();true");
 assert.equal(await chat.js("document.querySelector('#setup').hidden"),false);
 await chat.js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true");
 assert.equal(await chat.js("document.querySelector('#setup').hidden"),true,'Escape must hide settings');
 await chat.js("document.querySelector('#settings').click();true");
 await chat.js("document.querySelector('#setup').dispatchEvent(new MouseEvent('click',{bubbles:true}));true");
 assert.equal(await chat.js("document.querySelector('#setup').hidden"),true,'Backdrop click must hide settings');
 await chat.js("document.querySelector('#closeChat').click();true");
 console.log(JSON.stringify({pass:true,tested:['settings close','Escape','backdrop','chat close'],chatTarget:target.url},null,2));
}finally{chat?.ws.close();island.ws.close();}
