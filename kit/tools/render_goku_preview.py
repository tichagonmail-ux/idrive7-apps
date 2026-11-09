#!/usr/bin/env python3
"""Render tested app layers with surfaceless EGL/GLES2, without a browser or car."""
import base64, ctypes as C, json, os
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
E=C.CDLL('libEGL.so.1')
E.eglGetProcAddress.restype=C.c_void_p
E.eglGetProcAddress.argtypes=[C.c_char_p]
def proc(name,result,args):
 p=E.eglGetProcAddress(name.encode())
 if not p: raise RuntimeError('Missing GL entry '+name)
 return C.CFUNCTYPE(result,*args)(p)
getdisplay=proc('eglGetPlatformDisplayEXT',C.c_void_p,[C.c_uint,C.c_void_p,C.POINTER(C.c_int)])
display=getdisplay(0x31DD,None,None)
def egl(name,result,args):
 f=getattr(E,name);f.restype=result;f.argtypes=args;return f
initialize=egl('eglInitialize',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_int)])
a=C.c_int();b=C.c_int()
assert initialize(display,C.byref(a),C.byref(b)), 'Surfaceless EGL unavailable'
choose=egl('eglChooseConfig',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int)])
attrs=(C.c_int*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038,0,0)
config=C.c_void_p();count=C.c_int();assert choose(display,attrs,C.byref(config),1,C.byref(count)) and count.value
bind=egl('eglBindAPI',C.c_uint,[C.c_uint]);assert bind(0x30A0)
context=egl('eglCreateContext',C.c_void_p,[C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])(display,config,None,(C.c_int*3)(0x3098,2,0x3038))
assert context
create=egl('eglCreatePbufferSurface',C.c_void_p,[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])
surface=create(display,config,(C.c_int*5)(0x3057,1920,0x3056,720,0x3038));assert surface
current=egl('eglMakeCurrent',C.c_uint,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p]);assert current(display,surface,surface,context)
create_shader=proc('glCreateShader',C.c_uint,[C.c_uint]);shader_source=proc('glShaderSource',None,[C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.POINTER(C.c_int)])
compile_shader=proc('glCompileShader',None,[C.c_uint]);shader_iv=proc('glGetShaderiv',None,[C.c_uint,C.c_uint,C.POINTER(C.c_int)])
shader_log=proc('glGetShaderInfoLog',None,[C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_void_p])
def shader(kind,source):
 s=create_shader(kind);data=C.c_char_p(source.encode());shader_source(s,1,C.byref(data),None);compile_shader(s)
 ok=C.c_int();shader_iv(s,0x8B81,C.byref(ok))
 if not ok.value:
  out=C.create_string_buffer(8192);shader_log(s,8192,None,out);raise RuntimeError(out.value.decode())
 return s
VS='attribute vec2 a_position; varying vec2 v_uv; void main(){gl_Position=vec4(a_position,0.,1.);v_uv=vec2((a_position.x+1.)*.5,(1.-a_position.y)*.5);}'
create_program=proc('glCreateProgram',C.c_uint,[]);attach=proc('glAttachShader',None,[C.c_uint,C.c_uint]);link=proc('glLinkProgram',None,[C.c_uint]);use=proc('glUseProgram',None,[C.c_uint]);program_iv=proc('glGetProgramiv',None,[C.c_uint,C.c_uint,C.POINTER(C.c_int)])
attribute=proc('glGetAttribLocation',C.c_int,[C.c_uint,C.c_char_p]);enable=proc('glEnableVertexAttribArray',None,[C.c_uint]);pointer=proc('glVertexAttribPointer',None,[C.c_uint,C.c_int,C.c_uint,C.c_uint,C.c_int,C.c_void_p])
uniform_location=proc('glGetUniformLocation',C.c_int,[C.c_uint,C.c_char_p]);viewport=proc('glViewport',None,[C.c_int]*4)
clearcolor=proc('glClearColor',None,[C.c_float]*4);clear=proc('glClear',None,[C.c_uint]);draw=proc('glDrawArrays',None,[C.c_uint,C.c_int,C.c_int]);read=proc('glReadPixels',None,[C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p]);delete=proc('glDeleteProgram',None,[C.c_uint]);delete_shader=proc('glDeleteShader',None,[C.c_uint]);error=proc('glGetError',C.c_uint,[])
points=(C.c_float*12)(-1,-1,1,-1,-1,1,-1,1,1,-1,1,1)
programs={}
def effect(layer,phase=0.32):
 source=layer['fs']
 if source not in programs:
  p=create_program();vs=shader(0x8B31,VS);fs=shader(0x8B30,source);attach(p,vs);attach(p,fs);link(p);ok=C.c_int();program_iv(p,0x8B82,C.byref(ok));assert ok.value,'GLSL link failed';programs[source]=p;delete_shader(vs);delete_shader(fs)
 p=programs[source];use(p);i=attribute(p,b'a_position');enable(i);pointer(i,2,0x1406,0,0,C.cast(points,C.c_void_p))
 for name,values in {**layer.get('uniforms',{}),'u_phase':[phase]}.items():
  loc=uniform_location(p,name.encode())
  if loc<0: continue
  f=proc('glUniform'+str(len(values))+'fv',None,[C.c_int,C.c_int,C.POINTER(C.c_float)])
  f(loc,1,(C.c_float*len(values))(*values))
 w,h=layer['w'],layer['h'];viewport(0,0,w,h);clearcolor(0,0,0,0);clear(0x4000);draw(4,0,6)
 buf=(C.c_ubyte*(w*h*4))();read(0,0,w,h,0x1908,0x1401,buf);assert error()==0,'OpenGL error'
 return Image.frombytes('RGBA',(w,h),bytes(buf)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
rows=json.loads((ROOT/'dist/goku-test-snapshots.json').read_text())
outputs=[]
for mode in ['eco','comfort','sport']:
 row=next(r for r in rows if r['style']=='performance' and r['mode']==mode and r['pedal']==85)
 image=Image.new('RGBA',(1920,660),'black')
 for layer in sorted(row['layers'],key=lambda l:l['z']):
  if not layer.get('visible',1): continue
  if layer['kind']=='effect': part=effect(layer)
  else: part=Image.frombytes('RGBA',(layer['iw'],layer['ih']),base64.b64decode(layer['rgba']))
  if part.size!=(layer['w'],layer['h']): part=part.resize((layer['w'],layer['h']),Image.Resampling.BILINEAR)
  image.alpha_composite(part,(layer['x'],layer['y']))
 target=ROOT/('dist/goku-'+mode+'.png');image.convert('RGB').save(target);outputs.append(image)
contact=Image.new('RGB',(1280,1320),'black')
for i,image in enumerate(outputs): contact.paste(image.convert('RGB').resize((1280,440),Image.Resampling.LANCZOS),(0,i*440))
contact.save(ROOT/'apps/dragon_super/preview.png')
print('PASS GLSL ES shaders compiled, linked and rendered in EGL '+str(a.value)+'.'+str(b.value)+'; three native Performance previews saved')
