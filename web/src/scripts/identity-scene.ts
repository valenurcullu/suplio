import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight,
  Shape, ExtrudeGeometry, Mesh, Group, MeshPhysicalMaterial, Color, CanvasTexture,
  EquirectangularReflectionMapping, PMREMGenerator, sRGBEncoding, ACESFilmicToneMapping,
  Euler, Quaternion, Vector3,
} from 'three';
import gsap from 'gsap';

export interface IdentityScene {
  setAssembled(value: boolean): void;
  setPageVisible(value: boolean): void;
  dispose(): void;
}
const FRONT = ['#F5F4F0', '#FF5A1F'];
const SIDE = ['#B8B2A7', '#C63E12'];
const HOME = { x: -.18, y: .55 }; // Original Claude orientation.

// Geometry from the supplied Suplio Logo 3D.html: same contours, arcs, depth,
// bevel parameters, subdivisions and +/-5 z offsets. No redesigned symbol.
export function originalShapes() {
  const P = (x: number, y: number) => [x - 48, 48 - y];
  const mv = (s: Shape, x: number, y: number) => { const p=P(x,y); s.moveTo(p[0],p[1]); };
  const ln = (s: Shape, x: number, y: number) => { const p=P(x,y); s.lineTo(p[0],p[1]); };
  const arc = (s: Shape,cx:number,cy:number,a0:number,a1:number) => { const p=P(cx,cy); s.absarc(p[0],p[1],17.5,a0,a1,true); };
  const H=Math.PI/2, dark=new Shape(), orange=new Shape();
  mv(dark,17.5,0); ln(dark,52.5,0); arc(dark,52.5,17.5,H,-H);
  ln(dark,0,35); ln(dark,0,17.5); arc(dark,17.5,17.5,Math.PI,H);
  mv(orange,26,61); ln(orange,78.5,61); arc(orange,78.5,78.5,H,-H);
  ln(orange,43.5,96); arc(orange,43.5,78.5,-H,-Math.PI); ln(orange,26,61);
  return [dark,orange];
}
const extrudeOptions = {
  depth:14, curveSegments:64, bevelEnabled:true,
  bevelThickness:2.2, bevelSize:1.8, bevelOffset:-1.4, bevelSegments:8,
};

