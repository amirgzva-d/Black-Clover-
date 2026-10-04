import { skills } from './SkillStore.js';

const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});

export const learningTools={
  search_learned_skills:tool('read','Search Maria’s persistent procedural skills and researched knowledge for a task she has seen or studied before',schema({query:{type:'string'},limit:{type:'number'}},['query']),async({query,limit=5})=>{
    const items=await skills.recall(query,{limit,includePrivate:true});
    return result('search_learned_skills',true,items.length?'Relevant learned skills found':'No relevant learned skill found',{query,items});
  }),
  learning_status:tool('read','Show how many persistent skills, research notes, and unresolved learning tasks Maria currently has',schema({}),async()=>result('learning_status',true,'Learning status loaded',await skills.stats())),
  teach_skill:tool('low','Teach Maria a reusable procedural skill or workflow explicitly supplied by the user. User-taught workflows are stored as local-private guidance',schema({title:{type:'string'},intent:{type:'string'},triggers:{type:'array',items:{type:'string'}},steps:{type:'array',items:{type:'object'}}},['intent']),async payload=>{
    const item=await skills.teach(payload);
    return result('teach_skill',true,'Skill saved locally for future use',{id:item.id,title:item.title,intent:item.intent,private:true});
  }),
  forget_learned_skill:tool('sensitive','Delete one learned procedural skill from Maria’s own skill store. This does not delete user files',schema({id:{type:'string'}},['id']),async({id})=>{
    const ok=await skills.forget(id);
    return result('forget_learned_skill',ok,ok?'Learned skill removed':'Skill not found',{id});
  })
};
