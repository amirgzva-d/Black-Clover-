import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export async function mountAvatar(host){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(28,1,0.1,30); camera.position.set(0,1.35,3.3);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x202030,2.3)); const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(1,2,2);scene.add(key);
  let vrm=null; const loader=new GLTFLoader(); loader.register(p=>new VRMLoaderPlugin(p));
  try{const gltf=await loader.loadAsync('/models/Model_MOSO.vrm');vrm=gltf.userData.vrm;VRMUtils.removeUnnecessaryVertices(vrm.scene);VRMUtils.combineSkeletons(vrm.scene);vrm.scene.rotation.y=Math.PI;scene.add(vrm.scene);}catch(e){host.classList.add('avatar-missing');host.dataset.error='فایل public/models/Model_MOSO.vrm را اضافه کنید';}
  const resize=()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}; new ResizeObserver(resize).observe(host);resize();
  let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(vrm)vrm.update(dt);renderer.render(scene,camera);}requestAnimationFrame(frame);
}
