import { pinnedNotes } from './PinnedNoteStore.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const noteTools={
  create_pinned_note:tool('low','Create a durable important note/prompt that remains after restart and can be shown in Maria notes panel',{type:'object',properties:{title:{type:'string'},text:{type:'string'},tags:{type:'array',items:{type:'string'}},pinned:{type:'boolean'}},required:['text']},async args=>result('create_pinned_note',true,'Pinned note saved',await pinnedNotes.create(args))),
  list_pinned_notes:tool('read','List or search durable important notes and pinned prompts',{type:'object',properties:{query:{type:'string'},limit:{type:'number'},pinned_only:{type:'boolean'}},required:[]},async({query='',limit=100,pinned_only=false})=>result('list_pinned_notes',true,'Pinned notes listed',await pinnedNotes.list({query,limit,pinnedOnly:pinned_only}))),
  update_pinned_note:tool('low','Edit or pin/unpin a durable note',{type:'object',properties:{id:{type:'string'},title:{type:'string'},text:{type:'string'},tags:{type:'array',items:{type:'string'}},pinned:{type:'boolean'}},required:['id']},async({id,...changes})=>{const x=await pinnedNotes.update(id,changes);return result('update_pinned_note',Boolean(x),x?'Pinned note updated':'Note not found',x);}),
  delete_pinned_note:tool('critical','Delete one durable pinned note by id',{type:'object',properties:{id:{type:'string'}},required:['id']},async({id})=>{const ok=await pinnedNotes.remove(id);return result('delete_pinned_note',ok,ok?'Pinned note deleted':'Note not found',{id});})
};
