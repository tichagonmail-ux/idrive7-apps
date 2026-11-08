// Fake cluster renderer adapted from DukeAPenguin EVAHUD tests (MIT).
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert'),Module=require('module');
const ROOT=path.resolve(__dirname,'../..'), STAGE=path.join(ROOT,'dist/dragon_super');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class FakeClient {
    constructor(name) {
        this.name = name;
        this.ready = false;
        this.backend = 'test';
        this.layers = new Map();
        this.handlers = {};
        this.nextRef = 1;
        this.refused = [];
        this.writes = 0;
        this.uniformCalls = 0;
        this.sent = [];
        FakeClient.all.push(this);
    }
    on(ev, fn) { this.handlers[ev] = fn; return this; }
    emit(ev, ...a) { if (this.handlers[ev]) this.handlers[ev](...a); }
    connect() { setImmediate(() => { this.ready = true; this.emit('ready'); }); }
    close() { this.ready = false; }
    _add(kind, o) {
        const ref = this.nextRef++;
        if (this.layers.size >= 8) { this.refused.push(o.target + ': too many layers'); return ref; }
        const bytes = kind === 'image' ? o.iw * o.ih * 4 * 2 : 0;
        if (FakeClient.memory() + bytes > 16 * 1024 * 1024) { this.refused.push(o.target + ': pixel memory is full'); return ref; }
        this.layers.set(ref, Object.assign({ kind, visible: 1, bytes }, o));
        return ref;
    }
    image(o) { return this._add('image', o); }
    effect(o) { return this._add('effect', o); }
    set(ref, o) { Object.assign(this.layers.get(ref) || {}, o); }
    uniform(ref, name, v) { this.uniformCalls++; const l = this.layers.get(ref); if (l) (l.uniforms = l.uniforms || {})[name] = v; }
    uniformsOf(test) { const l = Array.from(this.layers.values()).find(test); return (l && l.uniforms) || {}; }
    pixels(ref, rects, px) { this.writes++; this.sent.push({ ref, rects, px }); }
    drop(ref) { this.layers.delete(ref); }
    targets() { return Array.from(new Set(Array.from(this.layers.values()).map((l) => l.target))); }
    shown() { return Array.from(this.layers.values()).filter((l) => l.visible); }
    alertLayers() { return this.shown().filter((l) => l.klass === 'alert'); }
}
FakeClient.all = [];
FakeClient.memory = () => FakeClient.all.reduce((n, c) => n + Array.from(c.layers.values()).reduce((m, l) => m + l.bytes, 0), 0);


const instances=[];
const real=Module._load;
Module._load=function(req){
 if(/cluster_render_client/.test(req))return {ClusterRender:FakeClient,DEFAULT_PATH:'/nonexistent'};
 const m=real.apply(this,arguments);
 if(req==='./dragon_hud'){
  const wrap=C=>class extends C{constructor(...a){super(...a);instances.push(this);}};
  return {DragonHud:wrap(m.DragonHud),DragonDash:wrap(m.DragonDash)};
 }
 return m;
};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'db-test-'));
fs.writeFileSync(path.join(dir,'settings.json'),JSON.stringify({demo:'off',screens:'both'}));
const messages=[];
const log={info:()=>{},warn:s=>messages.push(s),error:s=>messages.push(s),debug:()=>{}};
const hu=require(path.join(ROOT,'kit/tools/hu-stub')).headUnit(STAGE,{live:true,dataDir:dir,log,image:()=>Promise.resolve()});
hu.start();
(async()=>{
 await wait(900);
 assert.equal(instances.length,2);
 const [hud,dash]=instances;
 for(const mode of ['eco','comfort','sport']){
  hud.driveMode=mode;
  hud.car.data=()=>({speed:80,stage:'D',gear:4,rpm:3200,oil:99,coolant:90,torque:300});
  hud._rebuild();dash._tick();
  await wait(350);
  assert.equal(hud.activeName,mode);assert.equal(dash.activeName,mode);
  for(const instance of instances){
   assert(!instance.problem,instance.problem);
   const widget=instance.widgets.get('display');assert(widget,'missing display');
   const part=widget.w.parts.find(p=>p.type==='character');
   const pixels=instance._partPixels(part,mode);assert(pixels.some(x=>x!==0));
   assert(!instance.client.refused.length,instance.client.refused.join());
   const full=Buffer.alloc(widget.w.w*widget.w.h*4);
   for(const p of widget.w.parts){
    const px=instance._partPixels(p,instance._partLook(p,Date.now()));
    for(let y=0;y<p.h;y++)px.copy(full,((p.y+y)*widget.w.w+p.x)*4,y*p.w*4,(y+1)*p.w*4);
   }
   fs.writeFileSync(dir+'/'+(instance===dash?'dash':'hud')+'-'+mode+'.rgba',full);
  }
 }
 for(const key of ['knock','heat','boost','fuel','afr','multi']){
  for(const instance of instances){instance.alertShow={preview:true,kind:key,count:2,value:2.1,ids:['heat','boost']};assert(instance._alertLayoutFor(key));instance._showAlert(key,Date.now());assert(instance.alertLayers);instance._showAlert(null,Date.now());}
 }
 hu.settings.set('screens','off');await wait(300);
 assert(instances.every(x=>x.activeName==='off'));
 assert(!messages.some(s=>/missing|unusable|failed|wrong|refused|no glyph/.test(s)),messages.join(' | '));
 console.log('PASS three forms on both displays, image pixels, all six alerts, layer budgets and off switch');
 process.exit(0);
})().catch(e=>{console.error(e.stack,messages);process.exit(1)});
