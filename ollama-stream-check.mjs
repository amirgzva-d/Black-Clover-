import {OllamaClient} from './src/agent/OllamaClient.js';
const c=new OllamaClient({model:'qwen2.5:1.5b',timeoutMs:90000,numPredict:32});
const chunks=[];
const started=Date.now();
const out=await c.chatStream([{role:'user',content:'سلام، در یک جمله خودت را معرفی کن.'}],[],d=>chunks.push(d));
console.log(JSON.stringify({ms:Date.now()-started,chunks:chunks.length,preview:chunks.slice(0,8),text:out.message.content}));
