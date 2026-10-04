import { searchActionBook,actionBookStatus } from './ActionBook.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});

export const actionBookTools={
  search_action_book:tool('read','Search Maria’s built-in action book for proven Windows/browser/Office/Adobe/messaging/coding workflows before improvising. The book complements learned skills and can guide multi-step execution.',schema({query:{type:'string'},limit:{type:'number'}},['query']),async({query,limit=8})=>{const items=searchActionBook(query,{limit});return result('search_action_book',true,items.length?'Action recipes found':'No close built-in recipe found',{query,items});}),
  action_book_status:tool('read','Show the size of Maria’s built-in action recipe book',schema({}),async()=>result('action_book_status',true,'Action book status loaded',actionBookStatus()))
};
