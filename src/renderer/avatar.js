import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(current,target,speed,dt)=>THREE.MathUtils.lerp(current,target,1-Math.exp(-speed*dt));

export async function mountAvatar(host){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(28,1,0.1,30);camera.position.set(0,1.35,3.3);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x202030,2.3));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(1,2,2);scene.add(key);const rim=new THREE.DirectionalLight(0x8397ff,.9);rim.position.set(-2,1,-1);scene.add(rim);
  let vrm=null,head=null,chest=null,hips=null;const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
  const state={mode:'idle',mouth:0,blink:0,nextBlink:performance.now()+1800+Math.random()*2600,pointerX:0,pointerY:0,lastPulse:0};
  try{
    const gltf=await loader.loadAsync('/models/Model_MOSO.vrm');vrm=gltf.userData.vrm;VRMUtils.removeUnnecessaryVertices(vrm.scene);VRMUtils.combineSkeletons(vrm.scene);vrm.scene.rotation.y=Math.PI;scene.add(vrm.scene);
    head=vrm.humanoid?.getNormalizedBoneNode('head');chest=vrm.humanoid?.getNormalizedBoneNode('chest');hips=vrm.humanoid?.getNormalizedBoneNode('hips');
    vrm.lookAt && (vrm.lookAt.autoUpdate=false);
    host.classList.add('avatar-ready');
  }catch(e){host.classList.add('avatar-missing');host.dataset.error='فایل public/models/Model_MOSO.vrm را اضافه کنید';}
  const expression=(name,value)=>{try{vrm?.expressionManager?.setValue(name,clamp(value));}catch{}};
  const setMode=mode=>{state.mode=mode||'idle';host.dataset.avatarState=state.mode;};
  const observer=new MutationObserver(()=>setMode(host.dataset.voiceState||'idle'));observer.observe(host,{attributes:true,attributeFilter:['data-voice-state']});setMode(host.dataset.voiceState||'idle');
  host.addEventListener('blackclover:voice-pulse',()=>{state.lastPulse=performance.now();state.mouth=Math.max(state.mouth,.72+Math.random()*.22);});
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();state.pointerX=clamp((e.clientX-r.left)/Math.max(r.width,1),0,1)*2-1;state.pointerY=clamp((e.clientY-r.top)/Math.max(r.height,1),0,1)*2-1;});
  host.addEventListener('pointerleave',()=>{state.pointerX=0;state.pointerY=0;});
  const resize=()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
  let last=performance.now();function frame(now){
    requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;const t=now/1000;
    if(vrm){
      if(now>=state.nextBlink){state.blink=1;state.nextBlink=now+2200+Math.random()*4200;}state.blink=Math.max(0,state.blink-dt*7.5);const blink=Math.sin(clamp(state.blink)*Math.PI);expression('blink',blink);
      const speaking=state.mode==='speaking',listening=state.mode==='listening';const pulseAge=now-state.lastPulse;const mouthTarget=speaking?(pulseAge<240?state.mouth:.18+.12*(Math.sin(t*11)+1)):0;state.mouth=smooth(state.mouth,mouthTarget,speaking?13:18,dt);expression('aa',state.mouth);expression('happy',speaking?.08:listening?.045:.02);
      const breathe=Math.sin(t*1.65)*.012,bob=Math.sin(t*.72)*.008;if(chest){chest.rotation.x=smooth(chest.rotation.x,breathe+(speaking?.012:0),3,dt);chest.rotation.z=smooth(chest.rotation.z,Math.sin(t*.55)*.006,3,dt);}if(hips)hips.position.y=bob;
      if(head){const tx=(-state.pointerY*.055)+(listening?.025:0)+Math.sin(t*.43)*.008,ty=(-state.pointerX*.09)+Math.sin(t*.31)*.012;head.rotation.x=smooth(head.rotation.x,tx,3.8,dt);head.rotation.y=smooth(head.rotation.y,ty,3.8,dt);head.rotation.z=smooth(head.rotation.z,speaking?Math.sin(t*.8)*.012:0,3,dt);}
      vrm.update(dt);
    }
    renderer.render(scene,camera);
  }requestAnimationFrame(frame);
  return {setMode,dispose(){observer.disconnect();renderer.dispose();host.replaceChildren();}};
}
