export class ProviderRegistry {
  constructor({brain}={}) {
    if(!brain)throw new Error('ProviderRegistry requires a brain router');
    this.brain=brain;
  }

  async complete(messages,tools=[],route={}) {
    return this.brain.chat(messages,tools,route);
  }

  async catalog() {
    return this.brain.catalog();
  }

  async health() {
    return this.brain.health();
  }

  get state() {
    return {
      mode:this.brain.lastMode,
      provider:this.brain.lastProvider,
      model:this.brain.model,
      profile:this.brain.lastProfile,
      fallbackReason:this.brain.lastFallbackReason
    };
  }
}
