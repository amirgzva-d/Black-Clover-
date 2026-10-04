import { emitHostUi } from './HostUiBridge.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const uiTools={
  show_reminders_dashboard:tool('low','Open Maria reminders dashboard on screen so the user can visually review and manage reminders',{type:'object',properties:{},required:[]},async()=>{emitHostUi({type:'ui',action:'open-organizer',tab:'reminders'});return result('show_reminders_dashboard',true,'Reminders dashboard opened');}),
  show_pinned_notes_dashboard:tool('low','Open Maria pinned important-text dashboard on screen',{type:'object',properties:{},required:[]},async()=>{emitHostUi({type:'ui',action:'open-organizer',tab:'notes'});return result('show_pinned_notes_dashboard',true,'Pinned notes dashboard opened');}),
  show_setup_center:tool('low','Open Maria setup and diagnostics center on screen',{type:'object',properties:{},required:[]},async()=>{emitHostUi({type:'ui',action:'open-setup'});return result('show_setup_center',true,'Setup center opened');})
};
