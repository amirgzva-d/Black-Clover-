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
import { imageVisionTools } from './imageVisionTools.js';
import { learningTools } from './learningTools.js';
import { storageTools } from './storageTools.js';
import { spreadsheetTools } from './spreadsheetTools.js';
import { messengerSupportTools } from './messengerSupportTools.js';
import { noteTools } from './noteTools.js';
import { mediaTools } from './mediaTools.js';
import { wellbeingTools } from './wellbeingTools.js';
import { vaultTools } from './vaultTools.js';
import { selfDevTools } from './selfDevTools.js';
import { uiTools } from './uiTools.js';

export const tools=Object.freeze({...coreTools,...powerTools,...researchTools,...memoryTools,...automationTools,...codingTools,...schedulerTools,...policyTools,...nativeWindowsTools,...visionTools,...imageVisionTools,...learningTools,...storageTools,...spreadsheetTools,...messengerSupportTools,...noteTools,...mediaTools,...wellbeingTools,...vaultTools,...selfDevTools,...uiTools});
export function ollamaTools(names=null){const allow=Array.isArray(names)?new Set(names):null;return Object.entries(tools).filter(([name])=>allow===null||allow.has(name)).map(([name,t])=>({type:'function',function:{name,description:t.description,parameters:t.schema}}));}
export async function runTool(name,args={}){const t=tools[name];if(!t)throw new Error(`Unknown tool: ${name}`);return t.run(args);}
