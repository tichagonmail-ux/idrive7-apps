'use strict';
const fs = require('fs');
const path = require('path');
const ITEMS = [
    { key: 'oil', title: 'Engine oil', interval: 10000 },
    { key: 'plugs', title: 'Spark plugs', interval: 30000 },
    { key: 'tyres', title: 'Tyres', interval: 30000 },
    { key: 'brakes', title: 'Brakes', interval: 30000 },
    { key: 'other', title: 'Other service', interval: 10000 },
];
const finite = (n) => typeof n === 'number' && isFinite(n);
function blank() { return { schema: 1, odometer: 76952, entries: [] }; }
function validate(s) {
    if (!s || s.schema !== 1 || !finite(s.odometer) || s.odometer < 0 || s.odometer > 2000000 || !Array.isArray(s.entries) || s.entries.length > 500) throw Error('Invalid garage data');
    s.entries.forEach((e) => {
        if (!e || ['fuel', 'service'].indexOf(e.kind) < 0 || !finite(e.km) || e.km < 0 || e.km > s.odometer || !finite(e.cost) || e.cost < 0 || e.cost > 1000000 || typeof e.date !== 'string') throw Error('Invalid record');
        if (e.kind === 'fuel' && (!finite(e.litres) || e.litres <= 0 || e.litres > 200)) throw Error('Invalid litres');
        if (e.kind === 'service' && (!ITEMS.some((i) => i.key === e.item) || !finite(e.interval) || e.interval < 0 || e.interval > 200000)) throw Error('Invalid service');
    });
    return s;
}
class Garage {
    constructor(dir) {
        this.file = path.join(dir, 'robert-garage.json');
        this.state = blank(); this.readError = false;
        try { this.state = validate(JSON.parse(fs.readFileSync(this.file, 'utf8'))); }
        catch (e) { if (e.code !== 'ENOENT') this.readError = true; }
    }
    write(next) {
        if (this.readError) throw Error('Saved data unreadable - not overwritten');
        validate(next);
        const tmp = this.file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(next), 'utf8');
        fs.renameSync(tmp, this.file); this.state = next;
    }
    add(record) {
        if (this.state.entries.length >= 500) throw Error('500 records reached - export before adding');
        if (record.km < this.state.odometer) throw Error('Odometer cannot go backwards');
        const e = Object.assign({}, record, { date: new Date().toISOString() });
        this.write({ schema: 1, odometer: e.km, entries: this.state.entries.concat([e]) });
    }
    setOdometer(km) {
        if (km < this.state.odometer) throw Error('Odometer cannot go backwards');
        this.write({ schema: 1, odometer: km, entries: this.state.entries.slice() });
    }
    undo() { this.write({ schema: 1, odometer: this.state.odometer, entries: this.state.entries.slice(0, -1) }); }
    summary() {
        let fuel = 0, service = 0, litres = 0;
        this.state.entries.forEach((e) => { if (e.kind === 'fuel') { fuel += e.cost; litres += e.litres; } else service += e.cost; });
        return { fuel, service, litres, total: fuel + service };
    }
    due(item) {
        const e = this.state.entries.slice().reverse().find((r) => r.kind === 'service' && r.item === item.key);
        return e ? { entry: e, left: e.km + e.interval - this.state.odometer } : null;
    }
}
module.exports = { Garage, ITEMS, validate };
