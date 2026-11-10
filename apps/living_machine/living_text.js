'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./living_model'));else root.LivingText=factory(root.LivingModel);})(typeof self!=='undefined'?self:this,function(Model){
    const values=v=>Model.num(v)?String(Math.round(v)):'--';
    function items(s){
        const mode=s.mode,accent=mode==='eco'?'#32d5ff':mode==='comfort'?'#e4efff':'#ff263c';
        const a=[];
        function add(id,x,y,w,h,text,size,colour,font){a.push({id,x,y,w,h,text:String(text),size,colour:colour||'#f5f9ff',font:font||'caption'});}
        add('brand',822,30,300,52,'M340i',46,'#edf5ff','display');
        add('mode',720,90,480,24,mode==='eco'?'EFFICIENT DYNAMICS':mode==='comfort'?'EXECUTIVE DRIVING':'M PERFORMANCE',16,accent);
        add('speed',285,280,275,126,values(s.speed),119,'#ffffff','display');
        add('unit',307,411,210,30,'km/h',25,'#e8f1ff','display');
        add('gear',1380,280,270,126,s.gearLabel,104,'#ffffff','display');
        add('rightunit',1360,430,260,32,mode==='eco'?'ECO PRO':mode==='comfort'?'COMFORT':'SPORT+',30,accent,'display');
        add('rpmSmall',1380,485,240,28,values(s.rpm)+' rpm',21,'#c0d2e5');
        [['OIL °C',s.oil],['COOLANT °C',s.coolant],['TORQUE Nm',s.torque],['PEDAL %',s.pedal]].forEach((m,i)=>{
            const x=398+i*315;
            add('metriclabel'+i,x,602,160,17,m[0],14,'#9cb2cb');
            add('metric'+i,x,622,160,25,values(m[1]),23,'#ecf4ff','display');
        });
        add('status',755,573,410,20,s.status,13,s.demo||!s.valid?'#ffbf65':'#8dacc6');
        for(const kind of ['speed','rpm']){
            const steps=kind==='speed'?11:8;
            for(let i=0;i<=steps;i++){
                const t=i/steps,p=Model.point(mode,kind,t),before=Model.point(mode,kind,Math.max(0,t-.001)),after=Model.point(mode,kind,Math.min(1,t+.001));
                const dx=after[0]-before[0],dy=after[1]-before[1],len=Math.sqrt(dx*dx+dy*dy)||1;
                const mirror=kind==='speed'?1:-1,nx=-dy/len*mirror,ny=dx/len*mirror;
                const cx=p[0]+nx*34,cy=p[1]+ny*34;
                add(kind+'Tick'+i,Math.round(cx-29),Math.round(cy-15),58,30,kind==='speed'?i*30:i,22,'#dfecfa','display');
            }
        }
        return a;
    }
    return {items};
});
