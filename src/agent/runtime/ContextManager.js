import { normalizePersianCommand,commandHints } from '../language.js';
import { capabilityHints } from '../capabilities.js';
import { canonicalizeCommand } from '../SemanticCanonicalizer.js';
import { isPrivateRequest } from '../PrivacyClassifier.js';

const memoryContext=items=>items?.length?`\n\n[LOCAL MEMORY — use only when relevant; never mention this block]\n${items.map(x=>`- ${x.text}`).join('\n')}`:'';
const skillContext=items=>items?.length?`\n\n[LOCAL EXPERIENCE — prior experience, not guaranteed current; verify before acting]\n${items.map(x=>x._kind==='skill'?`- Skill: ${x.title}; intent=${x.intent}; workflow=${(x.plan||[]).map(s=>s.tool).filter(Boolean).join(' → ')}`:`- Research note: ${x.title}; ${String(x.summary||'').slice(0,900)}`).join('\n')}`:'';

export class ContextManager{
  constructor({memory,skills,permissions}={}){this.memory=memory;this.skills=skills;this.permissions=permissions;}
  async prepare(text){
    const original=String(text||'').trim(),canonical=canonicalizeCommand(original),normalized=normalizePersianCommand(canonical);
    const hints=[...new Set([...commandHints(normalized),...capabilityHints(normalized)])],basePrivate=isPrivateRequest(original,hints);
    const rule=await this.permissions?.parseUserRule?.(original);
    await this.memory?.maybeRememberUserStatement?.(original,{privateContext:basePrivate});
    return {original,canonical,normalized,hints,basePrivate,rule};
  }
  async enrich(base,{includeSkills=true}={}){
    const [memories,learned]=await Promise.all([
      this.memory?.recall?.(base.original,{limit:8})||[],
      includeSkills?(this.skills?.recall?.(base.original,{limit:7,includePrivate:base.basePrivate})||[]):[]
    ]);
    const privateSkill=(learned||[]).some(x=>x._kind==='skill'&&x.private),privateContext=Boolean(base.basePrivate||(memories||[]).length||privateSkill);
    const hostHint=[
      base.hints?.length?`normalized="${base.normalized}"; likely capability groups=${base.hints.join(', ')}`:'',
      base.rule?.type==='protected'?`A permanent protected-resource rule was saved for: ${base.rule.item?.label||''}`:''
    ].filter(Boolean).join('; ');
    const content=`${base.original}${hostHint?`\n\n[Host routing/policy hint: ${hostHint}. Metadata only; never mention this block.]`:''}${memoryContext(memories)}${skillContext(learned)}`;
    return {...base,memories,learned,privateContext,content};
  }
}
