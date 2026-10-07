import {runTool} from './src/agent/toolRegistry.js';
const r=await runTool('global_find_files',{query:'runtime-smoke-windows.mjs',limit:20});
console.log(JSON.stringify(r,null,2)); process.exit(0);