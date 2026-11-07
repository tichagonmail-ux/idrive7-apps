'use strict';
const mgu = require('./kit/mgu');
const { Garage, ITEMS } = require('./model');
const W = 1600, H = 520, PAGES = ['Garage', 'Service', 'Fuel', 'History'];
const STEPS = [1, 10, 100, 1000, 0.1];
const money = (n) => n.toFixed(2);
mgu.run({
    async start(ctx) {
        const ui = ctx.ui, book = new Garage(ctx.dataDir);
        let page = 0, item = 0, field = 0, step = 2, confirm = null, note = '', historyPage = 0;
        const draft = { km: book.state.odometer, cost: 0, litres: 0, interval: ITEMS[0].interval };
        const fields = () => page === 1 ? ['km', 'cost', 'interval'] : page === 2 ? ['km', 'cost', 'litres'] : ['km'];
        function changed() { confirm = null; note = ''; }
        function action(name, fn) { ui.onClick(name, () => { try { fn(); } catch (e) { note = e.message; } return render(); }); }
        action('BTN_PAGE', () => { page = (page + 1) % 4; field = 0; historyPage = 0; changed(); });
        action('BTN_ITEM', () => { if (page === 1) { item = (item + 1) % ITEMS.length; draft.interval = ITEMS[item].interval; } else if (page === 3) historyPage = (historyPage + 1) % Math.max(1, Math.ceil(book.state.entries.length / 5)); changed(); });
        action('BTN_FIELD', () => { field = (field + 1) % fields().length; changed(); });
        action('BTN_STEP', () => { step = (step + 1) % STEPS.length; changed(); });
        function nudge(sign) {
            if (page === 3) return;
            const key = fields()[field], delta = (key === 'km' || key === 'interval') ? Math.max(1, STEPS[step]) : STEPS[step];
            const max = key === 'km' ? 2000000 : key === 'interval' ? 200000 : key === 'litres' ? 200 : 1000000;
            draft[key] = Math.max(0, Math.min(max, Math.round((draft[key] + sign * delta) * 100) / 100)); changed();
        }
        action('BTN_MINUS', () => nudge(-1)); action('BTN_PLUS', () => nudge(1));
        function confirmed(kind) {
            if (confirm && confirm.kind === kind && Date.now() - confirm.time < 5000) { confirm = null; return true; }
            confirm = { kind, time: Date.now() }; note = 'Press ' + kind + ' again within 5 seconds to confirm'; return false;
        }
        action('BTN_SAVE', () => {
            if (page === 3 || !confirmed('Save')) return;
            if (page === 0) book.setOdometer(draft.km);
            else {
                if (page === 2 && (draft.cost <= 0 || draft.litres <= 0)) throw Error('Enter fuel cost and litres first');
                book.add(page === 1 ? { kind: 'service', item: ITEMS[item].key, km: draft.km, cost: draft.cost, interval: draft.interval }
                    : { kind: 'fuel', km: draft.km, cost: draft.cost, litres: draft.litres });
                draft.cost = 0; draft.litres = 0;
            }
            note = 'Saved on this car';
        });
        action('BTN_UNDO', () => {
            if (!book.state.entries.length) { note = 'No records to remove'; return; }
            if (confirmed('Undo')) { book.undo(); note = 'Last record removed; odometer kept'; }
        });
        function text(cv, value, x, y, size, col) { cv.text(String(value), x, y, size, col, { font: 'bold' }); }
        function card(cv, x, y, w, h, title, value, unit, accent) {
            cv.roundRect(x, y, w, h, 16, '#17212d'); cv.fillRect(x + 18, y + 18, 5, h - 36, accent || '#37a9ff');
            text(cv, title, x + 40, y + 42, 22, '#9eafc2'); text(cv, value, x + 40, y + 100, 39, '#f5f8ff');
            if (unit) text(cv, unit, x + 40, y + 137, 20, '#9eafc2');
        }
        function car(cv) {
            cv.polyline([[120,280],[150,250],[265,230],[320,178],[490,178],[570,232],[655,250],[685,280],[680,315],[125,315],[120,280]], 5, '#63b8ff');
            cv.polyline([[285,230],[330,192],[480,192],[540,230],[285,230]], 3, '#8faecb');
            [235,570].forEach((x) => { cv.circle(x, 310, 39, '#080d16'); cv.circle(x, 310, 26, '#72879c'); cv.circle(x, 310, 11, '#152131'); });
            cv.line(420,195,420,284,2,'#466887'); cv.line(150,266,185,266,5,'#e5f6ff');
        }
        async function render() {
            if (confirm && Date.now() - confirm.time >= 5000) { confirm = null; note = 'Confirmation expired'; }
            const cv = ctx.canvas(W, H).clear('#090f18'), totals = book.summary();
            cv.fillRect(0,0,520,7,'#39a9ed'); cv.fillRect(520,0,520,7,'#2541a1'); cv.fillRect(1040,0,560,7,'#e83951');
            text(cv, 'ROBERT GARAGE', 40, 58, 34, '#f5f8ff'); text(cv, 'M340i  /  ' + PAGES[page] + '  /  v0.1.0', 860, 56, 24, '#67baff');
            if (page === 0) {
                car(cv); text(cv, 'M340i G20 xDrive  |  B58', 140, 390, 29, '#f5f8ff');
                text(cv, 'Illustration / manual garage log', 140, 428, 20, '#8a9eb5');
                card(cv,780,95,370,155,'ODOMETER',book.state.odometer.toLocaleString('en-US'),'km - entered manually');
                card(cv,1170,95,380,155,'TOTAL LOGGED',money(totals.total),'THB');
                card(cv,780,270,370,155,'FUEL',money(totals.fuel),'THB');
                card(cv,1170,270,380,155,'MAINTENANCE',money(totals.service),'THB');
            } else if (page === 1) {
                const chosen = ITEMS[item]; text(cv, chosen.title,40,110,30,'#f5f8ff');
                ITEMS.forEach((it, i) => {
                    const due = book.due(it), yy = 160 + i * 51;
                    text(cv, (i === item ? '> ' : '  ') + it.title, 40, yy, 23, i === item ? '#67baff' : '#b5c2d1');
                    text(cv, due ? (due.left < 0 ? 'OVERDUE ' + Math.abs(due.left) : due.left + ' km left') : 'No record', 360, yy, 22, due && due.left <= 1000 ? '#ffb55a' : '#9eafc2');
                });
                card(cv,820,110,340,155,'SERVICE COST',money(draft.cost),'THB');
                card(cv,1180,110,370,155,'YOUR INTERVAL',draft.interval,'km - personal target');
                text(cv,'Intervals are your reminders, not BMW CBS.',820,320,22,'#9eafc2');
                text(cv,'Item: next service type / Save: record work done',820,365,20,'#9eafc2');
            } else if (page === 2) {
                card(cv,40,115,480,170,'FILL COST',money(draft.cost),'THB');
                card(cv,550,115,480,170,'FUEL ADDED',draft.litres.toFixed(2),'litres');
                card(cv,1060,115,490,170,'PRICE',draft.litres > 0 ? money(draft.cost / draft.litres) : '--','THB / litre');
                text(cv,'Enter the receipt amount and actual litres, then Save.',45,348,27,'#b5c2d1');
                text(cv,'Recorded fills: ' + book.state.entries.filter((e) => e.kind === 'fuel').length + '   |   Total: ' + totals.litres.toFixed(2) + ' litres',45,398,24,'#67baff');
            } else {
                const rows = book.state.entries.slice().reverse().slice(historyPage * 5, historyPage * 5 + 5);
                text(cv,'SAVED RECORDS  /  page ' + (historyPage + 1),40,110,25,'#67baff');
                if (!rows.length) text(cv,'No records yet. Add service or fuel from the other pages.',40,220,29,'#b5c2d1');
                rows.forEach((e,i) => {
                    const label = e.kind === 'fuel' ? 'Fuel ' + e.litres.toFixed(2) + ' L' : ITEMS.find((it) => it.key === e.item).title;
                    const y = 165 + i * 48;
                    text(cv,e.date.slice(0,10),40,y,22,'#9eafc2'); text(cv,label,300,y,23,'#f5f8ff');
                    text(cv,e.km + ' km',820,y,23,'#b5c2d1'); text(cv,money(e.cost) + ' THB',1170,y,23,'#67baff');
                });
            }
            cv.fillRect(30,448,1540,1,'#2d4056');
            const k = fields()[field];
            text(cv, page === 3 ? 'Item: next history page / Undo: remove latest record' : 'Edit: ' + k + ' = ' + draft[k] + '   |   +/- step: ' + STEPS[step] + '   |   Field: choose value',40,482,21,'#67baff');
            text(cv, book.readError ? 'Saved data unreadable. Original file preserved.' : note || 'Manual entries only / no vehicle coding or service resets',40,514,19,note || book.readError ? '#ffb55a' : '#8a9eb5');
            return ui.image('MAIN_GFX',cv);
        }
        ctx.loop('MAIN', 2, render); await render();
    },
});
