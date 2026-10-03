import { tools as coreTools } from './tools.js';
import { powerTools } from './powerTools.js';
import { researchTools } from './researchTools.js';
import { memoryTools } from './memoryTools.js';

export const tools = Object.freeze({ ...coreTools, ...powerTools, ...researchTools, ...memoryTools });

export function ollamaTools(){
  return Object.entries(tools).map(([name,t])=>({
    type:'function',
    function:{name,description:t.description,parameters:t.schema}
  }));
}

export async function runTool(name,args={}){
  const t=tools[name];
  if(!t) throw new Error(`Unknown tool: ${name}`);
  return t.run(args);
}
