import { memory } from './MemoryStore.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const memoryTools={
  remember_fact:tool('low','Remember an important user preference, fact, plan or recurring detail for future conversations',{type:'object',properties:{text:{type:'string'},kind:{type:'string'},importance:{type:'number'}},required:['text']},async({text,kind='fact',importance=.75})=>{const item=await memory.remember(text,{kind,importance:Math.max(0,Math.min(Number(importance)||.75,1)),source:'agent'});return result('remember_fact',Boolean(item),item?'Saved to local memory':'Nothing saved',item);}),
  recall_memory:tool('read','Recall relevant long-term memories about the user or ongoing plans',{type:'object',properties:{query:{type:'string'},limit:{type:'number'}},required:['query']},async({query,limit=6})=>result('recall_memory',true,'Relevant memories recalled',await memory.recall(query,{limit:Math.max(1,Math.min(Number(limit)||6,12))}))),
  list_recent_memories:tool('read','List recent long-term memories',{type:'object',properties:{limit:{type:'number'}},required:[]},async({limit=20})=>result('list_recent_memories',true,'Recent memories listed',await memory.list(limit)))
};
