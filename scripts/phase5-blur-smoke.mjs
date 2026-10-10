// Click island with native CDP mouse, then focus Chat; island should shrink.
const pages=await(await fetch('http://127.0.0.1:'+String(process.env.MARIA_CDP_PORT||9552)+'/json/list')).json();
const tab=pages.find(x=>x.url.includes('surface=island'));
if(!tab)throw Error('Missing island CDP target');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad});
let id=0;const p=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(p.has(m.id)){p.get(m.id)(m);p.delete(m.id)}};
const send=(method,params={})=>new Promise((ok,bad)=>{const n=++id;p.set(n,ok);ws.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(p.has(n)){p.delete(n);bad(Error('Timeout'))}},9000).unref()});
const evaluate=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.error||r.result?.exceptionDetails)throw Error(JSON.stringify(r.error||r.result.exceptionDetails));return r.result?.result?.value};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await evaluate("document.querySelector('[data-character]').click();true");
 await sleep(120);
 await send('Page.bringToFront');
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:100,y:36,pointerType:'mouse'});
 await send('Input.dispatchMouseEvent',{type:'mousePressed',x:100,y:36,button:'left',clickCount:1});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:100,y:36,button:'left',clickCount:1});
 await sleep(140);
 const before=await evaluate("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,focused:document.hasFocus()})");
 await evaluate("window.blackClover.showChat()");
 await sleep(440);
 const after=await evaluate("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,focused:document.hasFocus()})");
 const windowState=await evaluate("window.blackClover.windowState()");
 await evaluate("window.blackClover.hideChat()");
 console.log(JSON.stringify({before,after,avatarVisible:windowState.avatarVisible},null,2));
}finally{ws.close()}
