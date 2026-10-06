const levelScore={hard:1,observed:1,reported:.45};

export class SkillValidator{
  constructor({tools={}}={}){this.tools=tools;}
  validate(task,trace=[]){
    const useful=(trace||[]).filter(x=>x?.name).slice(0,32);
    if(useful.length<2)return {valid:false,reason:'needs-multiple-steps',confidence:0};
    if(useful.some(x=>x.success===false||x.verification?.ok===false))return {valid:false,reason:'failed-or-unverified-step',confidence:0};
    const unknown=useful.filter(x=>!this.tools[x.name]);if(unknown.length)return {valid:false,reason:'unknown-tool',confidence:0};
    const verification=useful.reduce((sum,x)=>sum+(levelScore[x.verification?.level]??.25),0)/useful.length;
    const risk=useful.some(x=>this.tools[x.name]?.risk==='sensitive')?'sensitive':useful.some(x=>this.tools[x.name]?.risk==='critical')?'critical':'low';
    if(verification<.72)return {valid:false,reason:'insufficient-postcondition-evidence',confidence:verification,risk};
    const postconditions=useful.filter(x=>x.verification?.reason).map(x=>({tool:x.name,reason:x.verification.reason,level:x.verification.level}));
    return {valid:true,reason:'validated-candidate',confidence:Math.min(.95,.55+verification*.4),risk,postconditions,requiredTools:[...new Set(useful.map(x=>x.name))]};
  }
}
