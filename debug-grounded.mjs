import {runTool} from './src/agent/toolRegistry.js';
const t=Date.now(); const r=await runTool('grounded_factual_answer',{query:'پایتخت ژاپن کجاست؟'});
console.log(JSON.stringify({ms:Date.now()-t,success:r.success,message:r.message,data:r.data},null,2)); process.exit(0);
