import { dataVault } from './DataVault.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const vaultTools={
  data_vault_status:tool('read','Show Maria durable-data backup status, tracked stores and optional sync-folder configuration',{type:'object',properties:{},required:[]},async()=>result('data_vault_status',true,'Data vault status read',await dataVault.status())),
  backup_maria_data:tool('low','Create a timestamped local backup of Maria memory, skills, permission rules, reminders and pinned notes',{type:'object',properties:{},required:[]},async()=>result('backup_maria_data',true,'Maria data backup created',await dataVault.backup())),
  configure_data_sync_folder:tool('sensitive','Configure a user-controlled local folder as Maria backup sync target. It can be a folder synced by OneDrive, Dropbox, Google Drive or another cloud client',{type:'object',properties:{directory:{type:'string'}},required:['directory']},async({directory})=>result('configure_data_sync_folder',true,'Maria sync folder configured',await dataVault.setSyncDirectory(directory))),
  sync_maria_data:tool('low','Create a new timestamped backup in the configured sync folder',{type:'object',properties:{},required:[]},async()=>{const x=await dataVault.sync();return result('sync_maria_data',x.ok,x.ok?'Maria data synced to configured folder':x.message,x);})
};
