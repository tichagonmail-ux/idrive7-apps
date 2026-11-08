'use strict';
const Base = require('./eva_hud');
const data = require('./hud_data');
const Hud = require('./hud');
const FORMS = { eco: 'BASE FORM', comfort: 'SUPER SAIYAN', sport: 'SUPER SAIYAN GOD' };
class DragonHud extends Base {
    _migrateMenu() {}
    _layoutName() {
        const screen = this._screens();
        return screen === 'hud' || screen === 'both' ? this._driveProfile() : 'off';
    }
    _layoutFile(name) { return name === 'alert' ? 'db_hud_alert' : 'db_hud_' + name; }
    _layoutLabel() { return 'DRAGON BALL SUPER / ' + FORMS[this._driveProfile()]; }
    _statusLine() { return this._layoutLabel(); }
    _token(tok) {
        if (tok === 'db:form') return FORMS[this._driveProfile()];
        if (tok === 'db:title') return 'DRAGON BALL SUPER';
        if (tok === 'db:boost') return Hud.prototype._token.call(this, 'boost');
        if (tok === 'db:warning') return 'VEHICLE ALERT';
        return super._token(tok);
    }
    _partLook(p, now) {
        if (p.type === 'bmwgauge') return String(this._raw(p.signal));
        return p.type === 'character' ? this._driveProfile() + ':' + p.w + ':' + p.h : super._partLook(p, now);
    }
    _partPixels(p, look) {
        if (p.type === 'bmwgauge') return require('./dragon_gauges').paint(p, Number(look), this.theme);
        if (p.type !== 'character') return super._partPixels(p, look);
        const image = data.json('characters/' + this._driveProfile() + '_' + p.w + 'x' + p.h + '.json');
        const bytes = Buffer.from(image.rgba || '', 'base64');
        if (image.w !== p.w || image.h !== p.h || bytes.length !== p.w * p.h * 4) throw new Error('Goku image dimensions');
        return bytes;
    }
}
class DragonDash extends DragonHud {
    constructor(ctx, primary) {
        super(ctx, { primary, target: 'panel', statusName: 'DRAGON BALL', clientName: ctx.spec.id + '_dash', textRateMs: 250 });
        this.primary = primary;
        this.readings = primary.readings;
    }
    _layoutName() { return ['dash', 'both'].includes(this._screens()) ? this._driveProfile() : 'off'; }
    _layoutFile(name) { return name === 'alert' ? 'db_dash_alert' : 'db_dash_' + name; }
    _layerFields() { return {}; }
    _popupSlot() { return 0x202; }
    _yieldToPopup(now) { return Base.prototype._yieldToPopup.call(this, now); }
    _setupVehicleData() { this.car = this.view.primary.car; this.score = this.view.primary.score; }
    _startDme() {}
    _startReads() {}
    _liveSetting() {}
    _pedal() { return this.primary._pedal(); }
    _boost() { return this.primary._boost(); }
    _range() { return this.primary._range(); }
    _alertNow() { return this.primary._alertShow || this.primary.alertShow; }
    _tick() {
        if (this.driveMode !== this.primary.driveMode) {
            this.driveMode = this.primary.driveMode;
            if (this._layoutName() !== this.activeName) this._rebuild();
        }
        super._tick();
    }
}
module.exports = { DragonHud, DragonDash };
