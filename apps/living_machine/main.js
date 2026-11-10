'use strict';
const mgu=require('./kit/mgu');
const {LivingApp}=require('./living_app');
mgu.run({start(ctx){
    const app=new LivingApp(ctx);app.start();
    process.on('exit',()=>app.stop());
}});
