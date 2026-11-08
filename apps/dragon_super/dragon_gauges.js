'use strict';
const { Canvas } = require('./kit/canvas');
function paint(part, raw, theme) {
    const cv = new Canvas(part.w, part.h);
    const rpm = part.signal === 'rpm', valid = Number.isFinite(raw), value = valid ? Math.max(0, raw) : 0;
    const cx = part.w / 2, cy = 215, radius = 190;
    const point = (ratio, r) => {
        const angle = (140 + ratio * 260) * Math.PI / 180;
        const side = rpm ? -1 : 1;
        return [cx + side * Math.cos(angle) * r, cy + Math.sin(angle) * r];
    };
    for (let i = 0; i <= 48; i++) {
        const ratio = i / 48, a = point(ratio, radius), b = point(ratio, radius - (i % 4 === 0 ? 24 : 16));
        const active = valid && ratio <= value / part.max;
        const color = rpm ? (ratio >= 0.75 ? '#ff4545' : ratio >= 0.375 ? '#386cff' : '#48bcff') : theme.fg;
        cv.line(a[0], a[1], b[0], b[1], 5, active ? color : [115, 135, 160, 120]);
    }
    const count = rpm ? 8 : 11;
    for (let i = 0; i <= count; i++) {
        const p = point(i / count, radius - 51);
        cv.text(String(rpm ? i : i * 30), p[0], p[1] + 8, 22, '#dbe7f4', { align: 'center' });
    }
    if (valid) {
        const p = point(Math.min(1, value / part.max), radius - 30);
        cv.line(cx, cy, p[0], p[1], 3, '#ffffff');
    }
    cv.fillRect(cx - 80, cy - 44, 160, 100, '#000000');
    cv.text(valid ? (rpm ? (value / 1000).toFixed(1) : String(Math.round(value))) : '--', cx, cy + 20, 62, '#ffffff', { align: 'center', font: 'num' });
    cv.text(rpm ? 'RPM x1000' : 'km/h', cx, cy + 58, 22, theme.fg, { align: 'center' });
    return Buffer.from(cv.d);
}
module.exports = { paint };
