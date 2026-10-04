import { permissions } from './PermissionPolicy.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const policyTools={
  permission_status:tool('read','Read Maria autonomous permission profile and never-delete protections',{type:'object',properties:{},required:[]},async()=>result('permission_status',true,'Permission policy read',await permissions.status())),
  set_permission_profile:tool('sensitive','Set permission profile: autonomous runs non-destructive computer actions without Maria confirmation; balanced/cautious ask more often',{type:'object',properties:{profile:{type:'string',enum:['autonomous','balanced','cautious']}},required:['profile']},async({profile})=>result('set_permission_profile',true,`Permission profile set to ${await permissions.setProfile(profile)}`,await permissions.status())),
  protect_resource:tool('low','Remember a file, folder, application or named resource that must never be deleted/uninstalled',{type:'object',properties:{resource:{type:'string'},note:{type:'string'}},required:['resource']},async({resource,note=''})=>result('protect_resource',true,'Protected from destructive actions',await permissions.protect(resource,{note:note||'user protected'}))),
  unprotect_resource:tool('sensitive','Remove a permanent never-delete protection. This weakens a safety rule and requires confirmation',{type:'object',properties:{resource:{type:'string'}},required:['resource']},async({resource})=>{const changed=await permissions.unprotect(resource);return result('unprotect_resource',changed,changed?'Protection removed':'Protection not found',{resource});})
};
