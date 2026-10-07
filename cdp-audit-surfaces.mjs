import fs from 'node:fs';
async function pages(){return await (await fetch('http://127.0.0.1:9223/json')).json();}
async function rpc(p,method,params={}){const ws=new WebSocket(p.webSocketDebuggerUrl);await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});const id=1;const out=await new Promise((ok,fail)=>{const t=setTimeout(()=>fail(new Error('timeout')),10000);ws.onmessage=e=>{const j=JSON.parse(e.data);if(j.id===id){clearTimeout(t);ok(j);}};ws.send(JSON.stringify({id,method,params}));});ws.close();return out;}
async function evalOn(p,expr){const x=await rpc(p,'Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});return x.result?.result?.value;}
const ps=await pages();const results={};
for(const surface of ['motions','wardrobe']){
 const p=ps.find(x=>x.url.includes('surface='+surface));if(!p)continue;
 results[surface]={};
 const tabs=await evalOn(p,"[...document.querySelectorAll('[data-tab]')].map(b=>b.dataset.tab)");
 for(const tab of tabs){
  const expr="(async()=>{document.querySelector('[data-tab=\""+tab+"\"]').click();await new Promise(r=>setTimeout(r,80));return {rows:document.querySelectorAll('.library-row:not([hidden])').length,previews:document.querySelectorAll('.preview-library figure:not([hidden])').length,materials:document.querySelectorAll('.material-grid article:not([hidden])').length,text:document.querySelector('.asset-content')?.innerText.slice(0,500)}})()";
  results[surface][tab]=await evalOn(p,expr);
 }
 const shot=await rpc(p,'Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 fs.writeFileSync('C:/Users/cibesabz/Desktop/maria-'+surface+'-page.png',Buffer.from(shot.result.data,'base64'));
}
const avatar=ps.find(x=>x.url.includes('surface=avatar'));if(avatar){const shot=await rpc(avatar,'Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync('C:/Users/cibesabz/Desktop/maria-avatar-page.png',Buffer.from(shot.result.data,'base64'));}
console.log(JSON.stringify(results,null,2));