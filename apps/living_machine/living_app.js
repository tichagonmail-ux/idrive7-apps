'use strict';
const path=require('path');
const {ClusterRender,DEFAULT_PATH}=require('./cluster_render_client');
const {PopupWatch}=require('./eva_popups');
const {TextCanvas}=require('./eva_canvas');
const {Canvas}=require('./kit/canvas');
const Model=require('./living_model'),Text=require('./living_text'),Signals=require('./living_signals'),Coexistence=require('./living_coexistence');
const db=require('./kit/pack').open(path.join(__dirname,'resources'));
const Typography=require('./living_typography'),Atlas=require('./living_atlas');
class LivingApp{
    constructor(ctx,deps){
        deps=deps||{};this.ctx=ctx;this.client=deps.client||new ClusterRender(ctx.spec.id,process.env.HUD_CLUSTER_SOCKET||DEFAULT_PATH);
        this.signals=deps.signals||new Signals(ctx);this.popups=deps.popups||new PopupWatch({log:ctx.log});
        this.checkConflict=deps.conflict||(()=>Coexistence.inspect());
        this.profile=0;this.profileNames=['normal','low-memory'];this.engine=new Model.Engine();this.refs={};this.assets={};this.failure=null;this.mode=null;this.lastTextAt=0;this.lastConflictAt=-1e9;this.conflict=null;this.coexistenceWarning=null;this.lastStatus=null;this.started=false;
        this.client.on('ready',()=>{this.failure=null;this.profile=0;this.drop();this.safeTick(Date.now());});
        this.client.on('refused',(op,ref,reason)=>this.refused(op,ref,reason));
        this.client.on('layer',(ref,state,reason)=>{if(state==='error')this.refused('layer',ref,reason);});
        this.client.on('disconnected',()=>this.status('Renderer disconnected — waiting to reconnect'));
        ctx.settings.onChange(key=>{
            if(key==='screens'){this.failure=null;this.profile=0;this.lastConflictAt=-1e9;}
            this.drop();this.safeTick(Date.now());
        });
    }
    setting(k){return this.ctx.settings.get(k);}
    options(){return {mode:this.setting('driveMode'),animation:this.setting('animation'),wheels:this.setting('wheels'),exhaust:this.setting('exhaust'),
        comfortExhaust:this.setting('comfortExhaust'),intensity:this.setting('intensity')/100,lowEffects:this.setting('lowEffects'),redline:this.setting('redline')};}
    start(){
        if(this.started)return;this.started=true;this.signals.start();this.client.connect();
        this.timer=setInterval(()=>this.safeTick(Date.now()),50);
        this.status('Off — BMW instrument cluster');
    }
    safeTick(now){try{this.tick(now);}catch(e){this.failure=e.message;this.drop();this.status('Stopped: '+e.message);this.ctx.log.error(e.stack);}}
    status(value){
        if(value===this.lastStatus)return;this.lastStatus=value;
        const result=this.ctx.ui.text('STATUS',value);
        if(result&&result.catch)result.catch(e=>this.ctx.log.warn('Status row: '+e.message));
    }
    drop(){
        // The renderer refuses an asset while any layer still samples it.
        const all=Array.from(this.client.layers.keys()).sort((a,b)=>
            (this.client.layers.get(a).kind==='asset'?1:0)-(this.client.layers.get(b).kind==='asset'?1:0));
        all.forEach(ref=>this.client.drop(ref));this.refs={};this.assets={};this.mode=null;this.textCanvas=null;this.hidden=false;
    }
    stop(){clearInterval(this.timer);this.drop();this.client.close();this.signals.close();this.started=false;}
    refused(op,ref,reason){
        const layer=this.client.layers.get(ref);if(!layer)return;
        const memory=(layer.kind==='asset'||layer.kind==='image')&&/pixel|memory|budget|alloc|capacity|out.of/i.test(String(reason));
        this.drop();
        if(memory&&this.profile===0){this.profile=1;this.failure=null;this.status('Retrying with low-memory textures');return;}
        this.failure='Renderer refused '+op+': '+reason;this.status(this.failure);
    }
    makeAsset(name){
        const image=db.json(name+(this.profile?'-low':'')+'.json'),pixels=Buffer.from(image.rgba||'','base64');
        if(!image.w||pixels.length!==image.w*image.h*4)throw Error('Invalid '+name+' texture');
        const ref=this.client.asset({target:'panel',format:'rgba8',w:image.w,h:image.h,sampling:'bilinear'});
        if(!ref)throw Error('Renderer cannot allocate '+name+' asset');
        this.client.pixels(ref,null,pixels);this.assets[name]=ref;return ref;
    }
    create(state){
        const shaders=db.json('shaders.json'),metadata=db.json('car-metadata.json');
        this.makeAsset('body');this.makeAsset('wheels');this.makeAsset('city');
        for(const [name,z,x,y,w,h] of [['background',0,0,0,1920,660],['gauges',2,0,0,1920,660],['car',3,390,110,1140,520]]){
            const ref=this.client.effect({target:'panel',klass:'content',z,x,y,w,h,fs:shaders[name]});
            if(!ref)throw Error('Renderer cannot create '+name);
            this.refs[name]=ref;
            this.client.animate(ref,{property:'uniform',name:'u_phase',keys:[[0,0],[60000,60]],loop:true});
        }
        this.client.bind(this.refs.background,'u_city',this.assets.city);
        const car=this.refs.car;this.client.bind(car,'u_car',this.assets.body);this.client.bind(car,'u_wheels',this.assets.wheels);
        for(const [key,value] of [['u_frontCentre',metadata.front.centre],['u_rearCentre',metadata.rear.centre],
            ['u_frontRadius',metadata.front.radius],['u_rearRadius',metadata.rear.radius],['u_pipeA',metadata.pipes[0]],['u_pipeB',metadata.pipes[1]]])this.client.uniform(car,key,value);
        this.atlas=Atlas.layout(Text.items(state));
        this.assets.text=this.client.asset({target:'panel',format:'rgba8',w:this.atlas.w,h:this.atlas.h,sampling:'nearest'});
        if(!this.assets.text)throw Error('Renderer cannot allocate text atlas');
        this.client.pixels(this.assets.text,null,Buffer.alloc(this.atlas.w*this.atlas.h*4));
        this.makeText(state,true);
    }
    makeText(state,force){
        const items=Text.items(state);
        if(!this.textCanvas||this.mode!==state.mode){
            this.mode=state.mode;
            if(this.refs.text)this.client.drop(this.refs.text);
            this.refs.text=this.client.effect({target:'panel',klass:'content',z:5,x:0,y:0,w:1920,h:660,fs:Atlas.shader(items,this.atlas)});
            if(!this.refs.text)throw Error('Renderer cannot allocate text effect');
            this.client.bind(this.refs.text,'u_text',this.assets.text);
            this.client.pixels(this.assets.text,null,Buffer.alloc(this.atlas.w*this.atlas.h*4));
            const parts=items.map(p=>Object.assign({},p,this.atlas.slots[p.id]));
            this.textCanvas=new TextCanvas(parts,{
                key:p=>{const item=this.currentText.find(v=>v.id===p.id)||p;return JSON.stringify([item.text,item.colour,item.size]);},
                paint:(p,look)=>{const value=JSON.parse(look),cv=new Canvas(p.w,p.h);Typography.paint(cv,value[0],p.w/2,p.h*.80,value[2],value[1],p.font);return Buffer.from(cv.d);},
                onError:(p,e)=>{throw Error('Text '+p.id+': '+e.message);},rateMs:160});
        }
        this.currentText=items;
        for(const update of this.textCanvas.updates(Date.now(),force))this.client.pixels(this.assets.text,[update.rect],update.px);
    }
    tick(now){
        if(this.setting('screens')!=='panel'){
            if(this.client.layers.size)this.drop();this.status('Off — BMW instrument cluster');return;
        }
        if(now-this.lastConflictAt>1000){
            const result=this.checkConflict();
            const detail=result&&typeof result==='object'?result:{conflict:result,warning:null};
            this.conflict=detail.conflict||null;
            const warning=detail.warning||null;
            if(warning!==this.coexistenceWarning&&warning)this.ctx.log.warn(warning);
            this.coexistenceWarning=warning;this.lastConflictAt=now;
        }
        if(this.conflict){if(this.client.layers.size)this.drop();this.status('Blocked: '+this.conflict);return;}
        if(this.failure){this.status(this.failure);return;}
        if(!this.client.ready){this.status('Connecting to cluster-render');return;}
        this.popups.poll(now);
        const yielding=this.popups.shown(0x202,now);
        if(yielding){
            if(!this.hidden)Object.keys(this.refs).forEach(k=>this.client.set(this.refs[k],{visible:0}));
            this.hidden=true;
            this.status('Yielding to BMW popup');return;
        }
        const input=this.setting('demo')==='on'?Model.demo(5,80,3200,65,this.setting('driveMode')==='auto'?'comfort':this.setting('driveMode')):this.signals.data(now);
        const state=this.engine.step(input,this.options(),now);this.state=state;
        if(!this.refs.background)this.create(state);
        if(this.hidden)Object.keys(this.refs).forEach(k=>this.client.set(this.refs[k],{visible:1}));
        this.hidden=false;
        for(const ref of [this.refs.background,this.refs.gauges,this.refs.car]){
            const u=(name,value)=>this.client.uniform(ref,name,Array.isArray(value)?value:[value]);
            u('u_mode',state.modeIndex);u('u_previous',state.previousMode);u('u_transition',state.transition);
            u('u_speed',state.roadSpeed);u('u_load',state.load);u('u_shift',state.shift);u('u_startup',state.startup);u('u_low',state.lowEffects?1:0);
        }
        const gauges=this.refs.gauges,car=this.refs.car;
        const uniform=(ref,k,v)=>this.client.uniform(ref,k,Array.isArray(v)?v:[v]);
        uniform(this.refs.background,'u_measure',this.setting('measurement')?1:0);
        uniform(gauges,'u_speedRatio',state.speed===null?0:Model.clamp(state.speed/330,0,1));
        uniform(gauges,'u_rpmRatio',state.rpm===null?0:Model.clamp(state.rpm/8000,0,1));
        uniform(gauges,'u_pedalRatio',state.pedal===null?0:state.pedal/100);
        uniform(gauges,'u_speedValid',state.speed===null?0:1);uniform(gauges,'u_rpmValid',state.rpm===null?0:1);uniform(gauges,'u_pedalValid',state.pedal===null?0:1);
        uniform(gauges,'u_redline',state.redline/8000);
        uniform(car,'u_wheelAngles',[state.frontAngle,state.rearAngle]);uniform(car,'u_wheelEnabled',state.wheelEnabled?1:0);
        uniform(car,'u_exhaust',state.exhaust);uniform(car,'u_squat',state.squat);
        if(now-this.lastTextAt>=160){this.makeText(state);this.lastTextAt=now;}
        const extra=this.setting('diagnostics')?' | textures '+this.profileNames[this.profile]+' | layers '+this.client.layers.size+' | signals '+Object.keys(input).join(','):'';
        this.status('Living Machine / '+state.mode.toUpperCase()+' / '+state.status+(this.coexistenceWarning?' / '+this.coexistenceWarning:'')+extra);
    }
}
module.exports={LivingApp};
