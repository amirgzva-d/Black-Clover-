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
      return {verified:near(actual,args.percent,1),expected:args.percent,actual};
    }
    if(name==='set_brightness'){
      const r=await runTool('get_brightness',{}),actual=r?.data?.percent;
      return {verified:near(actual,args.percent,2),expected:args.percent,actual};
    }
    if(name==='set_mute'){
      const r=await runTool('get_volume',{}),actual=Boolean(r?.data?.muted);
      return {verified:actual===Boolean(args.muted),expected:Boolean(args.muted),actual};
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
    if(name==='chrome_search'){
      const url=String(out?.data?.url||''),role=String(out?.data?.profileRole||'');
      const verified=/google\.[^/]+\/search\?q=/i.test(url)&&role==='personal';
      return {verified,url,profile:out?.data?.profile,profileRole:role,query:args.query||out?.data?.query||'',reason:verified?'google-results-personal-profile':'wrong-search-url-or-profile'};
    }
    if(name==='chrome_open_service'){
      const service=String(args.service||out?.data?.service||'').toLowerCase(),role=String(out?.data?.profileRole||'');
      const business=['whatsapp','rubika'].includes(service),verified=business?role==='business':role!=='business';
      return {verified,service,profile:out?.data?.profile,profileRole:role,reason:verified?'expected-service-profile':'wrong-service-profile'};
    }
    if(name==='create_reminder'){
      const r=await runTool('list_reminders',{}).catch(()=>null),hay=norm(JSON.stringify(r?.data||r||{}));
      return {verified:Boolean(args.message)&&hay.includes(norm(args.message)),message:args.message};
    }
    return {verified:null,basis:'tool-success'};
  }catch(error){return {verified:null,reason:error.message};}
}

export const STRICT_VERIFY_TOOLS=new Set(['set_volume','set_brightness','set_mute','launch_any_app','launch_app','open_named_file','open_resource','chrome_search','chrome_open_service']);
