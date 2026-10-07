import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const safeError=s=>clean(s).replace(/(?:sk-[A-Za-z0-9_-]{8,}|api[_ -]?key\s*[:=]\s*\S+|token\s*[:=]\s*\S+|password\s*[:=]\s*\S+)/gi,'[REDACTED]').slice(0,700);

export class IncidentStore{
  constructor({directory=defaultDir(),limit=250}={}){this.directory=directory;this.file=path.join(directory,'failure-reports.json');this.limit=limit;}
  async load(){try{const x=JSON.parse(await fs.readFile(this.file,'utf8'));return Array.isArray(x)?x:[];}catch(e){if(e.code!=='ENOENT')console.warn('Incident store load failed:',e.message);return[];}}
  async save(items){await fs.mkdir(this.directory,{recursive:true});const tmp=this.file+'.tmp';await fs.writeFile(tmp,JSON.stringify(items.slice(-this.limit),null,2),'utf8');await fs.rename(tmp,this.file);}
  async record({kind='runtime',phase='',error='',tool='',input='',privateContext=false,model='',details={}}={}){
    const items=await this.load(),rawInput=clean(input),id=crypto.randomUUID().slice(0,8);
    const item={id,createdAt:new Date().toISOString(),kind,phase:clean(phase).slice(0,80),tool:clean(tool).slice(0,80),error:safeError(error),private:Boolean(privateContext),model:clean(model).slice(0,100),status:'open',input:privateContext?'[private request omitted]':rawInput.slice(0,260),inputHash:rawInput?crypto.createHash('sha256').update(rawInput).digest('hex').slice(0,16):'',details};
    items.push(item);await this.save(items);return item;
  }
  async list({limit=50,status='all'}={}){let items=await this.load();if(status!=='all')items=items.filter(x=>x.status===status);return items.slice(-Math.max(1,Math.min(Number(limit)||50,200))).reverse();}
  async resolve(id,note='fixed'){const items=await this.load(),item=items.find(x=>x.id===String(id));if(!item)return null;item.status='resolved';item.resolvedAt=new Date().toISOString();item.resolution=clean(note).slice(0,300);await this.save(items);return item;}
  async status(){const items=await this.load();return {total:items.length,open:items.filter(x=>x.status!=='resolved').length,resolved:items.filter(x=>x.status==='resolved').length,file:this.file};}
}

export const incidents=new IncidentStore();
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const schema=(properties,required=[])=>({type:'object',properties,required});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
export const incidentTools={
  failure_report_status:tool('read','Show local MARIA failure-report counts. Reports redact secrets and omit private request text.',schema({}),async()=>result('failure_report_status',true,'Failure report status loaded',await incidents.status())),
  list_failure_reports:tool('read','List recent local MARIA failures so bugs and weak answers can be diagnosed without exposing private request text.',schema({limit:{type:'number'},status:{type:'string',enum:['all','open','resolved']}},[]),async({limit=50,status='open'})=>result('list_failure_reports',true,'Failure reports loaded',{items:await incidents.list({limit,status})})),
  resolve_failure_report:tool('low','Mark a local MARIA failure report resolved after the bug has been fixed.',schema({id:{type:'string'},note:{type:'string'}},['id']),async({id,note='fixed'})=>{const item=await incidents.resolve(id,note);return result('resolve_failure_report',Boolean(item),item?'Failure report resolved':'Failure report not found',item);})
};