export function createIdentityScene(root: HTMLElement, art: HTMLElement, mark: HTMLElement, paths: NodeListOf<SVGPathElement>): IdentityScene {
  const host = art.querySelector<HTMLElement>('[data-identity-canvas]')!;
  const renderer = new WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<900?1.5:2));
  renderer.outputEncoding=sRGBEncoding; renderer.toneMapping=ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05; renderer.setClearColor(0x16140f,0);
  const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.append(canvas);
  const scene=new Scene(),camera=new PerspectiveCamera(30,1,1,2000),logo=new Group();scene.add(logo);
  const hemi=new HemisphereLight(0xffffff,0x444444,.35);scene.add(hemi);
  const key=new DirectionalLight(0xffffff,.9);key.position.set(-60,90,120);scene.add(key);
  const rim=new DirectionalLight(0xffb48a,.6);rim.position.set(90,-40,-80);scene.add(rim);
  // The original studio environment is generated locally, never downloaded.
  const room=document.createElement('canvas');room.width=1024;room.height=512;
  const g=room.getContext('2d')!;const gradient=g.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#5a5e66');gradient.addColorStop(.5,'#23252a');gradient.addColorStop(1,'#0c0c0e');
  g.fillStyle=gradient;g.fillRect(0,0,1024,512);
  for(const[x,y,w,h,a]of[[120,70,220,130,1],[640,40,260,110,.95],[420,330,180,60,.55],[900,200,90,160,.6]]){
    const grad=g.createLinearGradient(x,y,x,y+h);grad.addColorStop(0,`rgba(255,255,255,${a})`);grad.addColorStop(1,`rgba(255,255,255,${a*.55})`);g.fillStyle=grad;g.fillRect(x,y,w,h);
  }
  const texture=new CanvasTexture(room);texture.mapping=EquirectangularReflectionMapping;texture.encoding=sRGBEncoding;
  const pm=new PMREMGenerator(renderer);
  let environment: ReturnType<PMREMGenerator['fromEquirectangular']> | undefined;
  try { environment=pm.fromEquirectangular(texture);scene.environment=environment.texture; }
  catch { /* The original direct lights remain available on limited GPUs. */ }
  finally { pm.dispose();texture.dispose(); }
  const volume={value:0},materials:MeshPhysicalMaterial[]=[],geometries:ExtrudeGeometry[]=[];
  function material(hex:string){
    // Reuse Claude's matte preset: clean, non-metallic, no exaggerated clearcoat.
    const m=new MeshPhysicalMaterial({color:new Color(hex).convertSRGBToLinear(),roughness:.6,metalness:0,clearcoat:0,clearcoatRoughness:.5,envMapIntensity:.8,morphTargets:true});
    const encoded=new Color(hex);
    m.onBeforeCompile=shader=>{
      shader.uniforms.identityVolume={get value(){return volume.value;}};
      shader.uniforms.identityFlatColor={value:new Vector3(encoded.r,encoded.g,encoded.b)};
      shader.fragmentShader='uniform float identityVolume;\nuniform vec3 identityFlatColor;\n'+shader.fragmentShader;
      // Exactly the official sRGB color at the SVG handoff; studio shading grows
      // with physical volume, after tone mapping/encoding rather than a flash.
      shader.fragmentShader=shader.fragmentShader.replace('#include <encodings_fragment>','#include <encodings_fragment>\ngl_FragColor.rgb = mix(identityFlatColor, gl_FragColor.rgb, identityVolume);');
    };
    materials.push(m);return m;
  }
  const meshes=originalShapes().map((shape,i)=>{
    const geometry=new ExtrudeGeometry(shape,extrudeOptions);geometry.translate(0,0,-7);
    // Identical topology, flattened to the actual SVG outline. Only the original
    // geometry's positions morph; no rebuilds, texture swaps or logo crossfades.
    const flat=new ExtrudeGeometry(shape,{...extrudeOptions,depth:0,bevelThickness:0,bevelSize:0,bevelOffset:0});
    if(flat.attributes.position.count!==geometry.attributes.position.count)throw Error('Identity morph topology mismatch');
    geometry.morphAttributes.position=[flat.attributes.position.clone()];flat.dispose();geometries.push(geometry);
    const mesh=new Mesh(geometry,[material(FRONT[i]),material(SIDE[i])]);mesh.morphTargetInfluences![0]=1;logo.add(mesh);return mesh;
  });
  let disposed=false,failed=false,visible=false,pageVisible=!document.hidden,assembled=false,raf=0,last=0,angle=HOME.y;
  let mx=0,my=0,targetX=0,targetY=0,tween:gsap.core.Tween|undefined;
  const targetQuaternion=new Quaternion().setFromEuler(new Euler(HOME.x,HOME.y,0));
  const pointer=matchMedia('(hover: hover) and (pointer: fine)');
  const events=new AbortController();
  function draw(){
    if(disposed||failed)return;
    const v=volume.value;
    for(const[ i,mesh ]of meshes.entries()){
      mesh.morphTargetInfluences![0]=1-v;
      mesh.position.set(Number(gsap.getProperty(paths[i],'x'))*(1-v),-Number(gsap.getProperty(paths[i],'y'))*(1-v),(i===0?5:-5)*v);
    }
    logo.quaternion.identity().slerp(targetQuaternion,v);
    renderer.render(scene,camera);
    host.style.opacity=v>0?'1':'0';
    if(v>0)mark.style.opacity='0';else mark.style.removeProperty('opacity');
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;root.dataset.identityRendering='false';}
  function start(){if(disposed||failed||!visible||!pageVisible||volume.value<=0||raf)return;last=performance.now();root.dataset.identityRendering='true';raf=requestAnimationFrame(frame);}
  function frame(now:number){
    raf=0;if(!visible||!pageVisible||disposed||failed)return;
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(assembled&&volume.value>=.9999){
      // Bounded rotation preserves both silhouettes; never turn the mark edge-on.
      angle+=dt*.24;const damping=1-Math.exp(-dt*6);mx+=(targetX-mx)*damping;my+=(targetY-my)*damping;
      targetQuaternion.setFromEuler(new Euler(HOME.x+Math.sin(angle*.7)*.055+my,HOME.y+Math.sin(angle)*.25+mx,0));
    }
    draw();if(volume.value>0)raf=requestAnimationFrame(frame);else stop();
  }
  function resize(){
    const w=Math.max(1,art.clientWidth),h=Math.max(1,art.clientHeight),markWidth=mark.getBoundingClientRect().width;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<900?1.5:2));renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    // Match the existing SVG's actual pixels, including responsive sizes.
    const visibleH=h*96/markWidth;camera.position.set(0,0,(visibleH/2)/Math.tan(camera.fov*Math.PI/360));camera.lookAt(0,0,0);
    if(visible)draw();
  }
  function fail(){
    if(failed||disposed)return;failed=true;tween?.kill();stop();host.style.opacity='0';mark.style.removeProperty('opacity');root.dataset.identity3d='fallback';
  }
  canvas.addEventListener('webglcontextlost',fail,{signal:events.signal});
  art.addEventListener('pointermove',e=>{if(!pointer.matches)return;const r=art.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1))*.08;targetY=Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))*.06;},{signal:events.signal,passive:true});
  art.addEventListener('pointerleave',()=>{targetX=0;targetY=0;},{signal:events.signal,passive:true});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&pageVisible){tween?.resume();start();}else{tween?.pause();stop();}},{threshold:0});observer.observe(art);
  const resizer=new ResizeObserver(resize);resizer.observe(art);
  function setPageVisible(value:boolean){pageVisible=value&&!document.hidden;if(pageVisible&&visible){tween?.resume();start();}else{tween?.pause();stop();}}
  document.addEventListener('visibilitychange',()=>setPageVisible(!document.hidden),{signal:events.signal});
  resize();draw();root.dataset.identity3d='ready';root.dataset.identityPhase='assembly';
  return {
    setAssembled(value){
      if(disposed||failed||assembled===value)return;
      assembled=value;tween?.kill();
      root.dataset.identityPhase=value?'volume':'flattening';
      tween=gsap.to(volume,{value:value?1:0,duration:value?1.15:.55,ease:'power2.inOut',paused:!visible||!pageVisible,
        onUpdate:()=>{root.dataset.identityVolume=volume.value.toFixed(4);if(visible&&pageVisible)start();},
        onComplete:()=>{root.dataset.identityPhase=value?'3d':'assembly';if(!value){angle=HOME.y;mx=0;my=0;targetQuaternion.setFromEuler(new Euler(HOME.x,HOME.y,0));draw();stop();}},
      });
    },
    setPageVisible,
    dispose(){
      if(disposed)return;disposed=true;tween?.kill();stop();events.abort();observer.disconnect();resizer.disconnect();
      host.style.opacity='0';mark.style.removeProperty('opacity');
      for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();environment?.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();root.dataset.identity3d='disposed';
    },
  };
}
