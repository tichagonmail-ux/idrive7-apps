'use strict';
const mgu = require('./kit/mgu');
const { DragonHud, DragonDash } = require('./dragon_hud');
mgu.run({
    start(ctx) {
        const hud = new DragonHud(ctx), dash = new DragonDash(ctx, hud);
        hud.dash = dash;
        const status = () => ctx.ui.text('STATUS', [hud.lastStatus, dash.lastStatus].filter(Boolean).join(' / '));
        hud.onStatus(status);
        dash.onStatus(status);
        hud.start();
        dash.start();
        process.on('exit', () => { hud.stop(); dash.stop(); });
    },
});
