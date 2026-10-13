"""Generate MARIA's original Windows brand icon — antialiased superellipse companion.
No copyrighted assets or fonts are embedded.
"""
from PIL import Image, ImageDraw, ImageFilter
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "build-resources"
OUT.mkdir(exist_ok=True)
S=1024

def superellipse(cx,cy,rx,ry,n=2.7,pts=160):
    result=[]
    for i in range(pts):
        t=i*math.tau/pts
        c,s=math.cos(t),math.sin(t)
        result.append((cx+rx*math.copysign(abs(c)**(2/n),c),
                       cy+ry*math.copysign(abs(s)**(2/n),s)))
    return result

bg=Image.new("RGBA",(S,S),(0,0,0,0))
canvas=Image.new("RGBA",(S,S),(0,0,0,0))
d=ImageDraw.Draw(canvas)
d.polygon(superellipse(512,512,470,467,3.25),fill=(11,14,30,255))
d.line(superellipse(512,512,460,457,3.25)+[superellipse(512,512,460,457,3.25)[0]],
       fill=(129,115,213,180),width=8,joint="curve")
# luminous halo behind the character
halo=Image.new("RGBA",(S,S),(0,0,0,0))
hd=ImageDraw.Draw(halo)
hd.ellipse((172,184,856,876),fill=(112,95,220,124))
halo=halo.filter(ImageFilter.GaussianBlur(74))
bg.alpha_composite(halo)
bg.alpha_composite(canvas)
# a soft lifted cast shadow
shadow=Image.new("RGBA",(S,S),(0,0,0,0))
sd=ImageDraw.Draw(shadow)
sd.ellipse((206,768,816,838),fill=(0,0,0,200))
bg.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(27)))
# mochi face uses the exact 2.7 superellipse
mask=Image.new("L",(S,S),0)
md=ImageDraw.Draw(mask)
md.polygon(superellipse(512,510,309,259,2.7),fill=255)
face=Image.new("RGBA",(S,S),(0,0,0,0))
fpx=face.load()
for y in range(245,776):
    for x in range(195,830):
        if mask.getpixel((x,y))==0:continue
        v=max(0,min(1,(y-235)/550))
        r=int(253-31*v);g=int(252-29*v);b=int(255-23*v)
        # slight brighter top-left specular illumination
        w=max(0,1-((x-355)/420)**2-((y-330)/390)**2)
        r=min(255,int(r+8*w));g=min(255,int(g+8*w));b=min(255,int(b+2*w))
        fpx[x,y]=(r,g,b,255)
bg.alpha_composite(face)
# highlight and cheek glow stay inside the silhouette
h=Image.new("RGBA",(S,S),(0,0,0,0))
dr=ImageDraw.Draw(h)
dr.ellipse((360,286,705,345),fill=(255,255,255,75))
dr.ellipse((275,588,390,651),fill=(253,132,178,65))
dr.ellipse((637,588,752,651),fill=(253,132,178,65))
h=h.filter(ImageFilter.GaussianBlur(20))
h.putalpha(Image.composite(h.getchannel("A"),Image.new("L",(S,S),0),mask))
bg.alpha_composite(h)
draw=ImageDraw.Draw(bg)
for cx in (405,618):
    draw.ellipse((cx-26,493,cx+26,566),fill=(18,19,29,255))
    draw.ellipse((cx-12,499,cx-2,512),fill=(92,99,123,125))
# accent dot: not a success mark, simply the logo's identity point
draw.ellipse((742,315,786,359),fill=(127,185,255,255))
draw.ellipse((752,323,763,334),fill=(234,249,255,210))
# crop/resample preserving alpha and palette
out_png=OUT / "maria-icon-1024.png"
bg.save(out_png)
out_ico=OUT / "maria-icon.ico"
bg.save(out_ico,format="ICO",sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(96,96),(128,128),(256,256)])
print("ICON_PNG=",out_png)
print("ICON_ICO=",out_ico)
print("ICON_ICO_BYTES=",out_ico.stat().st_size)
