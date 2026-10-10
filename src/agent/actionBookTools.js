import { searchActionBook,actionBookStatus } from './ActionBook.js';
import { EXTENDED_ACTION_BOOK } from './ActionBookExtended.js';
import { EXTENDED_ACTION_BOOK_2 } from './ActionBookExtended2.js';
import { normalizePersianSurface } from './PersianSurface.js';
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const clean=s=>normalizePersianSurface(s).replace(/[\p{P}\p{S}]+/gu,' ').replace(/\s+/g,' ').trim().toLowerCase();
const words=s=>[...new Set(clean(s).split(' ').filter(x=>x.length>1))];
const ext=[...EXTENDED_ACTION_BOOK,...EXTENDED_ACTION_BOOK_2];
const extSearch=(query,limit)=>{const q=new Set(words(query));return ext.map(x=>{const ws=words([x.title,x.intent,...x.triggers].join(' '));let hit=0;for(const w of ws)if(q.has(w))hit++;return {...x,score:hit/Math.max(1,Math.min(q.size||1,ws.length||1))};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);};
export const searchSemanticActionBook=(query,limit=8)=>{const n=Math.max(1,Math.min(Number(limit)||8,20)),normalized=normalizePersianSurface(query),all=[...searchActionBook(normalized,{limit:n}),...extSearch(normalized,n)];return [...new Map(all.sort((a,b)=>(b.score||0)-(a.score||0)).map(x=>[x.id,x])).values()].slice(0,n);};
export const actionBookTools={
  search_action_book:tool('read','Search Maria’s 250+ built-in semantic action recipes for Windows, files, apps, Chrome/web, Office, messaging, creative tools, coding, media, diagnostics and automation. Match by meaning and context rather than requiring an exact phrase.',schema({query:{type:'string'},limit:{type:'number'}},['query']),async({query,limit=8})=>{const items=searchSemanticActionBook(query,limit);return result('search_action_book',true,items.length?'Action recipes found':'No close built-in recipe found',{query,items});}),
  action_book_status:tool('read','Show the size of Maria’s built-in semantic action recipe book',schema({}),async()=>{const base=actionBookStatus();return result('action_book_status',true,'Action book status loaded',{...base,baseRecipes:base.recipes,extendedRecipes:ext.length,recipes:base.recipes+ext.length,semanticMatching:true});})
};
