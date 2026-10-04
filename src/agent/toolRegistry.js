import { tools as coreTools } from './tools.js';
import { powerTools } from './powerTools.js';
import { researchTools } from './researchTools.js';
import { memoryTools } from './memoryTools.js';
import { automationTools } from './automationTools.js';
import { codingTools } from './codingTools.js';
import { schedulerTools } from './schedulerTools.js';
import { policyTools } from './policyTools.js';
import { nativeWindowsTools } from './nativeWindowsTools.js';
import { visionTools } from './visionTools.js';

export const tools=Object.freeze({...coreTools,...powerTools,...researchTools,...memoryTools,...automationTools,...codingTools,...schedulerTools,...policyTools,...nativeWindowsTools,...visionTools});
export function ollamaTools(names=null){const allow=Array.isArray(names)?new Set(names):null;return Object.entries(tools).filter(([name])=>allow===null||allow.has(name)).map(([name,t])=>({type:'function',function:{name,description:t.description,parameters:t.schema}}));}
export async function runTool(name,args={}){const t=tools[name];if(!t)throw new Error(`Unknown tool: ${name}`);return t.run(args);}
