// Coordinates are in the original 180 x 98 M340i badge.
const wheels = [
    { x: 121.6, y: 71.3, rx: 8.8, ry: 17.7, lean: -0.055 },
    { x: 173, y: 57.4, rx: 3.0, ry: 10.5, lean: -0.04 },
];
const tips = [[5.7, 74], [9.6, 75.3], [47.9, 82.6], [55.2, 84.1]];
const steps = 32;

function wheelPatch(photo, wheel, frame) {
    const { x, y, rx, ry, lean } = wheel;
    const left = Math.floor(x - rx - Math.abs(lean * ry) - 1), top = Math.floor(y - ry - 1);
    const w = 2 * (Math.ceil(x) - left) + 1, h = 2 * (Math.ceil(y) - top) + 1;
    const bytes = Buffer.alloc(w * h * 4);
    const angle = frame * Math.PI * 2 / steps, c = Math.cos(angle), s = Math.sin(angle);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const dy = top + j - y, v = dy / ry, u = (left + i - x - lean * dy) / rx;
        if (u * u + v * v >= 1) continue;
        const original = ((top + j) * photo.w + left + i) * 4;
        const sy = ry * (v * c - u * s);
        const sx = rx * (u * c + v * s) + lean * sy;
        const source = (Math.round(y + sy) * photo.w + Math.round(x + sx)) * 4;
        const red = (k) => photo.data[k] > 48 && photo.data[k] > 2.2 * photo.data[k + 1];
        // The red brake caliper stays bolted in place behind the bronze spokes.
        const offset = red(original) ? original : source;
        const dest = (j * w + i) * 4;
        photo.data.copy(bytes, dest, offset, offset + 4);
        if (offset !== original && red(source)) bytes[dest] = bytes[dest + 1];
    }
    return { left, top, w, h, bytes };
}

function motion() {
    let last = null, phase = 0;
    return (now, speed, pedal) => {
        const dt = last === null ? 0 : Math.max(0, Math.min(300, now - last));
        last = now;
        if (speed > 0) phase = (phase + dt * Math.min(0.85, speed / 60) / 1000) % 1;
        return { frame: Math.floor(phase * steps), flame: speed > 0 && pedal > 0 ? Math.min(1, pedal / 100) : 0 };
    };
}

function drawFlames(cv, x, y, power, now) {
    if (!power) return;
    tips.forEach(([tx, ty], i) => {
        const length = (3 + 13 * power) * (0.85 + 0.15 * Math.sin(now / 75 + i));
        const px = x + tx, py = y + ty;
        const jet = (l, r, color) => cv.quad([[px, py-r], [px+1, py], [px, py+r], [px-l, py+l*0.21]], color);
        jet(length, 1.7, '#ff6723');
        jet(length * 0.55, 0.85, '#ffe495');
    });
}
module.exports = { motion, wheels, wheelPatch, drawFlames };
