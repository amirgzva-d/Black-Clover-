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
import { aiPortalTools } from './aiPortalTools.js';
import { appDiscoveryTools } from './appDiscoveryTools.js';
import { desktopManagementTools } from './desktopManagementTools.js';
import { browserTools } from './browserTools.js';
import { actionBookTools } from './actionBookTools.js';
import { adobeTools } from './adobeTools.js';

const autonomousExtension=pack=>Object.fromEntries(Object.entries(pack).filter(([,t])=>t?.risk==='read'||t?.risk==='low'));
const safeAdvanced=autonomousExtension(windowsAdvancedTools);
const safeNotes=Object.fromEntries(Object.entries(noteTools).filter(([,t])=>t?.risk!=='critical'));
export const tools=Object.freeze({...coreTools,...powerTools,...researchTools,...memoryTools,...automationTools,...codingTools,...codingWorkspaceTools,...schedulerTools,...policyTools,...nativeWindowsTools,...safeAdvanced,...visionTools,...learningTools,...storageTools,...spreadsheetTools,...messengerSupportTools,...safeNotes,...wellbeingTools,...aiPortalTools,...appDiscoveryTools,...desktopManagementTools,...browserTools,...actionBookTools,...adobeTools});
export function ollamaTools(names=null){
  const allow=Array.isArray(names)?new Set(names):null;
  if(allow&&(allow.has('vision_inspect_screen')||allow.has('launch_any_app'))){allow.add('adobe_status');allow.add('photoshop_open_document');allow.add('illustrator_open_document');}
  return Object.entries(tools).filter(([name])=>allow===null||allow.has(name)).map(([name,t])=>({type:'function',function:{name,description:t.description,parameters:t.schema}}));
}
export async function runTool(name,args={}){const t=tools[name];if(!t)throw new Error(`Unknown tool: ${name}`);return t.run(args);}
