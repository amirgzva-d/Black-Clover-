import assert from 'node:assert/strict';

const url='http://127.0.0.1:9630/json/list';
const list=()=>fetch(url).then(r=>r.json());
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
async function connect(target){
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad;});
 const pending=new Map();let id=0;
 ws.onmessage=e=>{const x=JSON.parse(e.data);const done=pending.get(x.id);if(done){pending.delete(x.id);done(x);}};
 return {ws,eval:expression=>new Promise((ok,bad)=>{
   const next=++id;
   pending.set(next,r=>{if(r.error||r.result?.exceptionDetails)bad(Error(JSON.stringify(r)));else ok(r.result?.result?.value);});
   ws.send(JSON.stringify({id:next,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
   const timeout=setTimeout(()=>{if(pending.has(next)){pending.delete(next);bad(Error('CDP timeout'));}},16000);timeout.unref();
 })};
}
const existing=(await list());
const first=existing.find(x=>x.url.includes('surface=island'));
const openChat=existing.find(x=>x.url.includes('surface=chat'));
assert.ok(first||openChat,'Isolated Electron chat or island');
const island=first?await connect(first):null;let chat;
try{
 if(island&&!openChat)await island.eval("document.querySelector('[data-open-chat]')?.click();true");
 let target=openChat;
 for(let i=0;i<55;i++){target=target||(await list()).find(x=>x.url.includes('surface=chat'));if(target)break;await delay(260);}
 assert.ok(target,'Chat BrowserWindow failed to open');
 chat=await connect(target);
 for(let i=0;i<45;i++){
   if(await chat.eval("Boolean(document.querySelector('#newChat')?.onclick)"))break;
   await delay(220);
 }
 const startup=await chat.eval("({boot:Boolean(document.querySelector('#newChat')?.onclick),skills:Boolean(document.querySelector('#skillsInfo')?.onclick),status:document.querySelector('#status')?.textContent,model:document.querySelector('#modelSelect')?.value,background:getComputedStyle(document.querySelector('.workspace')).backgroundColor})");
 assert.equal(startup.boot,true);
 assert.equal(startup.skills,true);
 assert.equal(startup.model,'auto');
 await chat.eval("document.querySelector('#skillsInfo').click();true");
 for(let i=0;i<24;i++){if(await chat.eval("document.querySelector('#actionDialog')?.hidden===false"))break;await delay(160);}
 const info=await chat.eval("({shown:!document.querySelector('#actionDialog').hidden,body:document.querySelector('#actionDialogDescription').textContent})");
 if(!info.shown){console.log('CAPABILITY_DEBUG',await chat.eval("(async()=>{let cap;try{cap=await window.blackClover.skillCapabilities()}catch(e){cap='ERROR '+e.message}return {cap,toast:document.querySelector('#notice')?.textContent,active:document.querySelector('#skillsInfo')?.outerHTML.slice(0,190),modal:document.querySelector('#actionDialog')?.hidden}})()"));}
 assert.ok(info.shown,'Skills information dialog must open');
 assert.ok(info.body.includes('ابزارهای ثبت‌شده'));
 assert.ok(info.body.includes('۲۴۷')||info.body.includes('247'),info.body);
 await chat.eval("document.querySelector('#actionDialogCancel').click();true");
 assert.equal(await chat.eval("document.querySelector('#actionDialog').hidden"),true);
 await chat.eval("document.querySelector('#settings').click();true");
 assert.equal(await chat.eval("document.querySelector('#setup').hidden"),false);
 await chat.eval("document.querySelector('#setupClose').click();true");
 assert.equal(await chat.eval("document.querySelector('#setup').hidden"),true);
 const style=await chat.eval("({side:getComputedStyle(document.querySelector('.sidebar')).backgroundImage,composer:getComputedStyle(document.querySelector('.composer')).backgroundColor,body:getComputedStyle(document.body).getPropertyValue('--m-violet').trim(),toolbar:document.querySelector('.topbar').getBoundingClientRect().height})");
 assert.ok(style.side.includes('linear-gradient'),style.side);
 assert.ok(style.body==='#9787ff',style.body);
 const visible=await chat.eval("({chatCount:document.querySelectorAll('#chatList .chat-entry').length,hasComposer:Boolean(document.querySelector('#input')),empty:document.querySelector('#messages .welcome')!==null})");
 console.log(JSON.stringify({ok:true,startup,info:info.body.slice(0,175),style,visible,tests:['live window open','nonblocking mount','Auto model default','skills dialog','settings close','violet theme']},null,2));
 await chat.eval("document.querySelector('#closeChat')?.click();true");
}finally{chat?.ws.close();island?.ws.close();}
