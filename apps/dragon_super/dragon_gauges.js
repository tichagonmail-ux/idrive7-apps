'use strict';
const { Canvas } = require('./kit/canvas');
const fonts = require('./kit/fonts');
const RAIL = [[180, 429], [34, 233], [180, 34]];
const LENGTHS = [Math.hypot(146,196),Math.hypot(146,199)], TOTAL = LENGTHS[0]+LENGTHS[1];
const labelCentres = new Map();
function point(ratio,inset,mirror) {
    const dist=Math.max(0,Math.min(1,ratio))*TOTAL, i=dist<=LENGTHS[0]?0:1;
    const t=(dist-(i?LENGTHS[0]:0))/LENGTHS[i], a=RAIL[i],b=RAIL[i+1];
    const x=a[0]+(b[0]-a[0])*t-(b[1]-a[1])/LENGTHS[i]*inset;
    const y=a[1]+(b[1]-a[1])*t+(b[0]-a[0])/LENGTHS[i]*inset;
    return [mirror?600-x:x,y];
}
// Canvas.text takes a font baseline, not an ink centre. Align the actual
// digit glyphs to the same horizontal row as their tick and the needle.
function labelBaseline(text,centre,size) {
    const key=text+':'+size;
    let shift=labelCentres.get(key);
    if(shift===undefined) {
        const f=fonts.get('label',size,text), scale=size/f.size;
        let top=Infinity,bottom=-Infinity;
        for(const ch of text) {
            const g=f.glyphs[ch.charCodeAt(0)];if(!g)continue;
            for(let y=0;y<g[3];y++)for(let x=0;x<g[2];x++) {
                if(!f.alpha[(g[1]+y)*f.atlasW+g[0]+x])continue;
                top=Math.min(top,(g[5]+y)*scale);bottom=Math.max(bottom,(g[5]+y+1)*scale);
            }
        }
        shift=Number.isFinite(top)?(top+bottom)/2:0;labelCentres.set(key,shift);
    }
    return centre-shift;
}
function paint(part,raw,theme,gear) {
    const cv=new Canvas(part.w,part.h), progress=new Canvas(part.w,part.h);
    const rpm=part.signal==='rpm',valid=Number.isFinite(raw);
    const value=valid?Math.max(0,Math.min(part.max,raw)):0,ratio=value/part.max;
    const c=rpm?'#ff3a4e':'#42cfff',direction=rpm?-1:1;
    const scale=p=>[p[0]*part.w/600,p[1]*part.h/455];
    const stroke=(target,a,b,w,color)=>{a=scale(a);b=scale(b);target.line(a[0],a[1],b[0],b[1],w*part.h/455,color);};
    const line=(a,b,w,color)=>stroke(cv,a,b,w,color);
    for(let i=0;i<96;i++) {
        const a=i/96,b=(i+1)/96;
        line(point(a,0,rpm),point(b,0,rpm),24,rpm?'#3c0b19':'#062f46');
        line(point(a,-13,rpm),point(b,-13,rpm),2,'#d8f4ff');
        line(point(a,14,rpm),point(b,14,rpm),2,c);
        if(valid&&a<ratio) {
            const end=Math.min(b,ratio);
            stroke(progress,point(a,0,rpm),point(end,0,rpm),17,c);
            stroke(progress,point(a,-3,rpm),point(end,-3,rpm),3,'#ecfbff');
        }
        line(point(a+0.002,-26,rpm),point(b-0.002,-26,rpm),8,rpm?(i%3?'#96142a':'#e53143'):(i%3?'#075f38':'#249753'));
    }
    const anchor=point(ratio,0,rpm);
    if(valid&&value>0) {
        // Rounded stroke caps must not make the coloured bar lead the needle.
        const cut=Math.max(0,Math.min(part.h,Math.ceil(anchor[1]*part.h/455)));
        progress.d.fill(0,0,cut*part.w*4);cv.blit(progress,0,0);
    }
    // Keep decorative caps away from the 0 and maximum labels instead of
    // moving those labels away from their actual values.
    const top=point(1,0,rpm),upper=[rpm?396:204,12];
    line(top,upper,3,c);line(upper,[rpm?10:590,12],3,c);
    const bottom=point(0,0,rpm),lower=[rpm?396:204,447];
    line(bottom,lower,2,'#c4d3de');line(lower,[rpm?105:495,447],2,'#c4d3de');
    const ticks=[],step=rpm?1000:30;
    for(let n=0;n<=part.max;n+=step)ticks.push(n);
    if(ticks[ticks.length-1]!==part.max)ticks.push(part.max);
    for(const n of ticks) {
        const p=point(n/part.max,0,rpm),a=[p[0]+direction*20,p[1]],b=[p[0]+direction*42,p[1]];
        line(a,b,2,'#dce9f1');
        const text=String(rpm?n/1000:n),size=22*part.h/455,cy=p[1]*part.h/455;
        cv.text(text,(p[0]+direction*90)*part.w/600,labelBaseline(text,cy,size),size,'#f1f5f8',{align:'center'});
    }
    if(valid)line([anchor[0]-direction*18,anchor[1]],[anchor[0]+direction*42,anchor[1]],5,'#ffffff');
    const x=(rpm?220:380)*part.w/600;
    cv.text(valid?String(Math.round(value)):'--',x,248*part.h/455,(rpm?77:91)*part.h/455,'#ffffff',{align:'center',font:'num'});
    cv.text(rpm?'RPM':'km/h',x,292*part.h/455,27*part.h/455,c,{align:'center'});
    if(!rpm)cv.text(valid?(gear||'--'):'--',x,355*part.h/455,38*part.h/455,'#edf5ff',{align:'center'});
    return Buffer.from(cv.d);
}
module.exports={paint};
