'use strict';
const fs=require('fs'),path=require('path');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',process.cwd()]}));
const ROOT=path.resolve(__dirname,'../..');
const VERSION=JSON.parse(fs.readFileSync(path.join(ROOT,'apps/dragon_super/app.json'))).version;
(async()=>{
 const rows=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/goku-test-snapshots.json')));
 for(const row of rows)for(const l of row.layers){
  if(l.rgba){const png=await sharp(Buffer.from(l.rgba,'base64'),{raw:{width:l.iw,height:l.ih,channels:4}}).png().toBuffer();l.png='data:image/png;base64,'+png.toString('base64');delete l.rgba;}
  delete l.bytes;
 }
 const script=String.raw`
const rows=DATA;
let mode='sport',style='performance',pedal=85,rendered='',layers=[],start=performance.now();
const viewport=document.querySelector('#viewport'),stage=document.querySelector('#stage');
window.previewErrors=[];
function compile(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function effect(c,l){
 const gl=c.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable');
 const p=gl.createProgram();
 gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,'attribute vec2 a_position; varying vec2 v_uv; void main(){ gl_Position=vec4(a_position,0.,1.);v_uv=vec2((a_position.x+1.)*.5,(1.-a_position.y)*.5);}'));
 gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,l.fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const a=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.viewport(0,0,c.width,c.height);
 function uniform(n,v){const k=gl.getUniformLocation(p,n);if(k!==null)gl['uniform'+v.length+'fv'](k,v);}
 for(const [n,v]of Object.entries(l.uniforms||{}))uniform(n,v);
 return {gl,draw:t=>{uniform('u_phase',[t%12]);uniform('u_charge',[pedal/100]);gl.drawArrays(gl.TRIANGLES,0,6);}};
}
function resize(){const w=style==='performance'?1920:1088,h=style==='performance'?660:480;viewport.style.aspectRatio=w+'/'+h;stage.style.width=w+'px';stage.style.height=h+'px';stage.style.transform='scale('+(viewport.clientWidth/w)+')';}
function render(){
 const stance=pedal>=25?85:0,key=mode+style+stance;
 if(key===rendered)return;
 for(const l of layers)if(l.gl){const e=l.gl.getExtension('WEBGL_lose_context');if(e)e.loseContext();}
 layers=[];stage.innerHTML='';rendered=key;start=performance.now();
 const row=rows.find(r=>r.mode===mode&&r.style===style&&r.pedal===stance);
 for(const l of row.layers.filter(l=>l.visible).sort((a,b)=>a.z-b.z)){
  const el=l.png?document.createElement('img'):document.createElement('canvas');
  Object.assign(el.style,{position:'absolute',left:l.x+'px',top:l.y+'px',width:l.w+'px',height:l.h+'px',zIndex:l.z,transformOrigin:'center'});
  let draw=()=>{};
  if(l.png){el.src=l.png;const anims=Object.values(l.animations||{});for(const a of anims){if(a.property==='scale'||a.property==='translate'){
   const end=a.keys[a.keys.length-1][0];el.animate(a.keys.map(k=>({offset:k[0]/end,[a.property==='scale'?'scale':'translate']:a.property==='scale'?k[1]+' '+k[2]:k[1]+'px '+k[2]+'px'})),{duration:end,iterations:Infinity});
  }}}
  else{el.width=l.w;el.height=l.h;const e=effect(el,l);draw=e.draw;layers.push(e);}
  stage.appendChild(el);
 }
 resize();document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
 document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.style===style));
 document.querySelector('#stance').textContent=stance?'CHARGING':'IDLE';
}
function frame(now){for(const l of layers)l.draw((now-start)/1000);requestAnimationFrame(frame);}
window.setGoku=(m,p,s)=>{if(m)mode=m;if(p!==undefined){pedal=p;document.querySelector('#pedal').value=p;}if(s)style=s;try{render();}catch(e){window.previewErrors.push(e.message);document.querySelector('#error').textContent=e.message;}};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>window.setGoku(b.dataset.mode);
for(const b of document.querySelectorAll('[data-style]'))b.onclick=()=>window.setGoku(null,undefined,b.dataset.style);
document.querySelector('#pedal').oninput=e=>window.setGoku(null,+e.target.value);
window.addEventListener('resize',resize);window.setGoku(mode,pedal,style);requestAnimationFrame(frame);
`.replace('DATA',JSON.stringify(rows));
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Goku HUD 0.4.0</title><style>*{box-sizing:border-box}body{margin:0;background:#080b11;color:#dce7ef;font:14px system-ui}header,footer{max-width:1500px;margin:auto;padding:22px 28px}header{display:flex;align-items:center;gap:18px;flex-wrap:wrap}h1{font-size:20px;letter-spacing:.12em;margin:0 auto 0 0}small{font-size:11px;color:#708496;letter-spacing:.1em}button{border:1px solid #273746;border-radius:6px;background:#0e151f;color:#a6bacb;padding:11px 18px;cursor:pointer}button[aria-pressed=true]{border-color:#ff4e42;color:white;background:#391d21}#viewport{position:relative;width:100%;overflow:hidden;background:#000}#stage{transform-origin:top left;position:absolute}footer{display:flex;gap:24px;align-items:center;flex-wrap:wrap}input{width:260px;accent-color:#ff4b42}#error{color:#ff6358}#stance{color:#ff6455;letter-spacing:.15em;font-size:12px}</style><header><h1>GOKU HUD <small>0.4.0 · INTERACTIVE PREVIEW</small></h1><button data-mode="eco">ECO PRO</button><button data-mode="comfort">COMFORT</button><button data-mode="sport">SPORT</button></header><div id="viewport"><div id="stage"></div></div><footer><button data-style="performance">Performance</button><button data-style="oem">BMW centre slot</button><label>Accelerator <input id="pedal" type="range" min="0" max="100" value="85"></label><span id="stance"></span><small>SIMULATED VEHICLE VALUES · ORIGINAL BMW GAUGES REMAIN OUTSIDE THE CENTRE SLOT</small><span id="error"></span></footer><script>'+script+'</script></html>';
 fs.writeFileSync(path.join(ROOT,'dist/Goku-HUD-'+VERSION+'-preview.html'),html.replace(/0\.4\.0/g,VERSION));
 console.log('Built interactive preview from tested app layers; '+(Buffer.byteLength(html)/1e6).toFixed(2)+' MB');
})().catch(e=>{console.error(e);process.exit(1)});
