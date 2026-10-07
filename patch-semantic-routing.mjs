import fs from 'node:fs';
let p='C:/Users/cibesabz/Black-Clover-Live/src/agent/actionBookTools.js',s=fs.readFileSync(p,'utf8');
if(!s.includes('export const searchSemanticActionBook')){s=s.replace('const mergedSearch=(query,limit=8)=>{','export const searchSemanticActionBook=(query,limit=8)=>{');s=s.replaceAll('mergedSearch(query,limit)','searchSemanticActionBook(query,limit)');}
fs.writeFileSync(p,s);
p='C:/Users/cibesabz/Black-Clover-Live/src/agent/Agent.js';s=fs.readFileSync(p,'utf8');
if(!s.includes("from './actionBookTools.js'"))s=s.replace("import { actionIntent } from './ActionIntent.js';","import { actionIntent } from './ActionIntent.js';\nimport { searchSemanticActionBook } from './actionBookTools.js';");
const oldLine="const canonical=canonicalizeCommand(original),normalized=normalizePersianCommand(canonical),hints=[...new Set([...commandHints(normalized),...capabilityHints(normalized)])],routeNames=[...new Set([...this.defaultTools,...selectToolNames(canonical,hints)])].filter(n=>tools[n]),basePrivate=isPrivateRequest(original,hints);";
const newLine="const canonical=canonicalizeCommand(original),normalized=normalizePersianCommand(canonical),hints=[...new Set([...commandHints(normalized),...capabilityHints(normalized)])],basePrivate=isPrivateRequest(original,hints),intent=actionIntent(canonical),recipes=intent.action?searchSemanticActionBook(canonical,6):[],recipeTools=recipes.flatMap(r=>(r.steps||[]).flatMap(x=>String(x).split('|'))).filter(n=>tools[n]),routeNames=[...new Set([...this.defaultTools,...selectToolNames(canonical,hints),...recipeTools])].filter(n=>tools[n]).slice(0,56);";
if(s.includes(oldLine))s=s.replace(oldLine,newLine);
else if(!s.includes('recipeTools=recipes.flatMap'))throw new Error('Agent routing line not found');
s=s.replace("const intent=actionIntent(canonical),small=matchSmallTalk(original);","const small=matchSmallTalk(original);");
fs.writeFileSync(p,s);
console.log('semantic workflow pre-routing added');