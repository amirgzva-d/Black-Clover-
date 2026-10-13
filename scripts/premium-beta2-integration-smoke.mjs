// Integration smoke against the live Electron preload and isolated dev data folder.
// Adds and removes a temporary URL pin and shortcut; no user library is touched.
import assert from 'node:assert/strict';
const port=process.env.MARIA_CDP_PORT||'9598';
const list=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const item=list.find(x=>x.url.includes('surface=island'));assert.ok(item);
const ws=new WebSocket(item.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
let next=0;const pending=new Map();
ws.onmessage=e=>{const x=JSON.parse(e.data);if(x.id&&pending.has(x.id)){pending.get(x.id)(x);pending.delete(x.id);}};
const send=(method,params={})=>new Promise((ok,fail)=>{const id=++next;pending.set(id,ok);ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);fail(Error('CDP timeout'))}},20000).unref();});
const run=async expression=>{
 const res=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(res.error||res.result?.exceptionDetails)throw Error(JSON.stringify(res.error||res.result?.exceptionDetails));
 return res.result?.result?.value;
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const target='https://example.org/maria-premium-integration-test';
let newPin=null,newShortcut=null;
try{
 await run("document.querySelector('[data-home]').click();true");await sleep(290);
 await run("(()=>{const dt=new DataTransfer();dt.setData('text/uri-list','"+target+"');document.querySelector('.maria-island-v4').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));return true;})()");
 await sleep(90);
 assert.equal(await run("!!document.querySelector('[data-drop-action=pin]')"),true);
 await run("document.querySelector('[data-drop-action=pin]').click();true");await sleep(350);
 newPin=await run("window.blackClover.listPins().then(x=>x.find(p=>p.body==='"+target+"')||null)");
 assert.ok(newPin?.id,'pin must actually be persisted');
 await run("document.querySelector('[data-home]').click();true");await sleep(290);
 await run("(()=>{const dt=new DataTransfer();dt.setData('text/uri-list','"+target+"');document.querySelector('.maria-island-v4').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));return true;})()");
 await sleep(90);
 assert.equal(await run("!!document.querySelector('[data-drop-action=shortcut]')"),true);
 await run("document.querySelector('[data-drop-action=shortcut]').click();true");await sleep(550);
 newShortcut=await run("window.blackClover.listShortcuts().then(x=>x.find(s=>s.target==='"+target+"')||null)");
 assert.ok(newShortcut?.id,'shortcut must actually be persisted');
 console.log(JSON.stringify({ok:true,pinId:newPin.id,shortcutId:newShortcut.id,verifiedRealIPC:true},null,2));
}finally{
 if(newPin?.id)await run("window.blackClover.removePin('"+newPin.id+"')").catch(()=>{});
 if(newShortcut?.id)await run("window.blackClover.removeShortcut('"+newShortcut.id+"')").catch(()=>{});
 ws.close();
}
