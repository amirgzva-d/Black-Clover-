import * as THREE from 'three';

const PRESETS={
  day:{hemiSky:0xf4f6ff,hemiGround:0x25263a,hemi:2.15,key:0xfff4e8,keyPower:2.05,rim:0x8098ff,rimPower:.82,fill:0xa07dff,fillPower:.28},
  night:{hemiSky:0xb7c4ff,hemiGround:0x111421,hemi:1.55,key:0xd8e3ff,keyPower:1.55,rim:0x6b7dff,rimPower:1.18,fill:0x9b72ff,fillPower:.42},
  focus:{hemiSky:0xe5eaff,hemiGround:0x141625,hemi:1.72,key:0xeef1ff,keyPower:1.8,rim:0x6b91ff,rimPower:1.32,fill:0x8b72ff,fillPower:.32},
  warm:{hemiSky:0xfff0dc,hemiGround:0x2a2022,hemi:1.95,key:0xffd0a8,keyPower:2.1,rim:0xff8b7f,rimPower:.74,fill:0xffad75,fillPower:.34},
  alert:{hemiSky:0xffe7e7,hemiGround:0x241417,hemi:1.7,key:0xffc5c5,keyPower:1.9,rim:0xff5967,rimPower:1.25,fill:0xff8a95,fillPower:.35}
};
const chooseTime=()=>{const h=new Date().getHours();return h>=19||h<6?'night':'day';};

export function createAvatarLighting(scene,{mini=false}={}){
  const hemi=new THREE.HemisphereLight(),key=new THREE.DirectionalLight(),rim=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight();
  key.position.set(1.15,2.2,2.4);rim.position.set(-2.1,1.15,-1.15);fill.position.set(-1.15,.75,1.45);
  scene.add(hemi,key,rim,fill);
  const state={time:chooseTime(),mode:'idle',emotion:'neutral',preset:null,target:null};
  function select(){
    if(state.preset&&PRESETS[state.preset])return PRESETS[state.preset];
    if(state.mode==='error'||state.emotion==='angry')return PRESETS.alert;
    if(state.emotion==='happy'||state.emotion==='shy')return PRESETS.warm;
    if(['thinking','working','executing','listening'].includes(state.mode))return PRESETS.focus;
    return PRESETS[state.time]||PRESETS.day;
  }
  function apply(instant=false){
    const p=select(),scale=mini?.88:1;
    hemi.color.setHex(p.hemiSky);hemi.groundColor.setHex(p.hemiGround);hemi.intensity=p.hemi*scale;
    key.color.setHex(p.key);key.intensity=p.keyPower*scale;
    rim.color.setHex(p.rim);rim.intensity=p.rimPower*scale;
    fill.color.setHex(p.fill);fill.intensity=p.fillPower*scale;
    state.target=p;return p;
  }
  function applyModel(root){
    root?.traverse?.(o=>{
      const materials=Array.isArray(o.material)?o.material:[o.material].filter(Boolean);
      for(const m of materials){
        if(m.normalMap&&m.normalScale?.set)m.normalScale.set(1,1);
        if('envMapIntensity' in m)m.envMapIntensity=Math.max(.7,Number(m.envMapIntensity)||0);
        m.needsUpdate=true;
      }
    });
  }
  function setMode(mode='idle'){state.mode=String(mode||'idle');apply();}
  function setEmotion(emotion='neutral'){state.emotion=String(emotion||'neutral');apply();}
  function setTime(time='auto'){state.time=time==='auto'?chooseTime():String(time);apply();}
  function setPreset(name=null){state.preset=name&&PRESETS[name]?name:null;apply();}
  function updateClock(){const next=chooseTime();if(next!==state.time&&!state.preset){state.time=next;apply();}}
  apply(true);
  return {hemi,key,rim,fill,state,setMode,setEmotion,setTime,setPreset,applyModel,updateClock,presets:Object.keys(PRESETS),dispose(){scene.remove(hemi,key,rim,fill);}};
}
