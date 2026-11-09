'use strict';
// Deterministic atlas slicing/size conversion; artwork is the generated atlas.
const fs = require('fs'), path = require('path');
const sharp = require(require.resolve('sharp', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '', process.cwd()] }));
const ROOT = path.resolve(__dirname, '../..'), APP = path.join(ROOT, 'apps/dragon_super');
const atlas = path.join(ROOT, 'assets/goku-hud/atlas.png');
const modes = ['eco', 'comfort', 'sport'], stances = ['idle', 'charge'];
(async () => {
    const meta = await sharp(atlas).metadata();
    if (!meta.hasAlpha) throw Error('Atlas must retain transparency');
    const out = path.join(APP, 'hud/characters'); fs.mkdirSync(out, { recursive: true });
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
        const left = Math.round(col * meta.width / 3), top = Math.round(row * meta.height / 2);
        const width = Math.round((col + 1) * meta.width / 3) - left, height = Math.round((row + 1) * meta.height / 2) - top;
        const cell = await sharp(atlas).extract({ left, top, width, height }).png().toBuffer();
        const crop = await sharp(cell).trim({ background: '#00000000', threshold: 8 }).png().toBuffer();
        for (const [w, h] of [[320, 450], [240, 340], [150, 200]]) {
            const margin = Math.round(w * 0.065), bottom = Math.round(h * 0.025);
            const body = await sharp(crop).resize(w - margin * 2, h - bottom * 2, { fit: 'contain', background: '#00000000' }).ensureAlpha().raw().toBuffer();
            const rgba = await sharp({ create: { width: w, height: h, channels: 4, background: '#00000000' } }).composite([{ input: body, raw: { width: w - margin * 2, height: h - bottom * 2, channels: 4 }, left: margin, top: bottom }]).raw().toBuffer();
            fs.writeFileSync(path.join(out, modes[col] + '_' + stances[row] + '_' + w + 'x' + h + '.json'), JSON.stringify({ w, h, rgba: rgba.toString('base64') }));
        }
        if (row === 0 && col === 2) {
            const m = await sharp(crop).metadata(), side = Math.min(m.width, Math.round(m.height * 0.43));
            const face = await sharp(crop).extract({ left: Math.round((m.width - side) / 2), top: 0, width: side, height: side }).resize(232, 232).png().toBuffer();
            const bg = Buffer.from('<svg width="256" height="256"><defs><radialGradient id="a"><stop stop-color="#63151f"/><stop offset="1" stop-color="#070b14"/></radialGradient></defs><rect width="256" height="256" rx="46" fill="url(#a)"/><rect x="4" y="4" width="248" height="248" rx="42" fill="none" stroke="#ff493e" stroke-width="3"/></svg>');
            await sharp(bg).composite([{ input: face, left: 12, top: 18 }]).png().toFile(path.join(APP, 'icon.png'));
        }
    }
    // The same guard pixels are painted inside the existing gauge rectangles.
    // Do not allocate another renderer layer: three alert layers must still fit.
    const guards = path.join(ROOT, 'assets/goku-hud/dragon-guards.png');
    const gm = await sharp(guards).metadata();
    if (!gm.hasAlpha || gm.width !== 2172 || gm.height !== 724) throw Error('Expected the original 2172x724 alpha dragon guards');
    const gauges = path.join(APP, 'hud/gauges'); fs.mkdirSync(gauges, { recursive: true });
    for (const side of ['green', 'red']) {
        const left = side === 'green' ? 0 : gm.width - 500;
        // Register the artwork's bend to the dial elbow at y=313. The bottom
        // section ends at y=535; the head keeps its own space above the scale.
        const upper = await sharp(guards).extract({ left, top: 0, width: 500, height: 350 }).resize(300, 313, { fit: 'fill' }).png().toBuffer();
        const lower = await sharp(guards).extract({ left, top: 350, width: 500, height: 374 }).resize(300, 222, { fit: 'fill' }).png().toBuffer();
        const x = side === 'green' ? 0 : 300;
        const rgba = await sharp({ create: { width: 600, height: 535, channels: 4, background: '#00000000' } })
            .composite([{ input: upper, left: x, top: 0 }, { input: lower, left: x, top: 313 }]).raw().toBuffer();
        fs.writeFileSync(path.join(gauges, side + '.json'), JSON.stringify({ w: 600, h: 535, rgba: rgba.toString('base64') }));
    }
    console.log('PASS six alpha poses in three target sizes, Goku app icon and both alpha dragon guards');
})().catch(e => { console.error(e); process.exit(1); });
