'use strict';
const { Canvas } = require('./kit/canvas');
const fonts = require('./kit/fonts');
const data = require('./hud_data');
const WIDTH = 600, HEIGHT = 535;
// The rails hug the inside of the green dragon and mirrored red scale guard.
// Their head/whiskers are inside the same non-overlapping gauge rectangle.
const RAIL = [[200, 509], [90, 313], [215, 114]];
const LENGTHS = RAIL.slice(1).map((p,i)=>Math.hypot(p[0]-RAIL[i][0],p[1]-RAIL[i][1])), TOTAL = LENGTHS[0]+LENGTHS[1];
const labelCentres = new Map();
const artwork = new Map();
function shoulder(y) {
    const t=Math.max(0,Math.min(1,y/250));
    return 120*(1-t*t*(3-2*t));
}
function guard(rpm,w,h,wide) {
    const key=(rpm?'red':'green')+':'+w+'x'+h+':'+wide;
    if(artwork.has(key))return artwork.get(key);
    const image=data.json('gauges/'+(rpm?'red':'green')+'.json'),src=Buffer.from(image.rgba||'','base64');
    if(image.w!==WIDTH||image.h!==HEIGHT||src.length!==WIDTH*HEIGHT*4)throw Error('Missing or invalid dragon guard artwork');
    const pixels=Buffer.alloc(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const sy=Math.min(HEIGHT-1,Math.floor((y+.5)*HEIGHT/h));
        const sx=Math.floor((x+.5)*WIDTH/w-(wide?(rpm?-1:1)*shoulder(sy):0));
        if(sx<0||sx>=WIDTH)continue;
        const si=(sy*WIDTH+sx)*4;
        src.copy(pixels,(y*w+x)*4,si,si+4);
    }
    // The three production sizes plus small verification renders stay bounded.
    if(artwork.size>=6)artwork.delete(artwork.keys().next().value);
    artwork.set(key,pixels);return pixels;
}
function point(ratio,inset,mirror,wide) {
    const dist=Math.max(0,Math.min(1,ratio))*TOTAL, i=dist<=LENGTHS[0]?0:1;
    const t=(dist-(i?LENGTHS[0]:0))/LENGTHS[i], a=RAIL[i],b=RAIL[i+1];
    let x=a[0]+(b[0]-a[0])*t-(b[1]-a[1])/LENGTHS[i]*inset;
    const y=a[1]+(b[1]-a[1])*t+(b[0]-a[0])/LENGTHS[i]*inset;
    if(wide)x+=shoulder(y);
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
    const rpm=part.signal==='rpm',valid=Number.isFinite(raw),wide=part.wideProbe===true;
    cv.d.set(guard(rpm,part.w,part.h,wide));
    const value=valid?Math.max(0,Math.min(part.max,raw)):0,ratio=value/part.max;
    const c=rpm?'#ff3a4e':'#42cfff',direction=rpm?-1:1;
    const scale=p=>[p[0]*part.w/WIDTH,p[1]*part.h/HEIGHT];
    const stroke=(target,a,b,w,color)=>{a=scale(a);b=scale(b);target.line(a[0],a[1],b[0],b[1],w*part.h/HEIGHT,color);};
    const line=(a,b,w,color)=>stroke(cv,a,b,w,color);
    for(let i=0;i<96;i++) {
        const a=i/96,b=(i+1)/96;
        line(point(a,0,rpm,wide),point(b,0,rpm,wide),24,rpm?'#3c0b19':'#062f46');
        line(point(a,-13,rpm,wide),point(b,-13,rpm,wide),2,'#d8f4ff');
        line(point(a,14,rpm,wide),point(b,14,rpm,wide),2,c);
        if(valid&&a<ratio) {
            const end=Math.min(b,ratio);
            stroke(progress,point(a,0,rpm,wide),point(end,0,rpm,wide),17,c);
            stroke(progress,point(a,-3,rpm,wide),point(end,-3,rpm,wide),3,'#ecfbff');
        }
    }
    const anchor=point(ratio,0,rpm,wide);
    if(valid&&value>0) {
        // Rounded stroke caps must not make the coloured bar lead the needle.
        const cut=Math.max(0,Math.min(part.h,Math.ceil(anchor[1]*part.h/HEIGHT)));
        progress.d.fill(0,0,cut*part.w*4);cv.blit(progress,0,0);
    }
    // Keep decorative caps away from the 0 and maximum labels instead of
    // moving those labels away from their actual values.
    const top=point(1,0,rpm,wide),upper=[rpm?361-(wide?shoulder(92):0):239+(wide?shoulder(92):0),92];
    line(top,upper,3,c);line(upper,[rpm?10:590,92],3,c);
    const bottom=point(0,0,rpm),lower=[rpm?376:224,527];
    line(bottom,lower,2,'#c4d3de');line(lower,[rpm?105:495,527],2,'#c4d3de');
    const ticks=[],step=rpm?1000:30;
    for(let n=0;n<=part.max;n+=step)ticks.push(n);
    if(ticks[ticks.length-1]!==part.max)ticks.push(part.max);
    for(const n of ticks) {
        const p=point(n/part.max,0,rpm,wide),a=[p[0]+direction*20,p[1]],b=[p[0]+direction*42,p[1]];
        line(a,b,2,'#dce9f1');
        const text=String(rpm?n/1000:n),size=22*part.h/HEIGHT,cy=p[1]*part.h/HEIGHT;
        cv.text(text,(p[0]+direction*90)*part.w/WIDTH,labelBaseline(text,cy,size),size,'#f1f5f8',{align:'center'});
    }
    if(valid)line([anchor[0]-direction*18,anchor[1]],[anchor[0]+direction*42,anchor[1]],5,'#ffffff');
    const x=(rpm?220:380)*part.w/WIDTH;
    cv.text(valid?String(Math.round(value)):'--',x,328*part.h/HEIGHT,(rpm?77:91)*part.h/HEIGHT,'#ffffff',{align:'center',font:'num'});
    cv.text(rpm?'RPM':'km/h',x,372*part.h/HEIGHT,27*part.h/HEIGHT,c,{align:'center'});
    if(!rpm)cv.text(valid?(gear||'--'):'--',x,435*part.h/HEIGHT,38*part.h/HEIGHT,'#edf5ff',{align:'center'});
    return Buffer.from(cv.d);
}
module.exports={paint};
