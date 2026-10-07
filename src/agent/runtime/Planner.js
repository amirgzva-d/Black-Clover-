import { ToolResolver } from '../tools/ToolResolver.js';

export class Planner {
  constructor({resolver=new ToolResolver()}={}) {
    this.resolver=resolver;
  }

  create(context,{hints=[]}={}) {
    const resolved=this.resolver.resolve(context.input,{hints,mode:context.mode});
    const plan={
      version:2,
      objective:context.privateContext?'private-user-goal':context.goal,
      mode:context.mode,
      profile:context.profile,
      tools:context.mode==='chat'?[]:resolved.names,
      fastAction:context.mode==='action'?resolved.fast:null,
      verification:context.mode==='action'?'required':context.mode==='research'?'source-grounded':'response-quality',
      maxSteps:context.mode==='action'?16:context.mode==='research'?8:1
    };
    context.plan=plan;
    context.event('planned',{mode:plan.mode,profile:plan.profile,toolCount:plan.tools.length});
    return plan;
  }
}
