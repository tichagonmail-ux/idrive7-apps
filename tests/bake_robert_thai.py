import json,base64,zlib,pathlib
from PIL import Image,ImageDraw,ImageFont
p=pathlib.Path(__file__).resolve().parents[1]/'apps'/'robert_garage'
translations={
'Live vehicle signals / -- means no current data':'ข้อมูลสดจากรถ / -- หมายถึงยังไม่มีข้อมูล',
'SPEED':'ความเร็ว','OIL TEMP':'น้ำมันเครื่อง','COOLANT':'น้ำหล่อเย็น','km/h':'กม./ชม.',
'Garage':'รถของฉัน','Service':'บำรุงรักษา','Fuel':'เติมน้ำมัน','History':'ประวัติ',
'Illustration / manual garage log':'ภาพประกอบ M340i / สมุดบันทึกรถ',
'ODOMETER':'เลขไมล์','TOTAL LOGGED':'ค่าใช้จ่ายรวม','FUEL':'ค่าน้ำมัน','MAINTENANCE':'ค่าบำรุงรักษา',
'km - entered manually':'กม. / กรอกเอง','THB / litre':'บาท / ลิตร','THB':'บาท',
'Engine oil':'น้ำมันเครื่อง','Spark plugs':'หัวเทียน','Tyres':'ยางรถยนต์','Brakes':'เบรก','Other service':'รายการอื่น',
'OVERDUE ':'เกินระยะ ', ' km left':' กม. เหลือ','No record':'ยังไม่มีข้อมูล',
'SERVICE COST':'ค่าบริการ','YOUR INTERVAL':'ระยะที่กำหนด','km - personal target':'กม. / ตั้งเตือนเอง',
'Intervals are your reminders, not BMW CBS.':'ระยะเตือนส่วนตัว ไม่ใช่ระบบ CBS ของ BMW',
'Item: next service type / Save: record work done':'Item: เปลี่ยนรายการ / Save: บันทึกงานที่ทำแล้ว',
'FILL COST':'ยอดเติมน้ำมัน','FUEL ADDED':'ปริมาณน้ำมัน','PRICE':'ราคาต่อลิตร','litres':'ลิตร',
'Enter the receipt amount and actual litres, then Save.':'กรอกยอดเงินและจำนวนลิตร แล้วกด Save',
'Recorded fills: ':'จำนวนครั้งที่เติม: ','   |   Total: ':'   |   รวม: ',
'SAVED RECORDS  /  page ':'รายการที่บันทึก / หน้า ',
'No records yet. Add service or fuel from the other pages.':'ยังไม่มีรายการ เพิ่มข้อมูลจากหน้าบำรุงรักษาหรือเติมน้ำมัน',
'Item: next history page / Undo: remove latest record':'Item: หน้าประวัติถัดไป / Undo: ลบรายการล่าสุด',
'Edit: ':'แก้ไข: ','km':'กม.','cost':'จำนวนเงิน','interval':'ระยะเตือน',
'   |   +/- step: ':'   |   ปรับครั้งละ: ','   |   Field: choose value':'   |   Field: เลือกช่อง',
'Manual entries only / no vehicle coding or service resets':'บันทึกด้วยตนเอง / ไม่แก้ Coding หรือรีเซ็ตระยะเซอร์วิส',
'Saved data unreadable. Original file preserved.':'อ่านข้อมูลไม่ได้ เก็บไฟล์เดิมไว้แล้ว',
'Confirmation expired':'หมดเวลายืนยัน','Saved on this car':'บันทึกไว้ในรถแล้ว',
'No records to remove':'ยังไม่มีรายการให้ลบ','Last record removed; odometer kept':'ลบรายการล่าสุดแล้ว เลขไมล์ยังคงเดิม',
'Enter fuel cost and litres first':'กรอกยอดเงินและจำนวนลิตรก่อน',
'Press Save again within 5 seconds to confirm':'กด Save ซ้ำภายใน 5 วินาทีเพื่อยืนยัน',
'Press Undo again within 5 seconds to confirm':'กด Undo ซ้ำภายใน 5 วินาทีเพื่อยืนยัน',
'Odometer cannot go backwards':'เลขไมล์ต้องไม่น้อยกว่าค่าที่บันทึกไว้',
}
from fontTools.merge import Merger
import tempfile
font=str(pathlib.Path(tempfile.gettempdir())/'RobertGarage-NotoThai.ttf')
merged=Merger().merge(['/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf','/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf'])
merged.save(font)
# Render complete shaped phrases, preserving Thai vowels and tone marks.
atlas={}
for key,value in translations.items():
 f=ImageFont.truetype(font,40)
 box=f.getbbox(value,anchor='ls'); w=max(1,box[2]-min(0,box[0])); h=max(1,box[3]-box[1])
 im=Image.new('L',(w,h));ImageDraw.Draw(im).text((-min(0,box[0]),-box[1]),value,font=f,fill=255,anchor='ls')
 atlas[key]={'w':w,'h':h,'oy':box[1],'advance':f.getlength(value),'alpha':base64.b64encode(zlib.compress(im.tobytes())).decode()}
js="""'use strict';
// Pre-shaped Thai phrases, Noto Sans Thai (SIL Open Font License).
const zlib = require('zlib');
const { setImage } = require('./kit/record');
const DATA = __DATA__;
const keys = Object.keys(DATA).sort((a,b) => b.length-a.length);
const cache = new Map(); let next = 900000;
function draw(cv, value, x, y, size, colour, background) {
 let rest=String(value), pen=x;
 while(rest.length) {
  let at=rest.length, found=null;
  keys.forEach(k=>{const i=rest.indexOf(k); if(i>=0 && i<at){at=i;found=k;}});
  if(at>0) {const part=rest.slice(0,at); cv.text(part,pen,y,size,colour,{font:'bold'}); pen+=cv.textWidth(part,size,{font:'bold'}); rest=rest.slice(at);}
  if(!found) break;
  const a=DATA[found], scale=size/40, bg=background||'#090f18', ck=found+colour+bg;
  let id=cache.get(ck);
  if(!id) {
   const alpha=zlib.inflateSync(Buffer.from(a.alpha,'base64')), rgba=Buffer.alloc(a.w*a.h*4);
   const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)), fg=rgb(colour), back=rgb(bg);
   for(let i=0;i<alpha.length;i++){for(let c=0;c<3;c++)rgba[i*4+c]=Math.round((fg[c]*alpha[i]+back[c]*(255-alpha[i]))/255);rgba[i*4+3]=255;}
   id=next++;setImage(id,a.w,a.h,rgba);cache.set(ck,id);
  }
  cv.image(id,pen,y+a.oy*scale,a.w*scale,a.h*scale);pen+=a.advance*scale;rest=rest.slice(found.length);
 }
}
module.exports={draw};
""".replace('__DATA__',json.dumps(atlas,ensure_ascii=False,separators=(',',':')))
(p/'thai.js').write_text(js)
