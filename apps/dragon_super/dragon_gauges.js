'use strict';
const { Canvas } = require('./kit/canvas');
const RAIL = [[180, 429], [34, 233], [180, 34]];
const LENGTHS = [Math.hypot(146,196),Math.hypot(146,199)], TOTAL = LENGTHS[0]+LENGTHS[1];
function point(ratio,inset,mirror) {
    const dist=Math.max(0,Math.min(1,ratio))*TOTAL, i=dist<=LENGTHS[0]?0:1;
    const t=(dist-(i?LENGTHS[0]:0))/LENGTHS[i], a=RAIL[i],b=RAIL[i+1];
    const x=a[0]+(b[0]-a[0])*t-(b[1]-a[1])/LENGTHS[i]*inset;
    const y=a[1]+(b[1]-a[1])*t+(b[0]-a[0])/LENGTHS[i]*inset;
    return [mirror?600-x:x,y];
}
function paint(part,raw,theme,gear) {
    const cv=new Canvas(part.w,part.h), rpm=part.signal==='rpm', valid=Number.isFinite(raw);
    const value=valid?Math.max(0,Math.min(part.max,raw)):0, c=rpm?'#ff3a4e':'#42cfff';
    const scale=p=>[p[0]*part.w/600,p[1]*part.h/455];
    const line=(a,b,w,color)=>{a=scale(a);b=scale(b);cv.line(a[0],a[1],b[0],b[1],w*part.h/455,color);};
    for(let i=0;i<96;i++) {
        const a=i/96,b=(i+1)/96;
        line(point(a,0,rpm),point(b,0,rpm),24,rpm?'#3c0b19':'#062f46');
        line(point(a,-13,rpm),point(b,-13,rpm),2,'#d8f4ff');
        line(point(a,14,rpm),point(b,14,rpm),2,c);
        if(valid&&a<=value/part.max) {
            line(point(a,0,rpm),point(b,0,rpm),17,c);
            line(point(a,-3,rpm),point(b,-3,rpm),3,'#ecfbff');
        }
        // A fine scaled outer rail carries the dragon palette without covering numbers.
        const a0=point(a+0.002,-26,rpm),b0=point(b-0.002,-26,rpm);
        line(a0,b0,8,rpm?(i%3?'#96142a':'#e53143'):(i%3?'#075f38':'#249753'));
    }
    const top=point(1,0,rpm), topend=[rpm?10:590,34];
    line(top,topend,14,rpm?'#390c19':'#07394d'); line(top,topend,3,c);
    const bottom=point(0,0,rpm); line(bottom,[rpm?105:495,429],2,'#c4d3de');
    const count=rpm?8:11;
    for(let i=0;i<=count;i++) {
        const f=i/count,a=point(f,20,rpm),b=point(f,39,rpm),p=point(f,0,rpm);
        p[0] += rpm ? -67 : 67;
        if (i === 0) p[1] -= 13;
        if (i === count) p[1] += 19;
        line(a,b,2,'#dce9f1');
        cv.text(String(rpm?i:i*30),p[0]*part.w/600,p[1]*part.h/455+7,22*part.h/455,'#f1f5f8',{align:'center'});
    }
    if(valid) line(point(value/part.max,-15,rpm),point(value/part.max,19,rpm),5,'#ffffff');
    const x=(rpm?220:380)*part.w/600;
    cv.text(valid?String(Math.round(value)):'--',x,248*part.h/455,(rpm?77:91)*part.h/455,'#ffffff',{align:'center',font:'num'});
    cv.text(rpm?'RPM':'km/h',x,292*part.h/455,27*part.h/455,c,{align:'center'});
    if(!rpm) cv.text(valid?(gear||'--'):'--',x,355*part.h/455,38*part.h/455,'#edf5ff',{align:'center'});
    return Buffer.from(cv.d);
}
module.exports={paint};
