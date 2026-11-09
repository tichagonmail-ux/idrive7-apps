'use strict';

// Twelve distinct poses around a closed cycle. The compositor interpolates the
// keyframes; JavaScript uploads a character only when its form or stance changes.
const FRAMES = 12;
const COLORS = { eco: [71, 206, 255], comfort: [255, 218, 55], sport: [255, 66, 61] };
function pose(mode, pedal, rpm, previous, enabled) {
    const valid = Number.isFinite(pedal) && Number.isFinite(rpm) && rpm >= 400;
    const charging = valid && enabled !== false && pedal >= (previous === 'charge' ? 15 : 25);
    return { mode, stance: charging ? 'charge' : 'idle', charge: valid ? Math.max(0, Math.min(1, pedal / 100)) : 0, valid };
}
function keys(stance) {
    const charge = stance === 'charge', duration = charge ? 720 : 2400;
    const scale = [], translate = [];
    for (let i = 0; i <= FRAMES; i++) {
        const a = (i % FRAMES) / FRAMES * Math.PI * 2;
        const breath = Math.sin(a), tremble = charge ? Math.sin(a * 5) * 1.1 : 0;
        const sx = 1 + breath * (charge ? 0.006 : 0.003);
        const sy = 1 + breath * (charge ? 0.008 : 0.005);
        scale.push([Math.round(i * duration / FRAMES), sx, sy, 1]);
        translate.push([Math.round(i * duration / FRAMES), tremble, -breath * (charge ? 1.4 : 1), 0]);
    }
    return { scale, translate, duration };
}
module.exports = { FRAMES, COLORS, pose, keys };
