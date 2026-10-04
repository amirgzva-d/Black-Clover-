const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
async function show(event){try{const { BrowserWindow }=await import('electron');const windows=BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed());const win=windows[0];if(!win)return false;if(win.isMinimized())win.restore();win.show();win.focus();win.webContents.send('agent:event',event);return true;}catch{return false;}}
export const uiTools={
  show_reminders_dashboard:tool('low','Open Maria reminders dashboard on screen so the user can visually review and manage reminders',{type:'object',properties:{},required:[]},async()=>{const ok=await show({type:'ui',action:'open-organizer',tab:'reminders'});return result('show_reminders_dashboard',ok,ok?'Reminders dashboard opened':'Maria window is unavailable');}),
  show_pinned_notes_dashboard:tool('low','Open Maria pinned important-text dashboard on screen',{type:'object',properties:{},required:[]},async()=>{const ok=await show({type:'ui',action:'open-organizer',tab:'notes'});return result('show_pinned_notes_dashboard',ok,ok?'Pinned notes dashboard opened':'Maria window is unavailable');}),
  show_setup_center:tool('low','Open Maria setup and diagnostics center on screen',{type:'object',properties:{},required:[]},async()=>{const ok=await show({type:'ui',action:'open-setup'});return result('show_setup_center',ok,ok?'Setup center opened':'Maria window is unavailable');})
};
