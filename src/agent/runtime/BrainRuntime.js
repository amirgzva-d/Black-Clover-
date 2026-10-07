import { BrainRouter } from '../BrainRouter.js';
import { RunController } from './RunController.js';
import { Planner } from './Planner.js';
import { ContextManager } from './ContextManager.js';
import { runtimeRuns } from '../observability/RunStore.js';

export class BrainRuntime {
  constructor({brain=new BrainRouter(),emit=()=>{},controller=null}={}) {
    this.brain=brain;
    this.emit=emit;
    this.controller=controller||new RunController({brain,emit});
    this.contextManager=this.controller.contextManager||new ContextManager();
    this.planner=this.controller.planner||new Planner();
  }

  async answer(payload={}) {
    return this.controller.answer(payload);
  }

  plan(text,{hints=[],options={}}={}) {
    const context=this.contextManager.build({text,hints,options});
    return {context,plan:this.planner.create(context,{hints})};
  }

  async health() {
    const brain=await this.brain.health();
    return {
      version:2,
      brain,
      recentRuns:runtimeRuns.recent(10),
      errors:runtimeRuns.errors(10)
    };
  }
}
