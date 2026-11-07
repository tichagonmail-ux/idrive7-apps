'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Garage, ITEMS } = require('../apps/robert_garage/model');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-test-'));
try {
    let g = new Garage(dir);
    assert.strictEqual(g.state.entries.length, 0);
    assert.strictEqual(g.due(ITEMS[0]), null);
    g.add({ kind: 'service', item: 'oil', km: 77000, cost: 5800, interval: 10000 });
    g.add({ kind: 'fuel', km: 77300, cost: 1420, litres: 40 });
    assert.deepStrictEqual(g.summary(), { fuel: 1420, service: 5800, litres: 40, total: 7220 });
    assert.strictEqual(g.due(ITEMS[0]).left, 9700);
    g = new Garage(dir);
    assert.strictEqual(g.state.entries.length, 2);
    assert.throws(() => g.add({ kind: 'fuel', km: 77200, cost: 100, litres: 3 }), /backwards/);
    assert.throws(() => g.add({ kind: 'fuel', km: 77300, cost: 100, litres: 0 }), /litres/);
    assert.throws(() => g.add({ kind: 'service', item: 'invalid', km: 77300, cost: 100, interval: 10 }), /service/);
    assert.strictEqual(new Garage(dir).state.entries.length, 2);
    g.undo(); assert.strictEqual(g.state.odometer, 77300);
    assert.strictEqual(g.summary().total, 5800);
    g.setOdometer(88000); assert.strictEqual(g.due(ITEMS[0]).left, -1000);
    assert.throws(() => g.setOdometer(NaN), /Invalid/);
    const broken = '{broken'; fs.writeFileSync(g.file, broken);
    g = new Garage(dir); assert.strictEqual(g.readError, true);
    assert.throws(() => g.setOdometer(90000), /unreadable/);
    assert.strictEqual(fs.readFileSync(g.file, 'utf8'), broken);
    console.log('Garage journal: persistence, costs, reminders, validation, undo and corrupt-data protection passed');
} finally {
    fs.readdirSync(dir).forEach((f) => fs.unlinkSync(path.join(dir, f))); fs.rmdirSync(dir);
}
