// Fake cluster renderer adapted from DukeAPenguin EVAHUD tests (MIT).
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert'),Module=require('module');
const ROOT=path.resolve(__dirname,'../..'), STAGE=path.join(ROOT,'dist/dragon_super');
const PROFILE=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/goku-hud/g20-id7-display-profile.json')));
function inkClearance(x,y) {
 const p=PROFILE.safeEnvelope;let inside=false,nearest=Infinity;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const a=p[j],b=p[i],dx=b[0]-a[0],dy=b[1]-a[1];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  nearest=Math.min(nearest,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));
 }
 return inside?nearest:-nearest;
}
function assertPhotoBezel(layers) {
 for(const l of layers){
  if(l.kind!=='image'||!l.rgba)continue;
  assert.equal(l.w,l.iw,'bezel test requires native-size pixels');assert.equal(l.h,l.ih);
  let nearest=Infinity;
  for(let y=0;y<l.ih;y++)for(let x=0;x<l.iw;x++){
   if(l.rgba[(y*l.iw+x)*4+3]<PROFILE.alphaThreshold)continue;
   nearest=Math.min(nearest,inkClearance(l.x+x+.5,l.y+y+.5));
  }
  assert(nearest>=PROFILE.minimumInkClearance,'opaque artwork crosses the photo-derived clearance envelope: '+nearest.toFixed(2)+' px');
 }
}
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
// Reproduce a real 0.4.0 installation with its saved centre-only default.
fs.writeFileSync(path.join(dir,'settings.json'),JSON.stringify({demo:'off',screens:'both',clusterStyle:'oem',clusterFit:'90',alertsOn:true,alertPreview:'afr'}));
const messages=[];
const log={info:()=>{},warn:s=>messages.push(s),error:s=>messages.push(s),debug:()=>{}};
const hu=require(path.join(ROOT,'kit/tools/hu-stub')).headUnit(STAGE,{live:true,dataDir:dir,log,image:()=>Promise.resolve()});
hu.start();
(async()=>{
 await wait(900);
 assert.equal(instances.length,2);
 const [hud,dash]=instances;
 assert.equal(hu.spec.version,JSON.parse(fs.readFileSync(path.join(ROOT,'apps/dragon_super/app.json'))).version,'test requires a current staged build');
 assert.equal(hu.settings.get('alertsOn'),false,'unvalidated custom alerts remained enabled after update');
 assert.equal(hu.settings.get('alertPreview'),'off','old preview selection was not cleared');
 assert.equal(hu.settings.get('clusterStyle'),'performance','saved 0.4.0 centre default was not migrated');
 assert.equal(dash.target,'panel','upgraded app did not take the whole cluster');
 assert.deepEqual(dash.size,[1920,720]);
 const saved=JSON.parse(fs.readFileSync(path.join(dir,'settings.json')));
 assert.equal(saved._reset_clusterStyle,1,'one-time migration marker was not persisted');
 // Selecting the optional centre design later remains a deliberate user choice.
 hu.settings.set('clusterStyle','oem');
 const reloaded=new hu.settings.constructor(hu.spec.settings);
 assert.equal(reloaded.get('clusterStyle'),'oem','migration ran again over a later user choice');
 assert.equal(dash.target,'map');assert.deepEqual(dash.size,[1088,480]);
 hu.settings.set('clusterStyle','performance');
 assert.equal(dash.target,'panel');assert.deepEqual(dash.size,[1920,720]);
 const full=dash.widgets.get('frame').w;
 assert.deepEqual([full.x,full.y,full.w,full.h],[0,0,1920,660]);
 const gauges=dash.widgets.get('display').w.parts.filter(p=>p.type==='bmwgauge');
 assert.deepEqual(gauges.map(p=>p.signal),['speed','rpm'],'full design must redraw both side gauges');
 // Rectangle updates replace pixels; overlapping the dragon with a different
 // part would erase its head or leave fragments after a speed/gear change.
 const parts=dash.widgets.get('display').w.parts;
 for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
  const a=parts[i],b=parts[j];
  assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'overlapping display parts: '+a.id+' / '+b.id);
 }
 assert(!hu.spec.settings.some(s=>s.key==='clusterFit'),'new layout must not expose an inactive scale control');
 // Saved fit values from 0.4.4 must not scale the new native-pixel layout.
 for(const fit of ['90','95','100']){
  hu.settings.set('clusterFit',fit);dash._rebuild();
  const layer=dash.client.layers.get(dash.widgets.get('goku').ref);
  assert.deepEqual([layer.x,layer.y,layer.w,layer.h,layer.iw,layer.ih],[800,93,320,450,320,450]);
  for(const l of dash.client.layers.values()){
   assert(l.x>=0&&l.y>=0&&l.x+l.w<=1920&&l.y+l.h<=660,'native artwork escaped app region');
   if(l.kind==='image')assert(l.w===l.iw&&l.h===l.ih,'native artwork was scaled');
  }
 }
 const bottom=dash.widgets.get('mode').w;
 for(let i=0;i<bottom.parts.length;i++)for(let j=i+1;j<bottom.parts.length;j++){
  const a=bottom.parts[i],b=bottom.parts[j];
  assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'overlapping bottom parts: '+a.id+' / '+b.id);
 }
 // Reproduce the photographed 14.5 alert: a transient must not trip, and a
 // sustained trip must not relabel a normal recovered AFR as the trigger.
 const {AlertEngine}=require(path.join(STAGE,'source/javascript/eva_alerts'));
 const e=new AlertEngine({armMs:0,thresholds:{afrLow:10.6,afrHigh:18.4}});
 const input=(v,at)=>({rpm:1800,pedal:85,values:{afr:{v,at}}});
 assert.equal(e.update(0,input(20,0)),null);
 assert.equal(e.update(100,input(14.5,100)),null,'single transient produced a full-screen warning');
 assert.equal(e.update(200,input(20,200)),null);
 const trip=e.update(1800,input(20,1800));assert.equal(trip.id,'afr');assert.equal(trip.value,20);
 const clearing=e.update(1900,input(14.5,1900));assert.equal(clearing.value,20,'recovered 14.5 was shown as the triggering value');
 assert.equal(e.update(3950,input(14.5,3950)),null);
 const stale=new AlertEngine({armMs:0,thresholds:{afrHigh:18.4}});
 assert.equal(stale.update(0,input(20,0)),null);
 assert.equal(stale.update(4000,input(20,0)),null);
 assert.equal(stale.update(4001,input(20,4001)),null,'stale data completed an earlier AFR pending timer');
 // Exercise the real FES subscription instead of assigning driveMode directly.
 for(const [wire,mode] of [[7,'eco'],[4,'comfort'],[1,'sport']]){
  hu.feed('de.bmw.infotainment.drivingexcitement.FES','statusFESVehicleDynamicSwitchHMI',{actualValueModeDrivingExperience:wire});
  dash._tick();assert.equal(hud.driveMode,mode);assert.equal(hud.activeName,mode);assert.equal(dash.activeName,mode);
 }
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
    if(instance===dash&&style==='performance')assert(Array.from(instance.client.layers.values()).every(l=>l.y+l.h<=660),'covered native BMW status strip');
    if(instance===dash&&style==='performance')assertPhotoBezel(Array.from(instance.client.layers.values()));
   }
   if(snapshots)snapshots.push({style,mode,pedal,dataState:'live',layers:Array.from(dash.client.layers.values()).map(l=>Object.assign({},l,{rgba:l.rgba?l.rgba.toString('base64'):undefined}))});
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
 // Capture the photographed no-data state too, rather than previewing only a
 // healthy stream. This includes the real amber status text and -- readouts.
 if(snapshots)for(const mode of ['eco','comfort','sport']){
  hud.driveMode=mode;hud._rebuild();dash._rebuild();dash._tick();await wait(270);
  assertPhotoBezel(Array.from(dash.client.layers.values()));
  snapshots.push({style:'performance',mode,pedal:0,dataState:'missing',layers:Array.from(dash.client.layers.values()).map(l=>Object.assign({},l,{rgba:l.rgba?l.rgba.toString('base64'):undefined}))});
 }
 // A panel yields all content to BMW popups, and restores it afterwards.
 dash.popups.poll=()=>{};dash.popups.shown=()=>true;assert(dash._yieldToPopup(Date.now()));assert(dash.client.shown().length===0);
 dash.popups.shown=()=>false;assert(!dash._yieldToPopup(Date.now()));assert(dash.client.shown().length>0);
 if(snapshots)fs.writeFileSync(path.join(ROOT,'dist/goku-test-snapshots.json'),JSON.stringify(snapshots));
 hu.settings.set('screens','off');await wait(300);
 assert(instances.every(x=>x.activeName==='off'));
 assert(!messages.some(s=>/missing|unusable|failed|wrong|refused|no glyph/.test(s)),messages.join(' | '));
 console.log('PASS native-size photo-fit layout ignores legacy 90/95/100%, non-overlapping canvases, 660px cover, missing-data captures, alert migration, AFR regressions, modes, animation, reconnect, renderer budgets, BMW popup yield and Off');
 process.exit(0);
})().catch(e=>{console.error(e.stack,messages);process.exit(1)});
