'use strict';
// Scaling and field names audited against kit/runtime/car.js and EVAHUD.
// Read-only subscriptions/getters. No diagnostic sessions or ECU write services.
const Model=require('./living_model');
class VehicleSignals{
    constructor(ctx,clock){
        this.ctx=ctx;this.clock=clock||Date.now;this.values={};this.subs=[];this.closed=false;this.errors=[];
    }
    put(key,value,min,max){
        if(!Model.num(value)||value<min||value>max){delete this.values[key];return;}
        this.values[key]={value,at:this.clock()};
    }
    raw(key,raw,factor,offset,invalid,min,max){
        if(!Model.num(raw)||raw===invalid){delete this.values[key];return;}
        this.put(key,raw*factor+offset,min,max);
    }
    start(){
        const put=this.put.bind(this),raw=this.raw.bind(this);
        const watches={
            'de.bmw.infotainment.vehicle.CDS':{
                statusEngineSpeed2:v=>raw('rpm',v&&v.actualValueRPMEngineCrankshaft,.25,0,65535,0,10000),
                statusEngineTemperature:v=>{
                    raw('oil',v&&v.temperatureEngineOilDrive,1,-48,255,-48,180);
                    raw('coolant',v&&v.temperatureEngineDrive,1,-48,255,-48,180);
                }
            },
            'de.bmw.infotainment.vehicle.Vehicle2':{statusCarSpeed2:v=>raw('speed',v&&v.speedVehicleCentreOfGravity,.015625,0,65535,0,400)},
            'de.bmw.powertrain.AcceleratorPedal':{AngleAcceleratorPedal:v=>raw('pedal',v&&v.actualValueAngleAcceleratorPedal,.025,0,65535,0,100)},
            'de.bmw.infotainment.drivingexcitement.FES':{
                statusFESVehicleDynamicSwitchHMI:v=>{
                    const m=Model.driveMode(v&&v.actualValueModeDrivingExperience);
                    if(m)this.values.mode={value:m,at:this.clock()};else delete this.values.mode;
                },
                statusActualValueTorque2:v=>{const n=v&&v.actualValueTorqueCrankshaft;
                    if(!Model.num(n)||n>=4095){delete this.values.torque;return;}
                    put('torque',n*.5-1023.5,-1023.5,1024);
                }
            },
            'de.bmw.infrastructure.VehicleInformation':{
                statusGearboxDrive:v=>{
                    const x=v&&v.statusActualGearDrive;
                    const g=typeof x==='number'?(x>=3&&x<=10?x-2:x===1?-1:x===2?0:null):/^G[1-8]$/.test(x)?Number(x.slice(1)):x==='R'?-1:x==='N_OR_P'?0:null;
                    put('gear',g,-1,8);
                    const s=({1:'P',2:'R',3:'N',4:'D',P:'P',R:'R',N:'N',D:'D',S:'S'})[v&&v.statusActualStageDrive];
                    if(s)this.values.stage={value:s,at:this.clock()};else delete this.values.stage;
                },
                DataPowerTrain2:v=>{
                    const x=v&&v.statusGearSelectionDrive;
                    const n=typeof x==='number'?x:({N:1,R:2,P:3,NP:4})[x]||(/^_[1-8]$/.test(x)?4+Number(x.slice(1)):null);
                    if(n>=5&&n<=12){put('gear',n-4,1,8);this.values.stage={value:'D',at:this.clock()};}
                    else if(n>=1&&n<=4){put('gear',n===2?-1:0,-1,8);const s=({1:'N',2:'R',3:'P'})[n];if(s)this.values.stage={value:s,at:this.clock()};else delete this.values.stage;}
                    else{delete this.values.gear;delete this.values.stage;}
                }
            }
        };
        Object.keys(watches).forEach(iface=>{
            // Read getters every second as notifications may be change-only.
            Promise.resolve(this.ctx.signals.watch(iface,'1',watches[iface],this.ctx.log,{pollMs:1000}))
                .then(s=>{if(this.closed)s.shutdown();else{this.subs.push(s);if(s.error)this.errors.push(iface+': '+s.error);}})
                .catch(e=>{this.errors.push(iface+': '+e.message);this.ctx.log.warn(e.message);});
        });
    }
    data(now){
        const out={demo:false};now=now===undefined?this.clock():now;
        Object.keys(this.values).forEach(k=>{const v=this.values[k];if(now-v.at>=0&&now-v.at<3000)out[k]=v.value;});
        return out;
    }
    close(){this.closed=true;this.subs.forEach(s=>s.shutdown());this.subs=[];}
}
module.exports=VehicleSignals;
