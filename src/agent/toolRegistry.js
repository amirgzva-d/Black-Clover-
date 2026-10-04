import { tools as coreTools } from './tools.js';
import { powerTools } from './powerTools.js';
import { researchTools } from './researchTools.js';
import { memoryTools } from './memoryTools.js';
import { automationTools } from './automationTools.js';
import { codingTools } from './codingTools.js';
import { codingWorkspaceTools } from './codingWorkspaceTools.js';
import { schedulerTools } from './schedulerTools.js';
import { policyTools } from './policyTools.js';
import { nativeWindowsTools } from './nativeWindowsTools.js';
import { windowsAdvancedTools } from './windowsAdvancedTools.js';
import { visionTools } from './visionTools.js';
import { learningTools } from './learningTools.js';
import { storageTools } from './storageTools.js';
import { spreadsheetTools } from './spreadsheetTools.js';
import { messengerSupportTools } from './messengerSupportTools.js';
import { noteTools } from './noteTools.js';
import { wellbeingTools } from './wellbeingTools.js';

export const tools=Object.freeze({...coreTools,...powerTools,...researchTools,...memoryTools,...automationTools,...codingTools,...codingWorkspaceTools,...schedulerTools,...policyTools,...nativeWindowsTools,...windowsAdvancedTools,...visionTools,...learningTools,...storageTools,...spreadsheetTools,...messengerSupportTools,...noteTools,...wellbeingTools});
export function ollamaTools(names=null){const allow=Array.isArray(names)?new Set(names):null;return Object.entries(tools).filter(([name])=>allow===null||allow.has(name)).map(([name,t])=>({type:'function',function:{name,description:t.description,parameters:t.schema}}));}
export async function runTool(name,args={}){const t=tools[name];if(!t)throw new Error(`Unknown tool: ${name}`);return t.run(args);}
