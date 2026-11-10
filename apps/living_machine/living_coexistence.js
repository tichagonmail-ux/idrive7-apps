'use strict';
const fs=require('fs'),path=require('path');
// Observe Goku's persisted settings without changing files or stopping its process.
function conflict(root){
    root=root||'/var/opt/public/oap';
    let dirs;
    try{dirs=fs.readdirSync(root);}catch(e){return 'Cannot verify other cluster apps: '+e.code;}
    for(const d of dirs){
        if(!/^oap_\d+$/.test(d))continue;
        const p=path.join(root,d),specPath=path.join(p,'source/javascript/kit/app-spec.json');
        let spec;
        try{spec=JSON.parse(fs.readFileSync(specPath,'utf8'));}
        catch(e){if(e.code==='ENOENT')continue;return 'Cannot inspect installed app '+d;}
        if(spec.id!=='dragon_super')continue;
        const defaults={};(spec.settings||[]).forEach(s=>{defaults[s.key]=s.default;});
        let saved;
        try{saved=JSON.parse(fs.readFileSync(path.join(p,'data/settings.json'),'utf8'));}
        catch(e){if(e.code==='ENOENT')saved={};else return 'Cannot verify Goku HUD mode';}
        const settings=Object.assign(defaults,saved);
        if(settings.screens!=='off')return 'Set Goku HUD > Mode > Off first';
    }
    return null;
}
module.exports={conflict};
