'use strict';
const mgu = require('./kit/mgu');
const thai = require('./thai');
const G = require('./kit/gauges');
const SIG = require('./vehicle-signals');
const { Garage, ITEMS } = require('./model');
const W = 1600, H = 520, PAGES = ['Garage', 'Service', 'Fuel', 'History', 'Live'];
const STEPS = [1, 10, 100, 1000, 0.1];
const money = (n) => n.toFixed(2);
mgu.run({
    async start(ctx) {
        const ui = ctx.ui, book = new Garage(ctx.dataDir);
        const live = {}, subs = []; let generation=0, active=false;
        const CDS='de.bmw.infotainment.vehicle.CDS', V2='de.bmw.infotainment.vehicle.Vehicle2';
        const selected={ [CDS]:['statusEngineSpeed2','statusEngineTemperature'], [V2]:['statusCarSpeed2'] };
        function watching(on) {
            if(active===on) return; active=on; const gen=++generation;
            subs.splice(0).forEach(s=>{if(s.shutdown)s.shutdown();});
            if(!on || !ctx.signals || !ctx.signals.watch) return;
            Object.keys(selected).forEach(i=>{
                const h={}; selected[i].forEach(f=>{h[f]=v=>{if(active && gen===generation)live[i+' '+f]={v,time:Date.now()};};});
                ctx.signals.watch(i,'1',h,ctx.log).then(s=>{if(active && gen===generation)subs.push(s);else if(s.shutdown)s.shutdown();}).catch(e=>ctx.log.warn('garage signals: '+e));
            });
        }
        if(ui.onVisible)ui.onVisible((name,on)=>{if(name==='MAIN')watching(on);});
        watching(true);
        function reading(id) {
            const it=SIG.ITEMS[id], src=SIG.sourcesOf(it)[0], hit=live[src.i+' '+src.f];
            if(!hit || Date.now()-hit.time>5000)return null;
            const v=SIG.value(it,src,hit.v);return v && typeof v.n==='number' ? v.n : null;
        }
        const actions = {};
        const inline = [['BTN_ITEM','Item'],['BTN_FIELD','Field'],['BTN_MINUS','-'],['BTN_PLUS','+'],['BTN_STEP','Step'],['BTN_SAVE','Save'],['BTN_UNDO','Undo']];
        if(ctx.hideButton)inline.forEach(b=>ctx.hideButton(b[0]));
        let page = 4, item = 0, field = 0, step = 2, confirm = null, note = '', historyPage = 0;
        const draft = { km: book.state.odometer, cost: 0, litres: 0, interval: ITEMS[0].interval };
        const fields = () => page === 1 ? ['km', 'cost', 'interval'] : page === 2 ? ['km', 'cost', 'litres'] : ['km'];
        if(ctx.onTab)ctx.onTab(i=>{page=[4,0,1,2,3][i]===undefined?4:[4,0,1,2,3][i];field=0;confirm=null;note='';render();});
        function changed() { confirm = null; note = ''; }
        function action(name, fn) { const run=()=>{try{fn();}catch(e){note=e.message;}return render();}; actions[name]=run;ui.onClick(name,run); }
        action('BTN_PAGE', () => { page = (page + 1) % 5; field = 0; historyPage = 0; changed(); });
        action('BTN_ITEM', () => { if (page === 1) { item = (item + 1) % ITEMS.length; draft.interval = ITEMS[item].interval; } else if (page === 3) historyPage = (historyPage + 1) % Math.max(1, Math.ceil(book.state.entries.length / 5)); changed(); });
        action('BTN_FIELD', () => { field = (field + 1) % fields().length; changed(); });
        action('BTN_STEP', () => { step = (step + 1) % STEPS.length; changed(); });
        function nudge(sign) {
            if (page >= 3) return;
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
            if (page >= 3 || !confirmed('Save')) return;
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
            if(page===4) return;
            if (!book.state.entries.length) { note = 'No records to remove'; return; }
            if (confirmed('Undo')) { book.undo(); note = 'Last record removed; odometer kept'; }
        });
        function text(cv, value, x, y, size, col, bg) { thai.draw(cv, value, x, y, size, col, bg); }
        function card(cv, x, y, w, h, title, value, unit, accent) {
            cv.roundRect(x, y, w, h, 16, '#17212d'); cv.fillRect(x + 18, y + 18, 5, h - 36, accent || '#37a9ff');
            text(cv, title, x + 40, y + 42, 22, '#9eafc2', '#17212d'); text(cv, value, x + 40, y + 100, 39, '#f5f8ff');
            if (unit) text(cv, unit, x + 40, y + 137, 20, '#9eafc2', '#17212d');
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
            const theme=ctx.theme();
            G.frame(cv,theme,['Live','Garage','Service','Fuel','History'],[1,2,3,4,0][page],[]);
            if(page!==4) text(cv, 'M340i / '+PAGES[page], 40, 76, 25, '#67baff');
            if (page === 4) {
                const rpm=reading('rpm'),speed=reading('speed'),oil=reading('oil'),coolant=reading('coolant');
                G.segBar(cv,theme,40,70,1520,175,{label:'ENGINE SPEED',unit:'rpm',value:rpm,min:0,max:8000,step:250,ramp:'hot',limit:6500,scale:{every:1000,div:1000,decimals:0}});
                G.needle(cv,theme,270,345,100,{value:rpm,min:0,max:8000,ticks:8,div:1000,redFrom:6500,unit:'rpm',label:'M340i'});
                card(cv,470,282,330,155,'SPEED',speed===null?'--':Math.round(speed),'km/h');
                card(cv,820,282,340,155,'OIL TEMP',oil===null?'--':Math.round(oil),'°C');
                card(cv,1180,282,370,155,'COOLANT',coolant===null?'--':Math.round(coolant),'°C');
                text(cv,'Live vehicle signals / -- means no current data',40,482,21,'#67baff');
                text(cv,'M340i G20 xDrive / B58 / ROBERT GARAGE',40,514,19,'#8a9eb5');
                return ui.image('MAIN_GFX',cv);
            } else if (page === 0) {
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
            inline.forEach((b,i)=>{const x=40+i*143;cv.roundRect(x,458,130,35,9,'#17212d');cv.text(b[1],x+65,483,21,'#c4d6eb',{font:'bold',align:'center'});if(cv.target)cv.target(x,452,130,47,actions[b[0]],b[0]);});
            text(cv,page===3?'History':'Edit: '+k+' = '+draft[k],1060,480,20,'#67baff');
            text(cv, book.readError ? 'Saved data unreadable. Original file preserved.' : note || 'Manual entries only / no vehicle coding or service resets',40,514,19,note || book.readError ? '#ffb55a' : '#8a9eb5');
            return ui.image('MAIN_GFX',cv);
        }
        ctx.loop('MAIN', 12, render); await render();
    },
});
