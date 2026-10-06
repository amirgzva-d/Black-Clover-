import path from 'node:path';

const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const stem=s=>norm(path.basename(String(s||''),path.extname(String(s||''))));
const words=s=>[...new Set(norm(s).split(/\s+/).filter(x=>x.length>1))];
const ignoredPath=/(\\|\/)(node_modules|\.git|windows\\winsxs|appdata\\local\\temp|\$recycle\.bin)(\\|\/)/i;

export function scoreFileCandidate(item,{query='',extensions=[],pathHint='',kind='file'}={}){
  const wanted=norm(query),wantedStem=stem(query),name=norm(item?.name||path.basename(item?.path||'')),nameStem=stem(item?.name||item?.path||''),full=norm(item?.path||''),hint=norm(pathHint);
  let score=0;
  if(name===wanted)score+=140;
  if(nameStem===wantedStem&&wantedStem)score+=125;
  if(name.startsWith(wanted)&&wanted)score+=72;
  if(nameStem.startsWith(wantedStem)&&wantedStem)score+=68;
  if(name.includes(wanted)&&wanted)score+=42;
  const qWords=words(wantedStem),nWords=words(nameStem),shared=qWords.filter(w=>nWords.includes(w)).length;
  if(qWords.length)score+=Math.round((shared/qWords.length)*46);
  if(hint){if(full.includes(hint))score+=90;else for(const w of words(hint))if(full.includes(w))score+=16;}
  const ext=String(item?.extension||path.extname(item?.path||'')).replace(/^\./,'').toLowerCase(),wantedExt=String(path.extname(query)||'').replace(/^\./,'').toLowerCase(),allowed=(extensions||[]).map(x=>String(x).replace(/^\./,'').toLowerCase());
  if(wantedExt&&ext===wantedExt)score+=45;
  if(allowed.length&&allowed.includes(ext))score+=30;
  if(kind==='folder'&&item?.type==='directory')score+=20;
  if(kind==='file'&&item?.type==='file')score+=20;
  if(ignoredPath.test(String(item?.path||'')))score-=80;
  const modified=Date.parse(item?.modified||'');if(Number.isFinite(modified)){const days=Math.max(0,(Date.now()-modified)/86400000);score+=Math.max(0,12-Math.log2(days+1)*2);}
  score-=Math.min(18,String(item?.path||'').split(/[\\/]/).length*.35);
  return score;
}

export function rankFileCandidates(items,options={}){
  return (items||[]).map(item=>({...item,_matchScore:scoreFileCandidate(item,options)})).sort((a,b)=>b._matchScore-a._matchScore||String(a.path).length-String(b.path).length);
}

export function bestFileCandidate(items,options={}){
  const ranked=rankFileCandidates(items,options),best=ranked[0]||null,second=ranked[1]||null;
  const ambiguous=Boolean(best&&second&&best._matchScore-second._matchScore<8&&best._matchScore<120);
  return {best,ranked,ambiguous};
}
