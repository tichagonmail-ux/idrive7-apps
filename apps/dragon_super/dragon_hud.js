'use strict';
const Base = require('./eva_hud'), data = require('./hud_data'), Hud = require('./hud');
const animation = require('./goku_animation'), shaders = require('./goku_shaders');
const FORMS = { eco: 'BASE FORM', comfort: 'SUPER SAIYAN', sport: 'SUPER SAIYAN GOD' };
const MODES = { eco: 'ECO PRO', comfort: 'COMFORT', sport: 'SPORT' };
class DragonHud extends Base {
    _migrateMenu() {}
    _followsDriveMode() { return this._screens() !== 'off'; }
    _layoutName() { return ['hud', 'both'].includes(this._screens()) ? this._driveProfile() : 'off'; }
    _layoutFile(n) { return n === 'alert' ? 'db_hud_alert' : 'db_hud_' + n; }
    _layoutLabel() { return 'GOKU HUD / ' + FORMS[this._driveProfile()]; }
    _statusLine() { return this._layoutLabel(); }
    _wantDiag() {
        const d = this.car.data();
        if (d.demo || !this._evaShowing() || !Number.isFinite(d.rpm) || d.rpm < 500) return null;
        return Object.assign({}, super._wantDiag(), { iat: true });
    }
    _raw(n) {
        const d = this.car.data();
        if (!d.demo && Date.now() - this.car.lastCar >= 3000) return null;
        if (n === 'iat') { const r = this.readings.iat; return r && Date.now() - r.at < 5000 ? r.v : null; }
        return super._raw(n);
    }
    _token(t) {
        if (t === 'db:form') return FORMS[this._driveProfile()];
        if (t === 'db:mode') return MODES[this._driveProfile()];
        if (t === 'db:title') return 'GOKU HUD';
        if (t === 'db:edge') return this.setting('screenGuide') === 'off' ? '' : '0.4.6 | SCREEN SIZE TEST';
        if (t === 'db:boost') return Hud.prototype._token.call(this, 'boost');
        if (t === 'db:iat') { const v = this._raw('iat'); return Number.isFinite(v) ? v.toFixed(0) : '--'; }
        if (t === 'db:data') return this.car.data().demo ? 'DEMO' : Date.now() - this.car.lastCar >= 3000 ? 'NO VEHICLE DATA' : '';
        if (t === 'db:warning') return 'VEHICLE ALERT';
        return super._token(t);
    }
    _partLook(p, now) {
        return p.type === 'bmwgauge' ? String(this._raw(p.signal)) + '|' + (p.signal === 'speed' ? this._token('gear') : '') : super._partLook(p, now);
    }
    _partPixels(p, look) {
        if (p.type !== 'bmwgauge') return super._partPixels(p, look);
        const a = String(look).split('|'), v = a[0] === 'null' || a[0] === 'undefined' ? NaN : Number(a[0]);
        return require('./dragon_gauges').paint(p, v, this.theme, a[1]);
    }
    _pose(previous) { return animation.pose(this._driveProfile(), this._pedal(), this._raw('rpm'), previous, this.setting('animationOn')); }
    _panelFit() { return 1; }
    _create(w) {
        if (!['gokucharacter', 'gokuaura', 'gokumodebar'].includes(w.type)) { super._create(w); return; }
        const opts = Object.assign({ target: this.target, klass: w.class || 'content', z: w.z || 0, x: w.x, y: w.y, w: w.w, h: w.h }, this._layerFields());
        const ref = w.type === 'gokucharacter' ? this.client.image(Object.assign({ iw: w.w, ih: w.h }, opts)) : this.client.effect(Object.assign({ fs: shaders[w.type === 'gokuaura' ? 'aura' : 'modebar'] }, opts));
        if (!ref) { this.log.warn('widget ' + w.id + ': layer refused'); return; }
        const x = { w, ref, last: null, stance: 'idle', animations: [], lastPaint: 0 };
        this.widgets.set(w.id, x);
        if (w.type !== 'gokucharacter') {
            this.client.uniform(ref, 'u_color', animation.COLORS[this._driveProfile()].map(v => v / 255));
            if (w.type === 'gokumodebar') {
                this.client.uniform(ref, 'u_background', [w.background ? 1 : 0]);
                this.client.uniform(ref, 'u_size', [w.w, w.h]);
                this.client.uniform(ref, 'u_screenGuide', [w.background && this.setting('screenGuide') !== 'off' ? 1 : 0]);
                this.client.uniform(ref, 'u_gridOnly', [w.background && this.setting('screenGuide') === 'grid' ? 1 : 0]);
            }
            x.gpuClock = this.client.animate(ref, { property: 'uniform', name: 'u_phase', keys: [[0, 0], [12000, 12]], loop: true });
        }
        this._update(x, Date.now(), true);
    }
    _characterPixels(w, s) {
        const rel = 'characters/' + s.mode + '_' + s.stance + '_' + w.w + 'x' + w.h + '.json', img = data.json(rel);
        const px = Buffer.from(img.rgba || '', 'base64');
        if (img.w !== w.w || img.h !== w.h || px.length !== w.w * w.h * 4) throw new Error('Missing or invalid Goku pose: ' + rel);
        return px;
    }
    _update(x, now, force) {
        const type = x.w.type;
        if (!['gokucharacter', 'gokuaura', 'gokumodebar'].includes(type)) { super._update(x, now, force); return; }
        const s = this._pose(x.stance); x.stance = s.stance;
        if (type === 'gokucharacter') {
            const enabled = this.setting('animationOn') !== false, look = s.mode + ':' + s.stance + ':' + enabled;
            if (look === x.last) return;
            x.animations.forEach(id => this.client.stop(x.ref, id)); x.animations = [];
            this.client.set(x.ref, { sx: 1, sy: 1 });
            this.client.pixels(x.ref, null, this._characterPixels(x.w, s));
            if (enabled) {
                const k = animation.keys(s.stance);
                x.animations = [this.client.animate(x.ref, { property: 'scale', keys: k.scale, loop: true }), this.client.animate(x.ref, { property: 'translate', keys: k.translate, loop: true })].filter(Boolean);
            } else {
                x.animations = [this.client.animate(x.ref, { property: 'translate', keys: [[0,0,0,0],[1,0,0,0]], loop: false })].filter(Boolean);
            }
            x.last = look;
        } else {
            const charge = Math.round(s.charge * 20) / 20, look = charge + ':' + s.valid;
            if (look !== x.last) {
                this.client.uniform(x.ref, 'u_charge', [charge]);
                if (type === 'gokuaura') this.client.uniform(x.ref, 'u_alive', [s.valid ? 1 : 0]);
                x.last = look;
            }
            if (!x.gpuClock) this.client.uniform(x.ref, 'u_phase', [(now % 12000) / 1000]);
        }
    }
}
class DragonDash extends DragonHud {
    constructor(ctx, primary) {
        super(ctx, { primary, target: 'panel', statusName: 'GOKU HUD', clientName: ctx.spec.id + '_dash', textRateMs: 250 });
        this.primary = primary; this.readings = primary.readings;
    }
    _isCentre() { return this.setting('clusterStyle') !== 'performance'; }
    _layoutName() { return ['dash', 'both'].includes(this._screens()) ? this._driveProfile() : 'off'; }
    _layoutFile(n) {
        const t = this._isCentre() ? 'centre' : 'dash';
        if (n !== 'alert' && t === 'dash' && this.setting('screenGuide') === 'grid') return 'db_probe_' + n;
        return n === 'alert' ? 'db_' + t + '_alert' : 'db_' + t + '_' + n;
    }
    _layerFields() {
        if (this.target === 'map') return { contend: 1, guide_hold: 0 };
        // Native-pixel extent probe: saved percentage fit must not move the ruler.
        return {};
    }
    _popupSlot() { return 0x202; }
    _yieldToPopup(now) { return this.target === 'map' ? false : Base.prototype._yieldToPopup.call(this, now); }
    _rebuildInner() {
        const t = this._isCentre() ? 'map' : 'panel';
        if (t !== this.target) { this.target = t; this.targetState = null; }
        this.size = t === 'map' ? [1088, 480] : [1920, 720];
        this.layouts.size = this.size;
        super._rebuildInner();
    }
    _setupVehicleData() { this.car = this.view.primary.car; this.score = this.view.primary.score; }
    _startDme() {}
    _startReads() {}
    _liveSetting() {}
    _pedal() { return this.primary._pedal(); }
    _boost() { return this.primary._boost(); }
    _range() { return this.primary._range(); }
    _alertNow() { return this.primary.alertShow; }
    _tick() {
        if (this.driveMode !== this.primary.driveMode) { this.driveMode = this.primary.driveMode; if (this._layoutName() !== this.activeName) this._rebuild(); }
        super._tick();
    }
}
module.exports = { DragonHud, DragonDash };
