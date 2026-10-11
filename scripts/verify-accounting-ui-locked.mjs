import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const project=process.cwd();
const normalize=raw=>raw.replace(/\r\n/g,'\n');
const original=file=>normalize(execFileSync('git',['show','HEAD:'+file],{cwd:project,encoding:'utf8'}));
const current=file=>normalize(fs.readFileSync(file,'utf8'));
function part(txt){
 const header='<header class="v4-topbar">';
 const start=txt.indexOf(header),end=txt.indexOf('</header>',start);
 if(start<0||end<0)throw Error('Top Island header not found');
 return txt.slice(start,end+9);
}
const was=part(original('src/renderer/topIslandV4.js'));
const now=part(current('src/renderer/topIslandV4.js'));
const a=original('src/renderer/topIslandV4.css').trimEnd();
const b=current('src/renderer/topIslandV4.css');
const result={
 headerIdentical:was===now,headerBytesWas:was.length,headerBytesNow:now.length,
 cssPrefixIdentical:b.startsWith(a),originalCssBytes:a.length,currentCssBytes:b.length
};
if(!result.headerIdentical){
 let n=0;for(;n<Math.min(was.length,now.length);n++)if(was[n]!==now[n])break;
 result.headerFirstDifference={offset:n,old:JSON.stringify(was.slice(n,n+70)),new:JSON.stringify(now.slice(n,n+70))};
}
if(!result.cssPrefixIdentical){
 let n=0;for(;n<Math.min(a.length,b.length);n++)if(a[n]!==b[n])break;
 result.cssFirstDifference={offset:n,old:JSON.stringify(a.slice(n,n+70)),new:JSON.stringify(b.slice(n,n+70))};
}
console.log(JSON.stringify(result,null,2));
if(!result.headerIdentical||!result.cssPrefixIdentical)process.exitCode=1;
