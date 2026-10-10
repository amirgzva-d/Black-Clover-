// Pure interaction controller for MARIA's three-stage Top Island.
// All timers and state dependencies are injected so behavior is unit-testable.
export class IslandHoverController {
  constructor({
    getMode,getPinned,setPinned,setMode,selectModule,
    isProtected=()=>false,getCollapseDelay=()=>2800,
    openDelay=120,moduleDelay=85,backDelay=180,
    // Call browser timers without binding Window methods to this controller.
    schedule=(callback,delay)=>setTimeout(callback,delay),
    unschedule=handle=>clearTimeout(handle)
  }){
    Object.assign(this,{getMode,getPinned,setPinned,setMode,selectModule,isProtected,
      getCollapseDelay,openDelay,moduleDelay,backDelay,schedule,unschedule});
    this.inside=false;
    this.hoverTimer=null;
    this.moduleTimer=null;
    this.closeTimer=null;
    this.pendingModule=null;
  }
  clear(){
    for(const key of ['hoverTimer','moduleTimer','closeTimer']){
      if(this[key]!==null)this.unschedule(this[key]);
      this[key]=null;
    }
    this.pendingModule=null;
  }
  enter(){
    this.inside=true;this.clear();
    if(this.getMode()==='peek'){
      this.hoverTimer=this.schedule(()=>{
        this.hoverTimer=null;
        if(this.inside&&this.getMode()==='peek')this.setMode('preview');
      },this.openDelay);
    }
  }
  leave(){
    this.inside=false;this.clear();
    if(this.getPinned())return;
    if(this.getMode()==='expanded'){
      this.closeTimer=this.schedule(()=>{
        this.closeTimer=null;
        if(this.inside||this.getPinned())return;
        if(this.isProtected()){this.scheduleCollapse(700);return;}
        this.setMode('preview');
        this.scheduleCollapse();
      },this.backDelay);
    }else this.scheduleCollapse();
  }
  scheduleCollapse(delay=this.getCollapseDelay()){
    if(this.inside||this.getPinned()||delay===0)return;
    if(this.closeTimer!==null)this.unschedule(this.closeTimer);
    this.closeTimer=this.schedule(()=>{
      this.closeTimer=null;
      if(this.inside||this.getPinned())return;
      if(this.isProtected()){this.scheduleCollapse(700);return;}
      if(this.getMode()==='expanded'){
        this.setMode('preview');
        this.scheduleCollapse();
      }else if(this.getMode()!=='peek')this.setMode('peek');
    },Math.max(100,Number(delay)||2800));
  }
  hoverModule(id){
    if(!id)return;
    this.inside=true;this.clear();this.pendingModule=id;
    this.moduleTimer=this.schedule(()=>{
      this.moduleTimer=null;
      // leave() cancels the intent; pointer position can flicker during Electron resize.
      if(this.pendingModule===id){
        this.pendingModule=null;
        this.selectModule(id,false);
      }
    },this.moduleDelay);
  }
  clickModule(id){
    if(!id)return;
    this.inside=true;this.clear();
    this.setPinned(true);
    this.selectModule(id,true);
  }
  togglePin(){
    this.clear();
    if(this.getMode()==='peek')this.setMode('preview');
    const pinned=!this.getPinned();
    this.setPinned(pinned);
    if(!pinned&&!this.inside)this.scheduleCollapse();
    return pinned;
  }
  refresh(){
    if(this.inside||this.getPinned())return;
    this.scheduleCollapse();
  }
  destroy(){this.clear();}
}
