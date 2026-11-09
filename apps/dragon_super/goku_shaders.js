'use strict';
// GLSL ES 1.00; animated uniforms are evaluated by cluster-render on the GPU.
const aura = `
precision mediump float;
varying vec2 v_uv;
uniform vec3 u_color;
uniform float u_phase;
uniform float u_charge;
uniform float u_alive;
void main() {
    vec2 p = v_uv * 2.0 - 1.0;
    float t = u_phase;
    float wave = sin(p.y * 17.0 + t * 9.0 + sign(p.x) * 1.1) * 0.045 + sin(p.y * 33.0 - t * 14.0) * 0.02;
    float width = (0.39 + 0.18 * u_charge) * sqrt(max(0.0, 1.0 - p.y * p.y)) + wave;
    float edge = abs(abs(p.x) - width);
    float flame = exp(-edge * (38.0 - 14.0 * u_charge));
    float soft = exp(-edge * 10.0) * 0.24;
    float fade = smoothstep(0.0, 0.12, v_uv.y) * (1.0 - smoothstep(0.91, 1.0, v_uv.y));
    float power = (0.14 + u_charge * 0.78) * u_alive;
    float cell = p.y * 14.0;
    float seed = floor(t * 14.0) + sign(p.x) * 3.0;
    float boltX = 0.46 + mix(sin(floor(cell) * 7.1 + seed), sin((floor(cell) + 1.0) * 7.1 + seed), fract(cell)) * 0.14;
    float bolt = exp(-abs(abs(p.x) - boltX) * 170.0);
    float blink = step(0.2, sin(t * 22.0));
    float lightning = bolt * blink * smoothstep(0.28, 0.70, u_charge);
    float sparks = pow(max(0.0, sin(p.x * 51.0 + floor(t * 17.0)) * sin(p.y * 63.0 - t * 30.0)), 18.0);
    sparks *= smoothstep(0.3, 0.7, abs(p.x)) * u_charge * 0.65;
    float a = min(0.94, ((flame + soft) * power + lightning + sparks) * fade * u_alive);
    vec3 c = mix(u_color, vec3(0.67, 0.84, 1.0), min(1.0, lightning * 1.4));
    gl_FragColor = vec4(c, a);
}`;
const modebar = `
precision mediump float;
varying vec2 v_uv;
uniform vec3 u_color;
uniform float u_phase;
uniform float u_charge;
uniform float u_background;
uniform vec2 u_size;
uniform float u_screenGuide;
uniform float u_gridOnly;
void main() {
    vec2 p = v_uv;
    if (u_background > 0.5) {
        // Panel coordinates, independent of the upper content's Cluster fit.
        // Leave a 30 px horizontal margin. The full frame is opaque down to
        // y=660; changing its height must not stretch/move the decorative bar.
        vec2 px = v_uv * u_size;
        p = vec2((px.x - 30.0) / 1860.0, (px.y - 605.0) / 52.0);
    }
    float q = abs(p.x - 0.5) * 2.0;
    float gap = smoothstep(0.12, 0.20, q);
    float width = max(0.002, 0.055 * (1.0 - q));
    float y = 0.53 + 0.20 * q * q;
    float d = abs(p.y - y);
    float core = 1.0 - smoothstep(width * 0.3, width, d);
    float glow = exp(-d / max(0.01, width * 2.8)) * 0.45;
    float ends = 1.0 - smoothstep(0.85, 1.0, q);
    float pulse = 0.86 + 0.14 * sin(u_phase * 3.0) + 0.15 * u_charge;
    float a = min(1.0, (core + glow) * gap * ends * pulse);
    if (p.y < 0.0 || p.y > 1.0) a = 0.0;
    vec3 c = mix(u_color, vec3(1.0), core * 0.65);
    vec3 outColor = c * a;
    if (u_background > 0.5 && u_screenGuide > 0.5) {
        vec2 px = v_uv * u_size;
        // The guide is panel-native and independent of every artwork canvas.
        vec2 edge = min(px, u_size - px);
        float dEdge = min(edge.x, edge.y);
        vec2 cell = mod(px, 100.0);
        float grid = 1.0 - smoothstep(0.7, 1.5, min(min(cell.x, 100.0-cell.x), min(cell.y, 100.0-cell.y)));
        outColor = max(outColor, vec3(0.06 + 0.12 * grid));
        if (u_gridOnly > 0.5) outColor = vec3(0.08 + 0.18 * grid);
        // Rectangles inset 20 / 40 / 80 / 120 px from the 1920x660 app area.
        if (abs(dEdge-20.0) < 1.5) outColor = vec3(1.0,0.12,0.20);
        if (abs(dEdge-40.0) < 1.5) outColor = vec3(1.0,0.60,0.05);
        if (abs(dEdge-80.0) < 1.5) outColor = vec3(0.1,0.85,1.0);
        if (abs(dEdge-120.0) < 1.5) outColor = vec3(0.3,1.0,0.4);
        if (dEdge < 2.0) outColor = vec3(1.0,0.2,1.0);
    }
    gl_FragColor = u_background > 0.5 ? vec4(outColor, 1.0) : vec4(c, a);
}`;
module.exports = { aura, modebar };
