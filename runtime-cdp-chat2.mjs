const port=49848;
async function pages(){return await (await fetch('http://127.0.0.1:'+port+'/json')).json();}
async function rpc(p,method,params={}){const ws=new WebSocket(p.webSocketDebuggerUrl);await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});const id=1;const out=await new Promise((ok,fail)=>{const t=setTimeout(()=>fail(new Error('timeout')),15000);ws.onmessage=e=>{const j=JSON.parse(e.data);if(j.id===id){clearTimeout(t);ok(j);}};ws.send(JSON.stringify({id,method,params}));});ws.close();return out;}
async function evalOn(p,expression){const x=await rpc(p,'Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});return x.result?.result?.value;}
let ps=await pages();const avatar=ps.find(x=>x.url.includes('surface=avatar'));if(!avatar)throw new Error('avatar page missing');
await evalOn(avatar,'window.blackClover.showChat()');
await new Promise(r=>setTimeout(r,1200));
ps=await pages();const chat=ps.find(x=>x.url.includes('surface=chat'));if(!chat)throw new Error('chat page missing');
await evalOn(chat,"(()=>{const i=document.querySelector('#input');i.value='یک داستان کوتاه درباره یک گربه بنویس';document.querySelector('#form').requestSubmit();return true})()");
await new Promise(r=>setTimeout(r,25000));
const state=await evalOn(chat,"({messages:document.querySelector('#messages')?.innerText,activity:document.querySelector('#activity')?.innerText,status:document.querySelector('#status')?.innerText})");
console.log(JSON.stringify(state));
