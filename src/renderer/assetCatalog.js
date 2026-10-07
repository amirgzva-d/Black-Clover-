export const MARIA_ASSET_CATALOG=[
  {name:'1658678464118441614.vrm',kind:'avatar',use:'avatar-selector',status:'importable',notes:'Ameath VRM; local-use asset. Do not redistribute from the public repo.'},
  {name:'2065525101661372465 (1).vrm',kind:'avatar',use:'avatar-selector',status:'importable',notes:'Sally VRM; local-use asset. Do not redistribute from the public repo.'},
  {name:'6169937430135470937.vrm',kind:'avatar',use:'avatar-selector',status:'importable',notes:'Yinlin VRM; local-use asset.'},
  {name:'6953900368484330122.vrm',kind:'avatar',use:'avatar-selector',status:'importable',notes:'VRM with restrictive embedded metadata; keep local only.'},
  {name:'7903223404901736379.vrm',kind:'avatar',use:'avatar-selector',status:'importable',notes:'Libby_free VRM; local use only; embedded metadata disallows commercial use.'},
  {name:'8034982919287768796.vrm',kind:'avatar',use:'avatar-selector',status:'importable',notes:'Cinderella VRM; local-use asset.'},
  {name:'8505292573653795333.vrm',kind:'avatar',use:'avatar-selector',status:'importable',notes:'Soppo VRM; local-use asset.'},
  {name:'Cookies.zip',kind:'wardrobe',use:'wardrobe-source',status:'convert',notes:'UnityPackage wardrobe/content pack; requires Unity extraction/conversion.'},
  {name:'EvilFallArmar_v1.22.zip',kind:'wardrobe',use:'armor-effects',status:'convert',notes:'Armor pack with Unity assets, animations, materials, particles and prefabs.'},
  {name:'EvilFallArma_PS_filer.rar',kind:'design-source',use:'wardrobe-source',status:'archive',notes:'Photoshop/design source for EvilFall armor.'},
  {name:'FREE無料-Manuka5FaceAnimation.zip',kind:'face-animation',use:'expression-library',status:'convert',notes:'Manuka face-animation UnityPackage.'},
  {name:'FREE無料-Milltina5FaceAnimation.zip',kind:'face-animation',use:'expression-library',status:'convert',notes:'Milltina face-animation UnityPackage.'},
  {name:'FREE無料-PoseAnimationManuka.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'Manuka pose UnityPackage.'},
  {name:'FREE無料-PoseAnimationMilltina.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'Milltina pose UnityPackage.'},
  {name:'Komano-Shapekey+_Free.zip',kind:'blendshape',use:'expression-library',status:'convert',notes:'Shape-key/expression asset; requires mapping to compatible VRM expressions.'},
  {name:'MatCap_Sample3.zip',kind:'material',use:'matcap-materials',status:'importable',notes:'Three MatCap PNG textures for local material presets.'},
  {name:'minuitpose-03_FREE_.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'Pose UnityPackage; requires retarget/conversion.'},
  {name:'Model_MOSO.VRM.rar',kind:'avatar',use:'avatar-selector',status:'convert',notes:'RAR containing VRM; extract locally before use.'},
  {name:'Pic_Pix__-_Free_Pose_set_-_通常版.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'Free pose UnityPackage; requires retarget/conversion.'},
  {name:'preview_Set.zip',kind:'previews',use:'pose-thumbnails',status:'importable',notes:'Pose preview images for the motion browser.'},
  {name:'PURUPURU_Sit_Sample.zip',kind:'unity-animation',use:'sit-library',status:'convert',notes:'Seated Unity animations; requires retarget/conversion.'},
  {name:'Sample.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'PURUPURU sample Unity animations.'},
  {name:'sea_themed_accessory_pack.zip',kind:'accessory',use:'accessory-library',status:'convert',notes:'Sea-themed horns, ears, hat, face-side textures, PSD and presets.'},
  {name:'SEXY_POSE.zip',kind:'unity-animation',use:'pose-library',status:'convert',notes:'Unity pose; requires retarget/conversion.'},
  {name:'VN3_filer.rar',kind:'license-meta',use:'asset-licensing',status:'archive',notes:'License/metadata documents. Keep alongside local assets.'},
  {name:'VRMA_MotionPack.zip',kind:'vrma',use:'motion-library',status:'importable',notes:'7 direct VRMA motions: full body, greeting, peace, shoot, spin, model pose, squat.'},
  {name:'Wolfchan_XAvatar_Ver.1.0.0.zip',kind:'avatar-wearable',use:'wardrobe-avatar',status:'convert',notes:'2 XAvatar + 1 XWear; conversion required for Three-VRM.'},
  {name:'_VRoid_Free_Alien_Girl.zip',kind:'avatar',use:'avatar-selector',status:'convert',notes:'ZIP containing a VRM avatar; extract locally before use.'},
  {name:'大星蒼-sirius-.zip',kind:'voicebank',use:'none',status:'blocked-license',notes:'Do not use in Maria/AI. Included readme prohibits use outside UTAU/DAW workflow and prohibits AI use.'}
];

export const ASSET_COUNTS=Object.freeze({
  packs:MARIA_ASSET_CATALOG.length,
  direct:MARIA_ASSET_CATALOG.filter(x=>x.status==='importable').length,
  conversion:MARIA_ASSET_CATALOG.filter(x=>x.status==='convert').length,
  archives:MARIA_ASSET_CATALOG.filter(x=>x.status==='archive').length,
  blocked:MARIA_ASSET_CATALOG.filter(x=>x.status==='blocked-license').length
});

export function assetsByUse(use){return MARIA_ASSET_CATALOG.filter(x=>x.use===use);}
export function assetByName(name=''){const n=String(name).toLowerCase();return MARIA_ASSET_CATALOG.find(x=>x.name.toLowerCase()===n)||null;}
