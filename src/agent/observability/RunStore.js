export class RunStore {
  constructor({limit=200}={}) {
    this.limit=Math.max(20,Number(limit)||200);
    this.items=[];
  }

  record(context,result={}) {
    const item={
      ...context.snapshot(),
      outcome:{
        ok:result?.ok!==false,
        repaired:Boolean(result?.repaired),
        provider:result?.provider||null,
        model:result?.model||null,
        validation:result?.validation||null,
        verification:result?.verification||null
      }
    };
    this.items.push(item);
    if(this.items.length>this.limit)this.items.splice(0,this.items.length-this.limit);
    return item;
  }

  recent(limit=50) {
    return this.items.slice(-Math.max(1,Number(limit)||50)).reverse();
  }

  errors(limit=50) {
    return this.items.filter(x=>x.errors?.length||x.status==='failed').slice(-Math.max(1,Number(limit)||50)).reverse();
  }
}

export const runtimeRuns=new RunStore();
