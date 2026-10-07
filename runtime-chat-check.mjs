import {Agent} from './src/agent/Agent.js';
const a=new Agent({enableScheduler:false});
for (const q of ['سلام ماریا، امروز چطوری؟','پایتخت ژاپن کجاست؟']) {
 const t=Date.now(); const r=await a.chat(q);
 console.log(JSON.stringify({q,ms:Date.now()-t,text:r.text,brain:r.brain,direct:r.direct}));
}
process.exit(0);
