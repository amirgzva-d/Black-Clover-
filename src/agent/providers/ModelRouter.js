const paidProviders=new Set(['openai','anthropic','deepseek','qwen']);
const freeProviders=new Set(['groq','gemini','openrouter']);

export class ModelRouter {
  route(context,options={}) {
    const requestedProvider=String(options.provider||'auto').toLowerCase();
    const requestedModel=String(options.model||'auto');
    const modelOverride=String(options.modelOverride||'auto');
    const freeOnly=/^(1|true|yes)$/i.test(String(process.env.BLACK_CLOVER_FREE_ONLY||''));

    if(context.privateContext&&!context.allowOnline) {
      return {
        profile:context.profile,
        allowOnline:false,
        provider:'ollama',
        model:modelOverride.startsWith('ollama:')?modelOverride.slice(7):'auto',
        modelOverride:modelOverride.startsWith('ollama:')?modelOverride:'auto',
        privacyReason:'private/local context'
      };
    }

    let provider=requestedProvider;
    if(freeOnly&&paidProviders.has(provider))provider='auto';
    if(freeOnly&&provider!=='auto'&&!freeProviders.has(provider)&&provider!=='ollama'&&provider!=='local')provider='auto';

    return {
      profile:context.profile,
      allowOnline:context.allowOnline,
      provider,
      model:requestedModel,
      modelOverride,
      privacyReason:context.privateContext?'private context':''
    };
  }
}
