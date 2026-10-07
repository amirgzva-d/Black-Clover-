export class ToolVerifier {
  async verify({name,args={},result}={}) {
    if(!result?.success)return {ok:false,verified:false,reason:result?.error||'tool failed'};

    const data=result.data||result.raw?.data||{};
    if(name==='chrome_search') {
      const url=String(data.url||'');
      const query=String(args.query||data.query||'').trim();
      const urlOk=/google\.[^/]+\/search\?q=/i.test(url);
      const profileOk=data.profileRole!=='business';
      return {
        ok:urlOk&&profileOk,
        verified:urlOk&&profileOk,
        reason:urlOk&&profileOk?'Google results URL opened in personal profile':'Chrome search postcondition failed',
        evidence:{url,profile:data.profile,profileRole:data.profileRole,query}
      };
    }

    if(name==='chrome_open_service') {
      const service=String(args.service||data.service||'').toLowerCase();
      const shouldBusiness=['whatsapp','rubika'].includes(service);
      const profileOk=shouldBusiness?data.profileRole==='business':data.profileRole!=='business';
      return {
        ok:profileOk,
        verified:profileOk,
        reason:profileOk?'Service opened in expected Chrome profile':'Wrong Chrome profile',
        evidence:{service,profile:data.profile,profileRole:data.profileRole}
      };
    }

    if(name==='global_find_files') {
      const items=Array.isArray(data)?data:Array.isArray(data.items)?data.items:[];
      const ok=items.length>0;
      return {ok,verified:ok,reason:ok?'Matching filesystem results found':'No matching files found',evidence:{count:items.length}};
    }

    if(name==='open_named_file'||name==='open_file') {
      const path=String(data.path||data.file||data.filePath||'');
      return {ok:true,verified:Boolean(path),reason:path?'Opened file has a resolved path':'Tool reported success but file/window path was not returned',evidence:path?{path}:{}};
    }

    return {ok:true,verified:false,reason:'Tool succeeded; no specialized postcondition is registered yet'};
  }
}
