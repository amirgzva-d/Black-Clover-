import { pinnedNotes } from './PinnedNoteStore.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const noteTools={
  create_pinned_note:tool('low','Create a durable pinned note that survives app and Windows restarts',{type:'object',properties:{title:{type:'string'},text:{type:'string'},tags:{type:'array',items:{type:'string'}}},required:['text']},async({title='',text,tags=[]})=>result('create_pinned_note',true,'Pinned note created',await pinnedNotes.create({title,text,tags,pinned:true}))),
  list_pinned_notes:tool('read','List durable active pinned notes',{type:'object',properties:{limit:{type:'number'}},required:[]},async({limit=100})=>result('list_pinned_notes',true,'Pinned notes listed',await pinnedNotes.list({limit}))),
  search_pinned_notes:tool('read','Search durable pinned notes by text, title or tag',{type:'object',properties:{query:{type:'string'},limit:{type:'number'}},required:['query']},async({query,limit=30})=>result('search_pinned_notes',true,'Pinned notes searched',await pinnedNotes.search(query,{limit}))),
  update_pinned_note:tool('low','Edit, pin/unpin or archive a durable pinned note',{type:'object',properties:{id:{type:'string'},title:{type:'string'},text:{type:'string'},pinned:{type:'boolean'},archived:{type:'boolean'},tags:{type:'array',items:{type:'string'}}},required:['id']},async({id,...patch})=>{const x=await pinnedNotes.update(id,patch);return result('update_pinned_note',Boolean(x),x?'Pinned note updated':'Pinned note not found',x);}),
  remove_pinned_note:tool('sensitive','Permanently remove a pinned note by id',{type:'object',properties:{id:{type:'string'}},required:['id']},async({id})=>{const ok=await pinnedNotes.remove(id);return result('remove_pinned_note',ok,ok?'Pinned note removed':'Pinned note not found',{id});})
};
