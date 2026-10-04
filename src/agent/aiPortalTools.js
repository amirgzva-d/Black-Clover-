import { spawn } from 'node:child_process';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const PORTALS={chatgpt:'https://chatgpt.com/',claude:'https://claude.ai/',qwen:'https://chat.qwen.ai/',deepseek:'https://chat.deepseek.com/'};
const configured=()=>({qwen:Boolean((process.env.DASHSCOPE_API_KEY||process.env.QWEN_API_KEY)&&process.env.QWEN_BASE_URL),deepseek:Boolean(process.env.DEEPSEEK_API_KEY),openai:Boolean(process.env.OPENAI_API_KEY),anthropic:Boolean(process.env.ANTHROPIC_API_KEY),generic:Boolean(process.env.BLACK_CLOVER_ONLINE_API_KEY&&process.env.BLACK_CLOVER_ONLINE_BASE_URL&&process.env.BLACK_CLOVER_ONLINE_MODEL)});
export const aiPortalTools={
  ai_provider_status:tool('read','Show which optional online AI API providers are configured without exposing secret keys',{type:'object',properties:{},required:[]},async()=>result('ai_provider_status',true,'AI provider configuration checked',{configured:configured(),localGeneral:process.env.BLACK_CLOVER_MODEL||'qwen3:4b',localCoding:process.env.BLACK_CLOVER_CODING_MODEL||'qwen2.5-coder:3b'})),
  open_ai_portal:tool('low','Open a known AI web app in the default browser. The user stays in control of account login and website terms',{type:'object',properties:{service:{type:'string',enum:Object.keys(PORTALS)}},required:['service']},async({service})=>{const url=PORTALS[String(service).toLowerCase()];if(!url)return result('open_ai_portal',false,'Unknown AI portal');spawn('cmd.exe',['/c','start','',url],{detached:true,windowsHide:true});return result('open_ai_portal',true,'AI web portal opened',{service,url});})
};
