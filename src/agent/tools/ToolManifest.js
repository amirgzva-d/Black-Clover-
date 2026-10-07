import { tools } from '../toolRegistry.js';
import { toolMakesContextPrivate } from '../PrivacyClassifier.js';

export class ToolManifest {
  constructor(registry=tools) {
    this.registry=registry;
  }

  has(name) {
    return Boolean(this.registry?.[name]);
  }

  get(name) {
    const tool=this.registry?.[name];
    if(!tool)return null;
    return {
      name,
      risk:tool.risk||'low',
      description:tool.description||'',
      schema:tool.schema||{type:'object',properties:{}},
      privateContext:toolMakesContextPrivate(name)
    };
  }

  list() {
    return Object.keys(this.registry||{}).map(name=>this.get(name));
  }

  functions(names=[]) {
    const selected=Array.isArray(names)?names:[];
    return selected.map(name=>this.get(name)).filter(Boolean).map(item=>({
      type:'function',
      function:{name:item.name,description:item.description,parameters:item.schema}
    }));
  }
}
