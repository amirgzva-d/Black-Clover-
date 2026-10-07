import { ContextManager } from './ContextManager.js';
import { Planner } from './Planner.js';
import { ResultValidator } from './ResultValidator.js';
import { Verifier } from './Verifier.js';
import { ModelRouter } from '../providers/ModelRouter.js';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { runtimeRuns } from '../observability/RunStore.js';
import { incidents } from '../IncidentStore.js';

export class RunController {
  constructor({brain,emit=()=>{},contextManager=new ContextManager(),planner=new Planner(),validator=new ResultValidator(),verifier=new Verifier(),modelRouter=new ModelRouter(),providers=null,store=runtimeRuns}={}) {
    if(!brain&&!providers)throw new Error('RunController requires a brain or provider registry');
    this.brain=brain;
    this.emit=emit;
    this.contextManager=contextManager;
    this.planner=planner;
    this.validator=validator;
    this.verifier=verifier;
    this.modelRouter=modelRouter;
    this.providers=providers||new ProviderRegistry({brain});
    this.store=store;
  }

  async answer({text='',messages=[],hints=[],options={}}={}) {
    const context=this.contextManager.build({text,history:messages,hints,options});
    const plan=this.planner.create(context,{hints});
    const route=this.modelRouter.route(context,options);
    context.route=route;
    context.event('model-route',{profile:route.profile,allowOnline:route.allowOnline,provider:route.provider});

    try {
      this.emit({type:'runtime',state:'model',runId:context.id,profile:route.profile,mode:context.mode});
      let response=await this.providers.complete(messages,[],route);
      let answer=String(response?.message?.content||'').trim();
      let validation=this.validator.validateText(text,answer);
      let repaired=false;

      if(validation.needsRepair) {
        context.event('repair',{reason:validation.reason});
        await incidents.record({kind:'response-quality',phase:'result-validation',error:validation.reason,input:text,privateContext:context.privateContext,model:response?.model||this.providers.state?.model||''}).catch(()=>{});
        const repairedResponse=await this.providers.complete(this.validator.repairMessages(text,answer),[],route);
        const candidate=String(repairedResponse?.message?.content||'').trim();
        const repairedValidation=this.validator.validateText(text,candidate);
        if(candidate&&repairedValidation.ok) {
          response=repairedResponse;
          answer=candidate;
          validation=repairedValidation;
          repaired=true;
        }
      }

      if(!answer)throw new Error('Model returned an empty answer');
      const verification=this.verifier.run(context,{answer});
      context.event('validated',{validation:validation.reason,verified:verification.verified});
      context.finish(verification.ok?'done':'partial');

      const out={
        ok:verification.ok,
        message:{...(response?.message||{}),role:'assistant',content:answer},
        provider:response?.provider||this.providers.state?.provider||null,
        model:response?.model||this.providers.state?.model||null,
        profile:route.profile,
        mode:context.mode,
        repaired,
        validation,
        verification,
        run:context.snapshot()
      };
      this.store.record(context,out);
      return out;
    } catch(error) {
      context.fail(error,{stage:'answer'});
      context.finish('failed');
      this.store.record(context,{ok:false});
      await incidents.record({kind:'runtime',phase:'brain-runtime',error:error.message,input:text,privateContext:context.privateContext,model:this.providers.state?.model||''}).catch(()=>{});
      throw error;
    }
  }
}
