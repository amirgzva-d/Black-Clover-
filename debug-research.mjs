import {runTool} from './src/agent/toolRegistry.js';
const r=await runTool('research_topic',{query:'پایتخت ژاپن کجاست؟',sources:2});
console.log(JSON.stringify(r,null,2));
