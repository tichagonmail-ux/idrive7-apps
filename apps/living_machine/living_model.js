'use strict';
// Shared by the head unit, reproducible tests and browser preview.
(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.LivingModel=factory();
})(typeof self!=='undefined'?self:this,function(){
    const TAU=Math.PI*2;
    const num=v=>typeof v==='number'&&isFinite(v);
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const MODES=['eco','comfort','sport'];
    const COLOURS=[[0.12,0.78,1],[0.75,0.85,0.98],[1,0.12,0.18]];
    const TYRES={front:Math.PI*(.508+2*.245*.35),rear:Math.PI*(.508+2*.275*.30)};
    function driveMode(v){
        if(typeof v==='string'&&/^\d+$/.test(v))v=Number(v);
        if(typeof v==='number')return v>=1&&v<=3?'sport':v>=7&&v<=9?'eco':v>=4&&v<=6||v===10?'comfort':null;
        if(typeof v!=='string')return null;
        v=v.toLowerCase();
        return v.indexOf('sport')===0?'sport':v.indexOf('eco')===0?'eco':v.indexOf('comfort')===0||v==='adaptive'?'comfort':null;
    }
    // One calibrated path drives shader fills, tick labels and numeric checks.
    const RAIL=[[300,558],[245,516],[211,463],[183,410],[155,357],[167,300],
        [211,246],[258,193],[333,160],[430,148],[535,144],[640,142]];
    function point(mode,kind,ratio){
        const t=clamp(ratio,0,1)*11,i=Math.min(10,Math.floor(t)),f=t-i;
        const x=RAIL[i][0]+(RAIL[i+1][0]-RAIL[i][0])*f;
        const y=RAIL[i][1]+(RAIL[i+1][1]-RAIL[i][1])*f;
        return [kind==='rpm'?1920-x:x,y];
    }
    class Engine{
        constructor(){this.last=null;this.front=0;this.rear=0;this.power=0;this.pitch=0;this.shiftAt=-1e9;this.gear=null;this.mode='comfort';this.previousMode='comfort';this.modeAt=-1e9;this.startAt=null;}
        step(input,options,now){
            options=options||{};input=input||{};
            const dt=this.last===null?0:clamp((now-this.last)/1000,0,.2);this.last=now;
            const speed=num(input.speed)&&input.speed>=0?input.speed:null;
            const rpm=num(input.rpm)&&input.rpm>=0?input.rpm:null;
            const pedal=num(input.pedal)?clamp(input.pedal,0,100):null;
            const gear=Number.isInteger(input.gear)&&input.gear>=1&&input.gear<=8?input.gear:null;
            const mode=MODES.indexOf(options.mode)>=0?options.mode:MODES.indexOf(input.mode)>=0?input.mode:'comfort';
            if(mode!==this.mode){this.previousMode=this.mode;this.mode=mode;this.modeAt=now;}
            if(this.startAt===null)this.startAt=speed!==null&&speed>0?now-1200:now;
            const enabled=options.animation!==false;
            const wheelEnabled=enabled&&options.wheels!==false;
            if(wheelEnabled&&speed!==null){
                const metres=speed/3.6*dt;
                this.front=(this.front+metres/TYRES.front*TAU)%TAU;
                this.rear=(this.rear+metres/TYRES.rear*TAU)%TAU;
            }
            if(gear!==null&&this.gear!==null&&gear!==this.gear&&speed!==null&&speed>3)this.shiftAt=now;
            this.gear=gear;
            const load=pedal===null?0:pedal/100;
            const factor=[0,0,0,.12,.28,.48,.7,1,.28][gear||0];
            const liveFX=gear!==null&&rpm!==null&&rpm>=900&&pedal!==null&&speed!==null&&speed>1;
            const highLoad=clamp((load-.38)/.62,0,1);
            const torqueLoad=num(input.torque)?clamp(input.torque/600,0,1):load;
            let target=liveFX?factor*highLoad*clamp((rpm-900)/4500,0,1)*clamp(speed/30,0,1)*(.65+.35*torqueLoad):0;
            if(gear===8)target*=.35+.65*load;
            if(mode==='eco'||mode==='comfort'&&options.comfortExhaust!==true)target=0;
            const intensity=num(options.intensity)?clamp(options.intensity,0,1):.65;
            if(!enabled||options.exhaust!==true||options.lowEffects===true)target=0;
            target*=intensity;
            const blend=1-Math.exp(-dt/(target>this.power ? .14 : .20));
            this.power+=(target-this.power)*blend;
            // Invalid data cannot keep a flame alive, even across a large clock gap.
            if(!liveFX||gear<=2||mode==='eco'||!enabled||options.exhaust!==true||options.lowEffects===true||mode==='comfort'&&options.comfortExhaust!==true)this.power=0;
            const pitch=enabled&&liveFX?load*2.5*intensity:0;
            this.pitch+=(pitch-this.pitch)*(1-Math.exp(-dt/.18));
            if(!enabled||!liveFX)this.pitch=0;
            const valid=speed!==null||rpm!==null;
            const stage=['P','R','N','D','S'].indexOf(input.stage)>=0?input.stage:null;
            const label=stage==='P'||stage==='N'||stage==='R'?stage:gear!==null?(stage||'')+gear:'--';
            return {mode,modeIndex:MODES.indexOf(mode),previousMode:MODES.indexOf(this.previousMode),
                transition:clamp((now-this.modeAt)/800,0,1),startup:enabled?clamp((now-this.startAt)/1200,0,1):1,
                speed,rpm,pedal,gear,gearLabel:label,stage,
                oil:num(input.oil)?input.oil:null,coolant:num(input.coolant)?input.coolant:null,torque:num(input.torque)?input.torque:null,
                frontAngle:this.front,rearAngle:this.rear,wheelEnabled:wheelEnabled&&speed!==null,
                exhaust:this.power,roadSpeed:enabled&&speed!==null?speed:0,
                squat:this.pitch,
                shift:enabled?clamp(1-(now-this.shiftAt)/360,0,1):0,
                load:enabled&&pedal!==null?load*intensity:0,
                redline:num(options.redline)?clamp(options.redline,5500,8000):7000,
                demo:input.demo===true,valid,partial:valid&&(speed===null||rpm===null||pedal===null||gear===null),
                status:input.demo===true?(!valid?'DEMO / DATA UNAVAILABLE':'DEMO SIMULATION'):!valid?'NO VEHICLE DATA':(speed===null||rpm===null||pedal===null||gear===null)?'PARTIAL VEHICLE DATA':'LIVE SIGNALS',
                lowEffects:options.lowEffects===true,intensity,animation:enabled};
        }
    }
    function demo(gear,speed,rpm,pedal,mode){return {speed,rpm,pedal,gear,stage:'D',oil:105,coolant:94,torque:Math.round(pedal*5),mode,demo:true};}
    return {Engine,driveMode,point,RAIL,MODES,COLOURS,TYRES,clamp,num,demo};
});
