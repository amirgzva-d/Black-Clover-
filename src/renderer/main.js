import { listAssets } from './assetLibrary.js';
listAssets().catch(error=>console.warn('Asset cleanup failed',error));
const surface=new URLSearchParams(location.search).get('surface')||'avatar';
document.body.classList.add(`surface-${surface}`);

const afterSurface=()=>((surface==='chat'||surface==='avatar')?import('./voiceSettings.js'):Promise.resolve())
  .then(()=>import('./luxuryUI.js'))
  .then(()=>import('./shellRuntime.js'))
  .catch(error=>console.error('UI extension bootstrap failed',error));

if(surface==='chat'){
  import('./chatSurfaceV2.js')
    .then(({mountChatSurface})=>mountChatSurface())
    .then(afterSurface)
    .catch(error=>console.error('Chat V2 bootstrap failed',error));
}else{
  import('./legacySurface.js')
    .then(afterSurface)
    .catch(error=>console.error('Legacy surface bootstrap failed',error));
}
