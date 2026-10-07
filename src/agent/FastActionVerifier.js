const wait=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s??'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens=s=>norm(s).split(/\s+/).filter(x=>x.length>=2);
const near=(a,b,tolerance=2)=>Math.abs(Number(a)-Number(b))<=tolerance;

function matchApp(data,needles){
  const hay=norm(JSON.stringify(data||[]));
  const ts=[...new Set(needles.flatMap(tokens))].filter(x=>!['google','microsoft','adobe','app','application'].includes(x));
  return ts.some(t=>hay.includes(t));
}

export async function verifyFastAction(command,out,runTool){
  const name=command?.name,args=command?.args||{};
  if(out?.success===false)return {verified:false,reason:out?.error||out?.message||'tool-failed'};
  try{
    if(name==='set_volume'){
      const r=await runTool('get_volume',{}),actual=r?.data?.percent;
      return {verified:r?.success!==false&&Number.isFinite(actual)&&near(actual,args.percent,1),expected:args.percent,actual};
    }
    if(name==='set_brightness'){
      const r=await runTool('get_brightness',{}),actual=r?.data?.percent;
      return {verified:near(actual,args.percent,2),expected:args.percent,actual};
    }
    if(name==='set_mute'){
      const r=await runTool('get_volume',{}),actual=r?.data?.muted;
      return {verified:r?.success!==false&&typeof actual==='boolean'&&actual===Boolean(args.muted),expected:Boolean(args.muted),actual};
    }
    if(name==='volume_up'||name==='volume_down'){
      const r=await runTool('get_volume',{}),actual=r?.data?.percent,expected=out?.data?.expected;
      return {verified:r?.success!==false&&Number.isFinite(actual)&&Number.isFinite(expected)&&near(actual,expected,1),expected,actual};
    }
    if(name==='launch_any_app'||name==='launch_app'){
      await wait(350);
      const appName=args.name||out?.data?.name||'',target=out?.data?.target||'';
      const r=await runTool('find_running_app',{name:appName,target}).catch(()=>null),verified=Boolean(r?.data?.running);
      return {verified,checked:['find_running_app'],appName,target,matches:r?.data?.items||[]};
    }
    if(name==='open_named_file'||name==='reveal_named_file'){
      const target=out?.data?.path||out?.data?.resolved?.target;
      if(!target)return {verified:null,reason:'no-path-returned'};
      const r=await runTool('file_info',{target}).catch(()=>null);
      return {verified:r?.success!==false&&Boolean(r?.data?.path),target};
    }
    if(name==='open_resource'){
      const target=out?.data?.resolved?.target;
      if(!target)return {verified:null,reason:'no-resolved-target'};
      if(out?.data?.resolved?.kind==='app')return {verified:true,target,kind:'app',basis:'resolver-launch-success'};
      const r=await runTool('file_info',{target}).catch(()=>null);
      return {verified:r?.success!==false&&Boolean(r?.data?.path),target,kind:out?.data?.resolved?.kind};
    }
    if(name==='create_reminder'){
      const r=await runTool('list_reminders',{}).catch(()=>null),hay=norm(JSON.stringify(r?.data||r||{}));
      return {verified:Boolean(args.message)&&hay.includes(norm(args.message)),message:args.message};
    }
    return {verified:null,basis:'tool-success'};
  }catch(error){return {verified:null,reason:error.message};}
}

export const STRICT_VERIFY_TOOLS=new Set(['set_volume','volume_up','volume_down','set_brightness','set_mute','launch_any_app','launch_app','open_named_file','open_resource']);
