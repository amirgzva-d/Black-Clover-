import { runTool } from '../toolRegistry.js';
import { permissions } from '../PermissionPolicy.js';
import { ToolManifest } from './ToolManifest.js';
import { toolResult } from './ToolResult.js';

const timeout=(promise,ms)=>Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tool execution timeout')),ms))
]);

export class ToolExecutor {
  constructor({manifest=new ToolManifest(),runner=runTool,permissionPolicy=permissions,timeoutMs=30000,maxRetries=1}={}) {
    this.manifest=manifest;
    this.runner=runner;
    this.permissions=permissionPolicy;
    this.timeoutMs=Math.max(1000,Number(timeoutMs)||30000);
    this.maxRetries=Math.max(0,Number(maxRetries)||0);
  }

  async execute(name,args={},context=null,{approved=false}={}) {
    const meta=this.manifest.get(name);
    if(!meta)return toolResult({name,args,error:new Error('Unknown tool'),status:'failed'});

    const protectedMatch=await this.permissions.protectedMatch(name,args);
    if(protectedMatch)return toolResult({name,args,error:new Error('Protected resource: '+protectedMatch.label),status:'blocked'});

    if(!approved&&await this.permissions.shouldConfirm(name,this.manifest.registry[name],args)) {
      return toolResult({name,args,status:'needs_confirmation',raw:{success:false,message:'Confirmation required'}});
    }

    const retryable=meta.risk==='read'||meta.risk==='low';
    const attempts=retryable?this.maxRetries+1:1;
    let last=null;

    for(let attempt=0;attempt<attempts;attempt++) {
      const started=Date.now();
      try {
        await this.permissions.assertAllowed(name,args);
        const raw=await timeout(Promise.resolve(this.runner(name,args)),this.timeoutMs);
        last=toolResult({name,args,raw,durationMs:Date.now()-started,attempt});
        if(last.success)return last;
        if(!['timeout','transient'].includes(last.errorClass))return last;
      } catch(error) {
        last=toolResult({name,args,error,durationMs:Date.now()-started,attempt,status:'failed'});
        if(!['timeout','transient'].includes(last.errorClass))return last;
      }
    }
    return last;
  }
}
