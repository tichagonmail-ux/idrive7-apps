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
    pixels(ref, rects, px) {
        this.writes++;this.sent.push({ref,rects,px});
        const l=this.layers.get(ref);if(!l)return;
        if(!l.rgba)l.rgba=Buffer.alloc(l.iw*l.ih*4);
        if(!rects){px.copy(l.rgba);return;}
        let at=0;for(const r of rects)for(let y=0;y<r.h;y++){px.copy(l.rgba,((r.y+y)*l.iw+r.x)*4,at,at+r.w*4);at+=r.w*4;}
    }
    animate(ref, o) {
        const l=this.layers.get(ref);if(!l)return 0;
        const n=o.property==='uniform'?2:4;
        assert(o.keys.every(k=>k.length===n),'cluster-render animation vector width');
        const id=(l.nextAnim||0)+1;l.nextAnim=id;(l.animations=l.animations||{})[id]=o;return id;
    }
    stop(ref,id) { const l=this.layers.get(ref);if(l&&l.animations)delete l.animations[id]; }
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
 const snapshots=process.env.GOKU_CAPTURE?[]:null;
 const {pose,keys,FRAMES}=require(path.join(ROOT,'apps/dragon_super/goku_animation'));
 assert.equal(FRAMES,12);
 assert.equal(pose('sport',30,3000,'idle').stance,'charge');
 assert.equal(pose('sport',20,3000,'charge').stance,'charge');
 assert.equal(pose('sport',14,3000,'charge').stance,'idle');
 for(const bad of [null,undefined,NaN,Infinity])assert.equal(pose('sport',bad,3000,'charge').stance,'idle');
 assert.equal(pose('sport',100,0,'charge').stance,'idle');
 for(const state of ['idle','charge'])for(const property of ['scale','translate']){
  const k=keys(state)[property];assert.equal(k.length,13);assert.deepEqual(k[0].slice(1),k[12].slice(1));
 }
 for(const style of ['oem','performance']){
  hu.settings.set('clusterStyle',style);await wait(80);
  for(const mode of ['eco','comfort','sport'])for(const pedal of [0,85]){
   hud.driveMode=mode;hud.pedalNow=pedal;hud.rpmF=3200;hud.car.lastCar=Date.now();
   hud.car.data=()=>({speed:80,stage:'D',gear:4,rpm:3200,oil:105,coolant:94,torque:300,demo:false});
   hud._rebuild();dash._rebuild();dash._tick();await wait(270);
   assert.equal(hud.activeName,mode);assert.equal(dash.activeName,mode);
   assert.equal(dash.target,style==='oem'?'map':'panel');
   for(const instance of instances){
    assert(!instance.problem,instance.problem);
    const widget=instance.widgets.get('goku');assert(widget,'missing Goku layer');
    const pixels=instance._characterPixels(widget.w,instance._pose());assert(pixels.some(x=>x!==0));
    assert.equal(widget.stance,pedal?'charge':'idle');
    const writes=instance.client.writes;instance._update(widget,Date.now(),false);assert.equal(instance.client.writes,writes,'unchanged pose uploaded pixels');
    assert(!instance.client.refused.length,instance.client.refused.join());
    assert(instance.client.layers.size<=8);
    if(instance===dash&&style==='performance')assert(Array.from(instance.client.layers.values()).every(l=>l.y+l.h<=640),'covered native BMW status strip');
   }
   if(snapshots)snapshots.push({style,mode,pedal,layers:Array.from(dash.client.layers.values()).map(l=>Object.assign({},l,{rgba:l.rgba?l.rgba.toString('base64'):undefined}))});
   for(const key of ['knock','heat','boost','fuel','afr','multi']){
    for(const instance of instances){instance.alertShow={preview:true,kind:key==='multi'?'multi':'single',id:key,count:2,value:2.1,ids:['heat','boost']};assert(instance._alertLayoutFor(key));instance._showAlert(key,Date.now());assert(instance.alertLayers);assert(!instance.client.refused.length,instance.client.refused.join());}
    assert(FakeClient.memory()<=16*1024*1024,'exceeded renderer memory budget');
    for(const instance of instances)instance._showAlert(null,Date.now());
   }
   // A renderer reconnect recreates all layers and re-arms compositor animations.
   hud.client.emit('ready');dash.client.emit('ready');dash._tick();
   assert.equal(dash.widgets.get('goku').stance,pedal?'charge':'idle');
  }
 }
 // A missing pedal or a stale vehicle stream immediately releases the charging pose.
 hud.car.lastCar=Date.now()-4000;hud.pedalNow=100;
 for(const instance of instances){const w=instance.widgets.get('goku');instance._update(w,Date.now(),false);assert.equal(w.stance,'idle');assert.equal(instance._raw('speed'),null);}
 // A panel yields all content to BMW popups, and restores it afterwards.
 dash.popups.poll=()=>{};dash.popups.shown=()=>true;assert(dash._yieldToPopup(Date.now()));assert(dash.client.shown().length===0);
 dash.popups.shown=()=>false;assert(!dash._yieldToPopup(Date.now()));assert(dash.client.shown().length>0);
 if(snapshots)fs.writeFileSync(path.join(ROOT,'dist/goku-test-snapshots.json'),JSON.stringify(snapshots));
 hu.settings.set('screens','off');await wait(300);
 assert(instances.every(x=>x.activeName==='off'));
 assert(!messages.some(s=>/missing|unusable|failed|wrong|refused|no glyph/.test(s)),messages.join(' | '));
 console.log('PASS three forms, two cluster designs, idle/charge, stale signals, GPU keyframes, reconnect, all alerts on both displays, BMW popup priority, native strip, memory/layer limits and Off');
 process.exit(0);
})().catch(e=>{console.error(e.stack,messages);process.exit(1)});
