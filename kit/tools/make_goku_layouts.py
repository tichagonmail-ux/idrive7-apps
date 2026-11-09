#!/usr/bin/env python3
"""Build Goku HUD layouts without touching vehicle code or fonts."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
APP=ROOT/'apps/dragon_super'
PROFILE=json.loads((ROOT/'assets/goku-hud/g20-id7-display-profile.json').read_text())
RECT=PROFILE['layout']
OUT=APP/'hud/layouts'
OUT.mkdir(parents=True,exist_ok=True)
def text(id,x,y,w,h,value,font='db22',color='white'):
 return dict(id=id,type='text',x=x,y=y,w=w,h=h,text=value,font=font,color=color,align='center')
def effect(id,type,x,y,w,h,z=1,**extra):
 return dict(id=id,type=type,x=x,y=y,w=w,h=h,z=z,**extra)
def canvas(id,x,y,w,h,parts,z=3):
 return dict(id=id,type='evacanvas',x=x,y=y,w=w,h=h,z=z,parts=parts)
def write(name,mode,widgets):
 (OUT/(name+'.json')).write_text(json.dumps(dict(schemaVersion=2,name='Goku HUD '+mode,theme='db_'+mode,widgets=widgets),indent=2))
for mode in ['eco','comfort','sport']:
 # Rectangles in the reusable profile are panel-global; canvas parts are local.
 dx,dy,dw,dh=RECT['display']
 def local(name):
  x,y,w,h=RECT[name];return [x-dx,y-dy,w,h]
 parts=[text('brand',*local('brand'),'M340i','db42'),text('form',*local('form'),'{{db:form}}','db22','fg')]
 for name,signal,maximum in [('speedGauge','speed',330),('rpmGauge','rpm',8000)]:
  x,y,w,h=local(name)
  parts.append(dict(id=name.lower(),type='bmwgauge',x=x,y=y,w=w,h=h,signal=signal,max=maximum))
 bx,by,bw,bh=RECT['bottom']
 bottom=[]
 for i,(label,value) in enumerate([('OIL °C','{{oil}}'),('COOLANT °C','{{coolant}}'),('IAT °C','{{db:iat}}'),('BOOST bar','{{db:boost}}')]):
  x=RECT['metricGrid'][0]-bx+i*215
  bottom.extend([text('label'+str(i),x,0,215,23,label,'db18','fg'),text('val'+str(i),x,24,215,30,value,'db26')])
 for name,value,font,color in [('mode','{{db:mode}}','db32','white'),('data','{{db:data}}','db18','amber')]:
  x,y,w,h=RECT[name];bottom.append(text(name,x-bx,y-by,w,h,value,font,color))
 widgets=[effect('frame','gokumodebar',*RECT['frame'],0,background=True,keepInAlert=True),
  effect('aura','gokuaura',*RECT['aura'],1),canvas('display',dx,dy,dw,dh,parts),
  effect('goku','gokucharacter',*RECT['goku'],4),canvas('mode',bx,by,bw,bh,bottom,5)]
 write('db_dash_'+mode,mode,widgets)
 centre=[effect('aura','gokuaura',354,50,380,360,1),effect('goku','gokucharacter',424,58,240,340,4),
  effect('modebar','gokumodebar',150,427,788,50,1),
  canvas('display',244,0,600,480,[text('brand',0,0,600,34,'M340i','db26'),text('form',0,35,600,28,'{{db:form}}','db18','fg'),
   text('mode',110,431,380,34,'{{db:mode}}','db22'),text('data',0,401,600,22,'{{db:data}}','db18','amber')],3)]
 write('db_centre_'+mode,mode,centre)
 hparts=[text('title',0,0,552,28,'GOKU HUD','db22','fg'),text('gearlabel',0,45,170,27,'GEAR','db18','fg'),text('gear',0,77,170,100,'{{gearnum}}','db76'),
  text('rpm',362,55,190,55,'{{rpm}}','db42'),text('rpmunit',362,113,190,26,'RPM','db18','fg'),text('oil',362,158,190,35,'{{oil}} °C','db26'),
  text('clock',362,204,190,30,'{{time}}','db22'),text('mode',155,244,242,30,'{{db:mode}}','db22'),text('data',0,210,180,26,'{{db:data}}','db18','amber')]
 write('db_hud_'+mode,mode,[canvas('display',124,100,552,280,hparts),effect('aura','gokuaura',280,120,240,220,1),
  effect('goku','gokucharacter',325,135,150,200,4),effect('modebar','gokumodebar',124,335,552,42,1),effect('rev','evaseg',124,382,552,10,5,segments=28)])
# Align the existing panel alert to the centre of the display; map alert stays inside its own native slot.
alert=json.loads((OUT/'db_dash_alert.json').read_text())
alert['name']='Goku HUD vehicle alerts'
for w in alert['widgets']: w['x']=660; w['y']=275
alert['title'].update(x=660,y=100)
(OUT/'db_dash_alert.json').write_text(json.dumps(alert,indent=2))
ca=json.loads(json.dumps(alert));ca['title'].update(x=244,y=70,w=600,h=100)
ca['widgets'][0].update(x=244,y=190,w=600,h=180)
(OUT/'db_centre_alert.json').write_text(json.dumps(ca,indent=2))
# The manifest owns the release version; rebaking must not downgrade it.
spec=json.loads((APP/'app.json').read_text());spec.update(title='Goku HUD',description='Animated Goku drive-mode cluster and windshield HUD for BMW iDrive 7',iconGlyph='GOKU')
spec['credits']['title']='Goku HUD';spec['screens'][0]['title']='Goku HUD';spec['config']['statusName']='Goku HUD'
spec['settings']=[s for s in spec['settings'] if s['key'] not in ('clusterStyle','clusterFit','animationOn')]
spec['settings'][1:1]=[dict(key='clusterStyle',label='Cluster design',type='choice',default='performance',reset=1,options=[['performance','Goku Performance (full cluster)'],['oem','BMW gauges + Goku (centre)']]),dict(key='animationOn',label='Character animation',type='bool',default=True)]
for setting in spec['settings']:
 if setting['key']=='alertsOn': setting.update(label='Custom full-screen alerts',default=False,reset=1)
 if setting['key']=='alertPreview': setting.update(default='off',reset=1)
spec['config']['dme']['iat']=[dict(did='F40F',bytes=1,factor=1,offset=-40,min=-40,max=150,note='Standard OBD intake air temperature PID 0F, UDS form'),dict(obd='0F',bytes=1,factor=1,offset=-40,min=-40,max=150,note='Standard OBD service 01 intake air temperature')]
(APP/'app.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
print('PASS three forms on native BMW cluster, Performance cluster and windshield HUD')
