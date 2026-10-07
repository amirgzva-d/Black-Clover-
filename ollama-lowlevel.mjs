const c=new AbortController();setTimeout(()=>c.abort(),20000);
console.log('starting',Date.now());
try{
  const r=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'qwen2.5:1.5b',messages:[{role:'user',content:'سلام'}],stream:true,options:{num_predict:16}}),signal:c.signal});
  console.log('headers',r.status,Date.now());
  const reader=r.body.getReader(),decoder=new TextDecoder();
  while(true){const x=await reader.read();if(x.done)break;console.log('chunk',decoder.decode(x.value,{stream:true}));}
  console.log('done',Date.now());
}catch(e){console.log('error',e.name,e.message,Date.now());}
