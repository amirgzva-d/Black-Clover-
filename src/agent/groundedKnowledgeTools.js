import { OllamaClient } from './OllamaClient.js';
import { researchTools } from './researchTools.js';

const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();

async function gather(query){
  const multi=await researchTools.research_topic.run({query,sources:3});
  if(multi?.success&&multi?.data?.sources?.length)return multi.data.sources.map((s,i)=>`SOURCE ${i+1}: ${s.title}\nURL: ${s.url}\n${String(s.text||s.snippet||'').slice(0,4500)}`).join('\n\n');
  const wiki=await researchTools.wikipedia_search.run({query,limit:4});
  if(wiki?.success&&wiki?.data?.results?.length)return wiki.data.results.map((s,i)=>`SOURCE ${i+1}: ${s.title}\nURL: ${s.url}\n${s.snippet}`).join('\n\n');
  return '';
}

export const groundedKnowledgeTools={
  grounded_factual_answer:tool('read','Answer a factual/general-knowledge question from live retrieved evidence instead of guessing from model memory',schema({query:{type:'string'}},['query']),async({query})=>{
    const evidence=await gather(query);
    if(!evidence)return result('grounded_factual_answer',false,'No public evidence could be retrieved');
    const client=new OllamaClient({model:process.env.BLACK_CLOVER_MODEL||'qwen2.5:3b',numCtx:4096,numPredict:320,temperature:.18,think:false,timeoutMs:60000,keepAlive:'15m'});
    try{
      const out=await client.chat([
        {role:'system',content:'Answer in natural concise Persian. Use ONLY the supplied evidence. Never invent a fact. If evidence is insufficient, say اطلاعات کافی پیدا نکردم. Do not show chain-of-thought.'},
        {role:'user',content:`QUESTION: ${query}\n\nEVIDENCE:\n${evidence}`}
      ],[]);
      const answer=clean(out?.message?.content);
      if(!answer)return result('grounded_factual_answer',false,'Grounded model returned no final answer');
      return result('grounded_factual_answer',true,answer,{query,answer,evidenceUsed:true});
    }catch(error){return result('grounded_factual_answer',false,error.message||String(error));}
  })
};
