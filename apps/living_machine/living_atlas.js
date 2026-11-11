'use strict';
// Each text rectangle keeps its original pixel size; empty screen pixels cost nothing.
function layout(items){
    const width=800,slots={};let x=0,y=0,row=0;
    items.slice().sort((a,b)=>b.h-a.h||a.id.localeCompare(b.id)).forEach(p=>{
        if(x+p.w>width){y+=row;x=0;row=0;}
        slots[p.id]={x,y,w:p.w,h:p.h};x+=p.w;row=Math.max(row,p.h);
    });
    return {w:width,h:y+row,slots};
}
function shader(items,atlas){
    const f=n=>Number(n).toFixed(1);
    let fs='#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 v_uv;\nuniform sampler2D u_text;\nvoid main(){vec2 p=v_uv*vec2(1920.,660.);vec4 colour=vec4(0.);\n';
    items.forEach(p=>{const s=atlas.slots[p.id];
        // Later text parts overwrite earlier parts, matching the former image canvas.
        fs+='if(p.x>='+f(p.x)+'&&p.y>='+f(p.y)+'&&p.x<'+f(p.x+p.w)+'&&p.y<'+f(p.y+p.h)+'){colour=texture2D(u_text,(p-vec2('+f(p.x)+','+f(p.y)+')+vec2('+f(s.x)+','+f(s.y)+'))/vec2('+f(atlas.w)+','+f(atlas.h)+'));}\n';
    });
    return fs+'gl_FragColor=colour;}';
}
module.exports={layout,shader};
