export const MARIA_ASSET_CATALOG=[
  {name:'大星蒼-sirius-.zip',kind:'voicebank',use:'voice-experiments',status:'importable',notes:'UTAU-style Japanese voicebank; keep as optional character voice source, not default TTS.'},
  {name:'preview_Set.zip',kind:'previews',use:'pose-thumbnails',status:'importable',notes:'43 PNG + 1 JPG preview images for animation/pose menus.'},
  {name:'MatCap_Sample3.zip',kind:'material',use:'matcap-materials',status:'importable',notes:'Three MatCap textures for avatar material presets.'},
  {name:'SEXY_POSE.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'1 Unity .anim pose; retarget/convert before browser VRM playback.'},
  {name:'EvilFallArma_PS_filer.rar',kind:'design-source',use:'wardrobe-source',status:'archive',notes:'Photoshop/design source for EvilFall armor.'},
  {name:'PURUPURU_Sit_Sample.zip',kind:'unity-animation',use:'sit-library',status:'convert',notes:'10 seated Unity animations + controller.'},
  {name:'minuitpose-03_FREE_.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'14 stand/sit/sleep/nail pose animations.'},
  {name:'FREE無料-PoseAnimationMilltina.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'Milltina SIT_93 pose.'},
  {name:'FREE無料-Milltina5FaceAnimation.zip',kind:'face-animation',use:'expression-library',status:'convert',notes:'5 Milltina face animations: Gao, Shy, Smile, Trouble.'},
  {name:'Sample.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'10 PURUPURU sample animations.'},
  {name:'FREE無料-Manuka5FaceAnimation.zip',kind:'face-animation',use:'expression-library',status:'convert',notes:'5 Manuka expressions: Smile, Shy, Kirakira, Pero, Cry.'},
  {name:'FREE無料-PoseAnimationManuka.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'Manuka SIT_93 pose.'},
  {name:'Pic_Pix__-_Free_Pose_set_-_通常版.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'30 free Unity pose animations.'},
  {name:'EvilFallArmar_v1.22.zip',kind:'wardrobe',use:'armor-effects',status:'convert',notes:'Armor pack: FBX, 43 animations, materials, particles, prefabs and sound effects.'},
  {name:'VN3_filer.rar',kind:'license-meta',use:'asset-licensing',status:'archive',notes:'Keep alongside imported assets for license/metadata review.'},
  {name:'Komano-Shapekey+_Free.zip',kind:'blendshape',use:'expression-library',status:'convert',notes:'BlendShare asset; map compatible shapes to VRM expressions.'},
  {name:'Wolfchan_XAvatar_Ver.1.0.0.zip',kind:'avatar-wearable',use:'wardrobe-avatar',status:'convert',notes:'2 XAvatar files + 1 XWear costume; requires XAvatar/XWear conversion before Three-VRM use.'},
  {name:'sea_themed_accessory_pack.zip',kind:'accessory',use:'accessory-library',status:'convert',notes:'Accessory textures/PSD/JSON for horns, ears, jellyfish hat and face-side variants.'},
  {name:'_VRoid_Free_Alien_Girl.zip',kind:'avatar',use:'avatar-selector',status:'importable',notes:'Contains a VRM avatar and readme; extract VRM into Avatar selector.'},
  {name:'7903223404901736379.vrm',kind:'avatar',use:'avatar-selector',status:'importable',notes:'Direct VRM avatar; can be loaded by current Avatar picker.'},
  {name:'VRMA_MotionPack.zip',kind:'vrma',use:'motion-library',status:'importable',notes:'7 direct VRMA motions already mapped to fullbody/greeting/peace/shoot/spin/model/squat.'}
];

export const ASSET_COUNTS=Object.freeze({
  packs:MARIA_ASSET_CATALOG.length,
  direct:MARIA_ASSET_CATALOG.filter(x=>x.status==='importable').length,
  conversion:MARIA_ASSET_CATALOG.filter(x=>x.status==='convert').length,
  archives:MARIA_ASSET_CATALOG.filter(x=>x.status==='archive').length
});

export function assetsByUse(use){return MARIA_ASSET_CATALOG.filter(x=>x.use===use);}
export function assetByName(name=''){const n=String(name).toLowerCase();return MARIA_ASSET_CATALOG.find(x=>x.name.toLowerCase()===n)||null;}
