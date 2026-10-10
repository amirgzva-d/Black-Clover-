import fs from 'node:fs';
import path from 'node:path';

// The fullscreen/floating anime character is opt-in; it must not cover
// Telegram, Chrome, or other programs on first launch.
export class AvatarVisibilityPreferences {
  constructor(file){this.file=file;}
  load(){
    try {
      const state=JSON.parse(fs.readFileSync(this.file,'utf8'));
      return state?.showFloatingAvatar===true;
    }catch{return false;}
  }
  save(enabled){
    const visible=enabled===true;
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    const tmp=this.file+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify({version:1,showFloatingAvatar:visible,updatedAt:new Date().toISOString()},null,2),'utf8');
    fs.renameSync(tmp,this.file);
    return visible;
  }
}
