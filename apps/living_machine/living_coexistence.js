'use strict';
const fs=require('fs'),path=require('path');
// Best-effort, read-only check. Per-app permissions can hide unrelated apps,
// and even another custom app's settings. Unknown state is not an active owner.
const LIMITED='App check limited; keep Goku HUD Off';
function inspect(root,io){
    root=root||'/var/opt/public/oap';
    io=io||fs;
    let dirs,warning=null,skipped=0;
    try{dirs=io.readdirSync(root);}catch(e){return {conflict:null,warning:LIMITED,skipped:1};}
    for(const d of dirs){
        if(!/^oap_\d+$/.test(d))continue;
        const p=path.join(root,d),specPath=path.join(p,'source/javascript/kit/app-spec.json');
        let spec;
        try{spec=JSON.parse(io.readFileSync(specPath,'utf8'));}
        catch(e){if(e.code!=='ENOENT'){warning=LIMITED;skipped++;}continue;}
        if(!spec||typeof spec.id!=='string'||!/^dragon_super\d*$/.test(spec.id))continue;
        const defaults={};
        if(Array.isArray(spec.settings))spec.settings.forEach(s=>{if(s&&typeof s.key==='string')defaults[s.key]=s.default;});
        let saved;
        try{saved=JSON.parse(io.readFileSync(path.join(p,'data/settings.json'),'utf8'));}
        catch(e){if(e.code==='ENOENT')saved={};else{warning=LIMITED;skipped++;continue;}}
        if(!saved||typeof saved!=='object'||Array.isArray(saved)){warning=LIMITED;skipped++;continue;}
        const settings=Object.assign(defaults,saved);
        if(typeof settings.screens!=='string'){warning=LIMITED;skipped++;continue;}
        if(settings.screens!=='off')return {conflict:'Set Goku HUD > Mode > Off first',warning,skipped};
    }
    return {conflict:null,warning,skipped};
}
function conflict(root,io){return inspect(root,io).conflict;}
module.exports={inspect,conflict};
