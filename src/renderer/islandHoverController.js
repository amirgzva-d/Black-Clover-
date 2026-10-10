// MARIA Top Island — mini -> reference preview -> clicked module.
// The 5-second inactivity deadline applies even to a pinned/open panel.
// Timer adapters are injected so the same behavior is testable without Electron.
export class IslandHoverController {
  constructor({
    getMode,getPinned,setPinned,setMode,selectModule,
    isProtected=()=>false,getCollapseDelay=()=>5000,
    openDelay=180,
    schedule=(fn,ms)=>setTimeout(fn,ms),
    unschedule=id=>clearTimeout(id)
  }){
    Object.assign(this,{getMode,getPinned,setPinned,setMode,selectModule,
      isProtected,getCollapseDelay,openDelay,schedule,unschedule});
    this.inside=false;
    this.suppressUntilLeave=false;
    this.openTimer=null;
    this.closeTimer=null;
  }
  cancel(which){
    if(this[which]!==null)this.unschedule(this[which]);
    this[which]=null;
  }
  enter(){
    if(this.suppressUntilLeave)return;
    if(this.inside){this.activity();return;}
    this.inside=true;
    this.cancel('openTimer');
    if(this.getMode()==='peek'){
      this.openTimer=this.schedule(()=>{
        this.openTimer=null;
        if(this.inside&&!this.suppressUntilLeave&&this.getMode()==='peek'){
          this.setMode('preview');
          this.scheduleCollapse();
        }
      },this.openDelay);
    }else this.activity();
  }
  activity(){
    if(this.suppressUntilLeave)return;
    if(this.getMode()!=='peek')this.scheduleCollapse();
  }
  leave(){
    this.inside=false;
    this.suppressUntilLeave=false;
    this.cancel('openTimer');
    if(this.getMode()!=='peek')this.scheduleCollapse();
  }
  scheduleCollapse(delay=this.getCollapseDelay()){
    this.cancel('closeTimer');
    if(this.getMode()==='peek'||Number(delay)===0)return;
    this.closeTimer=this.schedule(()=>{
      this.closeTimer=null;
      if(this.getMode()==='peek')return;
      if(this.isProtected()){
        this.scheduleCollapse(700);
        return;
      }
      this.collapseNow();
    },Math.max(100,Number(delay)||5000));
  }
  // A module's information is only opened by click, never by hover.
  clickModule(id){
    if(!id)return;
    this.suppressUntilLeave=false;
    this.cancel('openTimer');
    this.setPinned(true);
    this.selectModule(id,true);
    this.activity();
  }
  pinPreview(){
    this.suppressUntilLeave=false;
    this.cancel('openTimer');
    if(this.getMode()==='peek')this.setMode('preview');
    this.setPinned(true);
    this.activity();
    return true;
  }
  togglePin(){
    if(!this.getPinned())return this.pinPreview();
    this.setPinned(false);
    this.activity();
    return false;
  }
  // Clicking the live character always returns to mini. The mini character
  // still opens a pinned preview when explicitly clicked.
  clickCharacter(){
    if(this.getMode()==='peek')return this.pinPreview();
    this.collapseNow();
    return false;
  }
  collapseNow(){
    this.cancel('openTimer');
    this.cancel('closeTimer');
    this.suppressUntilLeave=this.inside;
    this.setPinned(false);
    this.setMode('peek');
  }
  refresh(){
    if(this.getMode()!=='peek')this.scheduleCollapse();
    else this.cancel('closeTimer');
  }
  destroy(){
    this.cancel('openTimer');
    this.cancel('closeTimer');
  }
}
