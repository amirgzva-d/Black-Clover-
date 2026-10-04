import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const root=()=>process.env.BLACK_CLOVER_SELF_DEV_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover','self-dev','Black-Clover');
const remote='https://github.com/amirgzva-d/Black-Clover-.git';
async function git(args,{cwd=root(),timeout=600000}={}){const {stdout,stderr}=await execFileAsync('git.exe',args,{cwd,windowsHide:true,timeout,maxBuffer:12_000_000});return {stdout:stdout.trim(),stderr:stderr.trim()};}
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function isRepo(){return exists(path.join(root(),'.git'));}
export const selfDevTools={
  self_dev_status:tool('read','Inspect Maria’s isolated self-development source workspace. This workspace is separate from the running installed application',{type:'object',properties:{},required:[]},async()=>{const directory=root();if(!await isRepo())return result('self_dev_status',true,'Self-development workspace is not prepared yet',{directory,prepared:false,remote});let branch='',status='';try{branch=(await git(['branch','--show-current'])).stdout;status=(await git(['status','--short','--branch'])).stdout;}catch{}return result('self_dev_status',true,'Self-development workspace inspected',{directory,prepared:true,remote,branch,status});}),
  self_dev_prepare:tool('low','Prepare or refresh an isolated local clone of Maria source code for safe self-improvement work. This does not change the running installed app',{type:'object',properties:{},required:[]},async()=>{const directory=root();await fs.mkdir(path.dirname(directory),{recursive:true});if(!await isRepo()){await execFileAsync('git.exe',['clone','--filter=blob:none',remote,directory],{windowsHide:false,timeout:1800000,maxBuffer:16_000_000});}else{await git(['fetch','origin','main'],{timeout:600000});}return result('self_dev_prepare',true,'Self-development workspace prepared',{directory,remote});}),
  self_dev_reset_to_main:tool('sensitive','Reset only Maria isolated self-development workspace to origin/main, discarding uncommitted experimental changes. It never touches the installed running app',{type:'object',properties:{},required:[]},async()=>{if(!await isRepo())throw new Error('Self-development workspace is not prepared');await git(['fetch','origin','main']);await git(['switch','main']);await git(['reset','--hard','origin/main']);return result('self_dev_reset_to_main',true,'Self-development workspace reset',{directory:root()});}),
  self_dev_workspace:tool('read','Return the isolated Maria source workspace path so the coding-agent tools can inspect, patch, test and build it',{type:'object',properties:{},required:[]},async()=>result('self_dev_workspace',await isRepo(),await isRepo()?'Self-development workspace ready':'Prepare self-development workspace first',{directory:root(),prepared:await isRepo()}))
};
