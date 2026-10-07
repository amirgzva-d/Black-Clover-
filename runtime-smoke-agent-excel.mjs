import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Agent} from './src/agent/Agent.js';
import {runTool} from './src/agent/toolRegistry.js';
const exec=promisify(execFile),root=path.join(os.tmpdir(),'maria-agent-excel-'+Date.now()),file=path.join(root,'agent-test.xlsx');
await fs.mkdir(root,{recursive:true});
await exec('py.exe',['-3','-c',"from openpyxl import Workbook;import sys;w=Workbook();s=w.active;s.title='Sales';s['A1']='Name';s['B1']='Value';s['A2']='Ali';s['B2']=10;w.save(sys.argv[1])",file],{windowsHide:true});
const a=new Agent(),prompt=`در فایل ${file} شیت Sales سلول B2 رو به 42 تغییر بده و بعد بررسی کن که ذخیره شده`;
const t=Date.now();console.log('START',prompt);
let r=await a.chat(prompt);console.log('FIRST_MS',Date.now()-t);console.log('FIRST',JSON.stringify(r,null,2));
if(r.requiresConfirmation&&r.confirmationId){const t2=Date.now();r=await a.confirm({id:r.confirmationId,approved:true});console.log('CONFIRM_MS',Date.now()-t2);console.log('CONFIRMED',JSON.stringify(r,null,2));}
const check=await runTool('excel_read_range',{file,sheet:'Sales',range:'A1:B3'});const b2=check.data?.cells?.find?.(x=>x.address==='B2')?.value;
console.log('VERIFY',JSON.stringify({b2,ok:Number(b2)===42},null,2));
await fs.rm(root,{recursive:true,force:true}).catch(()=>{});
process.exit(Number(b2)===42?0:2);