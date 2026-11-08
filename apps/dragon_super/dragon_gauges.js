'use strict';
const { Canvas } = require('./kit/canvas');

// An open, angular instrument rail, reflected for the right-hand tachometer.
const RAIL = [[178, 383], [96, 252], [60, 178], [106, 98], [172, 43], [399, 32]];
const LENGTHS = RAIL.slice(1).map((p, i) => Math.hypot(p[0] - RAIL[i][0], p[1] - RAIL[i][1]));
const TOTAL = LENGTHS.reduce((a, b) => a + b, 0);
function point(ratio, inset, mirrored) {
    let distance = Math.max(0, Math.min(1, ratio)) * TOTAL, i = 0;
    while (i < LENGTHS.length - 1 && distance > LENGTHS[i]) distance -= LENGTHS[i++];
    const a = RAIL[i], b = RAIL[i + 1], length = LENGTHS[i], t = distance / length;
    const nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
    const x = a[0] + (b[0] - a[0]) * t + nx * inset;
    return [mirrored ? 520 - x : x, a[1] + (b[1] - a[1]) * t + ny * inset];
}
function paint(part, raw) {
    const cv = new Canvas(part.w, part.h);
    const rpm = part.signal === 'rpm', valid = Number.isFinite(raw), value = valid ? Math.max(0, raw) : 0;
    const color = rpm ? '#ff3851' : '#42c7ff';
    const line = (a, b, width, ink) => cv.line(a[0], a[1], b[0], b[1], width, ink);
    // Close-set strips form the beveled rail and its blue/red illuminated channel.
    for (let i = 0; i < 120; i++) {
        const a = i / 120, b = (i + 1) / 120;
        line(point(a, 0, rpm), point(b, 0, rpm), 26, rpm ? '#47131d' : '#103c55');
        line(point(a, -14, rpm), point(b, -14, rpm), 3, '#edf8ff');
        line(point(a, 15, rpm), point(b, 15, rpm), 2, color);
        if (valid && a <= value / part.max) line(point(a, 0, rpm), point(b, 0, rpm), 17, color);
    }
    // Discrete blocks sit outside the rail, as on the reference's two side scales.
    for (let i = 0; i < 44; i++) {
        const a = point(i / 44 + 0.004, -30, rpm), b = point((i + 1) / 44 - 0.004, -30, rpm);
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const nx = -(b[1] - a[1]) / length * 5, ny = (b[0] - a[0]) / length * 5;
        cv.quad([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny],
            [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]],
            valid && i / 44 <= value / part.max ? color : rpm ? '#6f2635' : '#205773');
    }
    const count = rpm ? 8 : 11;
    for (let i = 0; i <= count; i++) {
        const p = point(i / count, 37, rpm);
        cv.text(String(rpm ? i : i * 30), p[0], p[1] + 7, 20, '#d9e8f1', { align: 'center' });
    }
    if (valid) line(point(value / part.max, -19, rpm), point(value / part.max, 22, rpm), 5, '#ffffff');
    const x = rpm ? 192 : 328;
    cv.text(valid ? (rpm ? (value / 1000).toFixed(1) : String(Math.round(value))) : '--', x, 243, 74, '#ffffff', { align: 'center', font: 'num' });
    cv.text(rpm ? 'RPM x1000' : 'km/h', x, 281, 22, color, { align: 'center' });
    const a = point(0, 0, rpm), end = [rpm ? 90 : 430, 384];
    line(a, end, 2, '#c7d2dc');
    return Buffer.from(cv.d);
}
module.exports = { paint };
