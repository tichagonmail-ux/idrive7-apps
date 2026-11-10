'use strict';
// App-local fonts; the shared kit and Goku atlases remain unchanged.
const zlib=require('zlib'),path=require('path');
const db=require('./kit/pack').open(path.join(__dirname,'resources'));
let families;
function paint(cv,text,x,y,size,colour,family){
    if(!families)families=db.json('typography.json');
    const list=families[family]||families.caption;
    const f=list.find(v=>v.size>=size)||list[list.length-1];
    if(!f.alpha)f.alpha=zlib.inflateSync(Buffer.from(f.z,'base64'));
    const scale=size/f.size,chars=Array.from(String(text));
    const width=chars.reduce((w,c)=>w+(f.glyphs[c.codePointAt(0)]||f.glyphs[63])[6]*scale,0);
    const hex=colour.replace('#',''),c=[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),255];
    let pen=x-width/2;
    for(const ch of chars){const g=f.glyphs[ch.codePointAt(0)]||f.glyphs[63];if(!g)continue;
        if(g[2]&&g[3])cv._blit(f,g[0],g[1],g[2],g[3],pen+g[4]*scale,y+g[5]*scale,scale,c);
        pen+=g[6]*scale;
    }
}
module.exports={paint};
