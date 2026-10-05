import { researchTools } from './researchTools.js';
import { groundedKnowledgeAnswer } from './GroundedKnowledge.js';

const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});

const runResearchTool=async(name,args)=>{
  const entry=researchTools[name];
  if(!entry?.run)throw new Error(`Unknown research tool: ${name}`);
  return entry.run(args||{});
};

export const groundedKnowledgeTools={
  grounded_factual_answer:tool('read','Answer a factual/general-knowledge question directly from live retrieved evidence without trusting local-model memory',schema({query:{type:'string'}},['query']),async({query})=>{
    try{
      const grounded=await groundedKnowledgeAnswer(query,{runTool:runResearchTool});
      if(!grounded?.answer)return result('grounded_factual_answer',false,'No public evidence could be retrieved');
      return result('grounded_factual_answer',true,grounded.answer,{query,answer:grounded.answer,sources:grounded.sources,evidenceUsed:true});
    }catch(error){return result('grounded_factual_answer',false,error.message||String(error));}
  })
};
